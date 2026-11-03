import { Request, Response, Router } from 'express';
import { pool } from '../database/db';
import { rateLimit } from '../middleware/rateLimit';
import { requireRole } from '../middleware/auth';
import { actorName } from '../lib/helpers';

// หน้าร้านออนไลน์สำหรับลูกค้า: ดูสินค้า / สินค้าขายดี เรียกได้โดยไม่ต้อง login (ลงทะเบียนไว้ใน PUBLIC_API_ROUTES)
// ส่วนตะกร้าและคำสั่งซื้อต้อง login และเห็นได้เฉพาะของบัญชีตัวเอง
const router = Router();

const MAX_LINES = 50;
const MAX_QTY_PER_LINE = 99;
// สั่งซื้อ / แนบสลิป ต้อง login จึงนับแยกตามบัญชี
const perUser = (req: Request) => `${req.ip}|user:${req.user?.id ?? ''}`;
const orderLimit = rateLimit(15 * 60 * 1000, 5, perUser);

const MAX_SKU_LENGTH = 64;
const BEST_SELLER_LIMIT = 10;
const MY_ORDERS_LIMIT = 50;
const ADMIN_ORDERS_LIMIT = 200;
const slipLimit = rateLimit(15 * 60 * 1000, 10, perUser);

// สลิปเป็นรูป base64 (data URL) แบบเดียวกับรูปอื่นในระบบ ไม่เกิน ~2 MB
const SLIP_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAX_SLIP_LENGTH = Math.ceil((2 * 1024 * 1024 * 4) / 3) + 32;

export const STATUS = {
  awaiting: 'Awaiting Payment',
  verifying: 'Verifying',
  completed: 'Completed',
  rejected: 'Rejected',
  canceled: 'Canceled'
} as const;
const ALL_STATUSES: string[] = Object.values(STATUS);

// ไม่ดึงรูปสลิปมากับรายการ (บอกแค่ว่ามีหรือไม่)
const ORDER_COLUMNS = `id, customer_name, phone, address, note, items, total, status, created_at,
  slip IS NOT NULL AS has_slip, slip_uploaded_at, reject_reason, reviewed_by, reviewed_at`;

interface OrderLine { sku: string; product_name: string; price: number; quantity: number }

const toOrder = (row: Record<string, any>) => ({
  id: row.id as number,
  order_code: orderCode(row.id),
  customer_name: row.customer_name as string,
  phone: row.phone as string,
  address: row.address as string,
  note: row.note as string | null,
  items: row.items as OrderLine[],
  total: Number(row.total),
  status: row.status as string,
  created_at: row.created_at,
  has_slip: Boolean(row.has_slip),
  slip_uploaded_at: row.slip_uploaded_at,
  reject_reason: row.reject_reason as string | null,
  reviewed_by: row.reviewed_by as string | null,
  reviewed_at: row.reviewed_at
});

export const orderCode = (id: number) => `WEB-${String(id).padStart(6, '0')}`;

// บัญชีรับเงิน = เบอร์โทรร้านในหน้า Setting (เบอร์เดียวกับที่หน้า POS ใช้สร้าง QR) หรือเลขประจำตัวผู้เสียภาษี 13 หลัก
async function storePromptPayId(): Promise<string | null> {
  const result = await pool.query('SELECT phone FROM settings ORDER BY id LIMIT 1');
  const id = String(result.rows[0]?.phone ?? '').replace(/[\s-]/g, '');
  return /^(0\d{9}|\d{13})$/.test(id) ? id : null;
}

function orderNotEditable(res: Response) {
  return res.status(409).json({ success: false, message: 'This order can no longer be changed. Please refresh your orders.' });
}

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

