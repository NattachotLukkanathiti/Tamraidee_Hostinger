import { Router } from 'express';
import { pool } from '../database/db';
import { rateLimit } from '../middleware/rateLimit';

// หน้าร้านออนไลน์สำหรับลูกค้า: ดูสินค้า / สั่งซื้อ เรียกได้โดยไม่ต้อง login (ลงทะเบียนไว้ใน PUBLIC_API_ROUTES)
// ส่วนตะกร้า (/api/shop/cart) ต้อง login และเห็นได้เฉพาะตะกร้าของบัญชีตัวเอง
const router = Router();

const MAX_LINES = 50;
const MAX_QTY_PER_LINE = 99;
const orderLimit = rateLimit(15 * 60 * 1000, 5);

const MAX_SKU_LENGTH = 64;

const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);

// ตรวจรายการในตะกร้า: รวม SKU ซ้ำ จำนวนต้องเป็นจำนวนเต็ม 1-99 ไม่เกิน 50 รายการ (null = ข้อมูลไม่ถูกต้อง)
function parseCartItems(value: unknown): { sku: string; quantity: number }[] | null {
  if (!Array.isArray(value)) return null;
  const quantities = new Map<string, number>();
  for (const item of value) {
    const sku = typeof item?.sku === 'string' ? item.sku.trim() : '';
    const qty = Number(item?.quantity);
    if (!sku || sku.length > MAX_SKU_LENGTH || !Number.isInteger(qty) || qty <= 0) return null;
    quantities.set(sku, Math.min((quantities.get(sku) || 0) + qty, MAX_QTY_PER_LINE));
  }
  if (quantities.size > MAX_LINES) return null;
  return [...quantities].map(([sku, quantity]) => ({ sku, quantity }));
}


// ส่งเฉพาะข้อมูลที่ลูกค้าเห็นได้ ไม่มี supplier / invoice / จุดแจ้งเตือนสต็อก
router.get('/api/shop/products', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sku, product_name, category, brand, price, quantity, picture
       FROM inventory ORDER BY product_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// สร้างออเดอร์สถานะ Pending แล้วแจ้งพนักงานผ่าน notification
// ยังไม่ตัดสต็อก (กันคนนอกกดสั่งเล่นจนสต็อกหมด) แต่ตรวจว่าของพอ ณ ตอนสั่ง และคิดราคาจาก DB เสมอ
router.post('/api/shop/orders', orderLimit, async (req, res) => {
  const customer = {
    name: text(req.body?.customer_name, 100),
    phone: text(req.body?.phone, 20).replace(/[\s-]/g, ''),
    address: text(req.body?.address, 500),
    note: text(req.body?.note, 500) || null
  };
  if (!customer.name || !customer.address) {
    return res.status(400).json({ success: false, message: 'Please enter your name and delivery address' });
  }
  if (!/^0\d{8,9}$/.test(customer.phone)) {
    return res.status(400).json({ success: false, message: 'Invalid phone number' });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const quantities = new Map<string, number>();
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!item?.sku || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid item quantity' });
    }
    quantities.set(String(item.sku), (quantities.get(String(item.sku)) || 0) + qty);
  }
  if (quantities.size === 0 || quantities.size > MAX_LINES || [...quantities.values()].some(q => q > MAX_QTY_PER_LINE)) {
    return res.status(400).json({ success: false, message: 'Invalid number of items in the order' });
  }

  try {
    const skus = [...quantities.keys()];
    const found = await pool.query(
      'SELECT sku, product_name, price, quantity FROM inventory WHERE sku = ANY($1::text[])',
      [skus]
    );
    const bySku = new Map(found.rows.map(row => [row.sku, row]));

    const lines = [];
    for (const [sku, qty] of quantities) {
      const row = bySku.get(sku);
      if (!row) {
        return res.status(409).json({ success: false, message: `Product ${sku} was not found` });
      }
      if (Number(row.quantity) < qty) {
        return res.status(409).json({
          success: false,
          message: `Not enough stock for ${row.product_name} (${Math.max(0, Number(row.quantity) || 0)} left)`
        });
      }
      lines.push({ sku, product_name: row.product_name, price: Number(row.price), quantity: qty });
    }
    const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO shop_order (customer_name, phone, address, note, items, total)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
        [customer.name, customer.phone, customer.address, customer.note, JSON.stringify(lines), total]
      );
      const orderCode = `WEB-${String(inserted.rows[0].id).padStart(6, '0')}`;
      const summary = lines.map(l => `${l.product_name} x${l.quantity}`).join(', ');
      await client.query(
        `INSERT INTO notification (title, description, type) VALUES ($1, $2, 'info')`,
        [
          `New Online Order ${orderCode}`,
          `${customer.name} (${customer.phone}) Total ${total.toFixed(2)} THB: ${summary} | Address: ${customer.address}` +
            (customer.note ? ` | Note: ${customer.note}` : '')
        ]
      );
      await client.query('COMMIT');

      res.status(201).json({ success: true, order_code: orderCode, total, items: lines });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating shop order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ---------- ตะกร้าของบัญชีที่ login ----------
// ยึดผู้ใช้จาก token เสมอ (ไม่รับ user id จาก client) และไม่ยอมให้ผ่านแม้ AUTH_ENFORCE=false
// เพราะไม่มีผู้ใช้ก็ไม่รู้ว่าเป็นตะกร้าของใคร

router.get('/api/shop/cart', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in again' });
  try {
    const result = await pool.query('SELECT items FROM shop_cart WHERE user_id = $1', [req.user.id]);
    res.json({ items: result.rows[0]?.items ?? [] });
  } catch (error) {
    console.error('Error fetching shop cart:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.put('/api/shop/cart', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in again' });
  const items = parseCartItems(req.body?.items);
  if (!items) return res.status(400).json({ success: false, message: 'Invalid cart items' });
  try {
    await pool.query(
      `INSERT INTO shop_cart (user_id, items, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = now()`,
      [req.user.id, JSON.stringify(items)]
    );
    res.json({ items });
  } catch (error) {
    console.error('Error saving shop cart:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