// สินค้าขายดี: เรียงตามจำนวนที่ขายได้จริงจาก POS (ไม่นับรายการที่ยกเลิก)
// ส่งแค่ SKU ตามลำดับ ไม่เปิดเผยยอดขาย / จำนวนที่ขายได้ให้คนนอกเห็น
router.get('/api/shop/best-sellers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.sku
       FROM sale_order s
       JOIN inventory i ON i.product_name = s.product_name
       WHERE s.status IS DISTINCT FROM 'Canceled'
       GROUP BY i.sku
       ORDER BY SUM(s.quantity) DESC, i.sku ASC
       LIMIT $1`,
      [BEST_SELLER_LIMIT]
    );
    res.json({ skus: result.rows.map(row => row.sku) });
  } catch (error) {
    console.error('Error fetching shop best sellers:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// ---------- คำสั่งซื้อ + ชำระเงิน PromptPay ----------
// ลูกค้าต้อง login ก่อนสั่ง (ออเดอร์ผูกกับบัญชี ดูสถานะได้จากเมนูโปรไฟล์)
// ยังไม่ตัดสต็อกตอนสั่ง จะตัดก็ต่อเมื่อพนักงานตรวจสลิปและยืนยันการชำระเงินแล้วเท่านั้น
router.post('/api/shop/orders', orderLimit, async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in to place an order' });
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
    // ร้านยังไม่ได้ตั้งเบอร์ PromptPay (หน้า Setting) = รับเงินไม่ได้ ไม่สร้างออเดอร์ค้างไว้
    const promptpayId = await storePromptPayId();
    if (!promptpayId) {
      return res.status(503).json({ success: false, message: 'Online payment is not available right now. Please try again later.' });
    }

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

    const inserted = await pool.query(
      `INSERT INTO shop_order (user_id, customer_name, phone, address, note, items, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '${STATUS.awaiting}') RETURNING ${ORDER_COLUMNS}`,
      [req.user.id, customer.name, customer.phone, customer.address, customer.note, JSON.stringify(lines), total]
    );
    res.status(201).json({ success: true, order: toOrder(inserted.rows[0]), promptpay_id: promptpayId });
  } catch (error) {
    console.error('Error creating shop order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ออเดอร์ของบัญชีที่ login (ใหม่สุดก่อน) พร้อมเบอร์ PromptPay สำหรับจ่ายออเดอร์ที่ยังค้าง
router.get('/api/shop/orders/mine', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in again' });
  try {
    const [orders, promptpayId] = await Promise.all([
      pool.query(
        `SELECT ${ORDER_COLUMNS} FROM shop_order WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT ${MY_ORDERS_LIMIT}`,
        [req.user.id]
      ),
      storePromptPayId()
    ]);
    res.json({ orders: orders.rows.map(toOrder), promptpay_id: promptpayId });
  } catch (error) {
    console.error('Error fetching my shop orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// แนบสลิป: เฉพาะเจ้าของออเดอร์ และออเดอร์ที่ยังไม่จ่าย / สลิปเดิมไม่ผ่าน -> รอพนักงานตรวจ (Verifying)
router.post('/api/shop/orders/:id/slip', slipLimit, async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in again' });
  const slip = typeof req.body?.slip === 'string' ? req.body.slip : '';
  if (!SLIP_PATTERN.test(slip) || slip.length > MAX_SLIP_LENGTH) {
    return res.status(400).json({ success: false, message: 'Please attach the payment slip as a PNG, JPEG or WebP image (max 2 MB)' });
  }

  try {
    const updated = await pool.query(
      `UPDATE shop_order
          SET slip = $1, slip_uploaded_at = now(), reject_reason = NULL, status = '${STATUS.verifying}'
        WHERE id = $2 AND user_id = $3 AND status IN ('${STATUS.awaiting}', '${STATUS.rejected}')
        RETURNING ${ORDER_COLUMNS}`,
      [slip, Number(req.params.id), req.user.id]
    );
    if (updated.rowCount === 0) return orderNotEditable(res);

    const order = toOrder(updated.rows[0]);
    await pool.query(
      `INSERT INTO notification (title, description, type) VALUES ($1, $2, 'info')`,
      [
        `Payment Slip ${order.order_code}`,
        `${order.customer_name} (${order.phone}) paid ${order.total.toFixed(2)} THB via PromptPay. Please verify the slip in Online Orders.`
      ]
    );
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error uploading payment slip:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ลูกค้ายกเลิกได้เฉพาะออเดอร์ที่ยังไม่จ่าย / สลิปไม่ผ่าน (ส่งสลิปแล้วต้องรอพนักงานตรวจ)
router.post('/api/shop/orders/:id/cancel', async (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Please sign in again' });
  try {
    const updated = await pool.query(
      `UPDATE shop_order SET status = '${STATUS.canceled}'
        WHERE id = $1 AND user_id = $2 AND status IN ('${STATUS.awaiting}', '${STATUS.rejected}')
        RETURNING ${ORDER_COLUMNS}`,
      [Number(req.params.id), req.user.id]
    );
    if (updated.rowCount === 0) return orderNotEditable(res);
    res.json({ success: true, order: toOrder(updated.rows[0]) });
  } catch (error) {
    console.error('Error canceling shop order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ---------- พนักงาน: ตรวจสลิปและยืนยันการชำระเงิน ----------

const reviewers = requireRole('admin', 'manager', 'pos');

router.get('/api/shop/admin/orders', reviewers, async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status && !ALL_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const result = await pool.query(
      `SELECT ${ORDER_COLUMNS} FROM shop_order
        WHERE ($1 = '' OR status = $1)
        ORDER BY created_at DESC, id DESC LIMIT ${ADMIN_ORDERS_LIMIT}`,
      [status]
    );
    res.json({ orders: result.rows.map(toOrder) });
  } catch (error) {
    console.error('Error fetching online orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// รูปสลิปแยกออกมา ไม่ส่งไปกับรายการ (รูปใหญ่)
router.get('/api/shop/admin/orders/:id/slip', reviewers, async (req, res) => {
  try {
    const result = await pool.query('SELECT slip FROM shop_order WHERE id = $1', [Number(req.params.id)]);
    if (!result.rows[0]?.slip) return res.status(404).json({ success: false, message: 'No payment slip for this order' });
    res.json({ slip: result.rows[0].slip });
  } catch (error) {
    console.error('Error fetching payment slip:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ยืนยันการชำระเงิน: ใน transaction เดียว ตัดสต็อก (ตัดได้เฉพาะเมื่อของพอ) + บันทึกยอดขาย + แจ้งเตือนสต็อกต่ำ
// ถ้าสินค้าชิ้นใดมีไม่พอ ยกเลิกทั้งหมด ออเดอร์ยังอยู่สถานะ Verifying ให้พนักงานตัดสินใจ (เช่น ปฏิเสธแล้วคืนเงิน)
router.post('/api/shop/admin/orders/:id/confirm', reviewers, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT ${ORDER_COLUMNS} FROM shop_order WHERE id = $1 FOR UPDATE`,
      [Number(req.params.id)]
    );
    const order = locked.rows[0] ? toOrder(locked.rows[0]) : null;
    if (!order || order.status !== STATUS.verifying) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Only orders with a payment slip waiting for verification can be confirmed' });
    }

    // เรียงตาม SKU ให้ล็อกแถวลำดับเดียวกับ POS เสมอ (กัน deadlock)
    const lines = [...order.items].sort((a, b) => a.sku.localeCompare(b.sku));
    const reviewer = actorName(req);
    for (const line of lines) {
      const result = await client.query(
        `UPDATE inventory SET quantity = quantity - $1
          WHERE sku = $2 AND quantity >= $1
          RETURNING quantity, quantity_alert, picture`,
        [line.quantity, line.sku]
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        const left = await pool.query('SELECT quantity FROM inventory WHERE sku = $1', [line.sku]);
        const message = left.rows.length === 0
          ? `Product ${line.product_name} is no longer in the inventory`
          : `Not enough stock for ${line.product_name} (${left.rows[0].quantity} left)`;
        return res.status(409).json({ success: false, message });
      }

      const row = result.rows[0];
      // ราคาตามที่ลูกค้าจ่ายจริง (ราคา ณ ตอนสั่ง ซึ่งเป็นยอดใน QR)
      await client.query(
        `INSERT INTO sale_order (order_code, product_name, quantity, amount, picture, create_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Completed', NOW())`,
        [order.order_code, line.product_name, line.quantity, Math.round(line.price * line.quantity * 100) / 100, row.picture, reviewer]
      );
      if (Number(row.quantity) <= Number(row.quantity_alert ?? 10)) {
        await client.query(
          `INSERT INTO notification (title, description, type) VALUES ($1, $2, 'warning')`,
          [
            `Inventory Alert : ${line.product_name}`,
            `Stock levels have dropped to the preset threshold Order ${order.order_code}: Deducted ${line.quantity} (Remaining ${row.quantity})`
          ]
        );
      }
    }

    const updated = await client.query(
      `UPDATE shop_order SET status = '${STATUS.completed}', reviewed_by = $1, reviewed_at = now()
        WHERE id = $2 RETURNING ${ORDER_COLUMNS}`,
      [reviewer, order.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, order: toOrder(updated.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error confirming online order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    client.release();
  }
});

// สลิปไม่ผ่าน (ยอดไม่ตรง / ไม่พบรายการโอน): แจ้งเหตุผลให้ลูกค้าเห็น แล้วลูกค้าแนบสลิปใหม่หรือยกเลิกได้
router.post('/api/shop/admin/orders/:id/reject', reviewers, async (req, res) => {
  const reason = text(req.body?.reason, 300);
  if (!reason) return res.status(400).json({ success: false, message: 'Please enter a reason' });
  try {
    const updated = await pool.query(
      `UPDATE shop_order SET status = '${STATUS.rejected}', reject_reason = $1, reviewed_by = $2, reviewed_at = now()
        WHERE id = $3 AND status = '${STATUS.verifying}'
        RETURNING ${ORDER_COLUMNS}`,
      [reason, actorName(req), Number(req.params.id)]
    );
    if (updated.rowCount === 0) {
      return res.status(409).json({ success: false, message: 'Only orders with a payment slip waiting for verification can be rejected' });
    }
    res.json({ success: true, order: toOrder(updated.rows[0]) });
  } catch (error) {
    console.error('Error rejecting online order:', error);
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
