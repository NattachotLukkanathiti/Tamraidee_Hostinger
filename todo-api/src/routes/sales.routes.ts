import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';
import { actorName } from '../lib/helpers';

const router = Router();

router.get('/api/months', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM months ORDER BY id ASC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/api/sale_order', async (req, res) => {   
  try {     
    const result = await pool.query(       
      'SELECT * FROM sale_order ORDER BY id ASC'     
    );      
    const formattedRows = result.rows.map(row => {
      if (row.date) {
        const dateObj = new Date(row.date);
        row.date = dateObj.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return row;
    });

    res.json(formattedRows);   
  } catch (error) {     
    console.error(error);     
    res.status(500).json({ message: 'Server Error' });   
  } 
});

router.post('/api/sale_order', async (req, res) => {
  try {
    // 1. เพิ่ม amount เข้ามาใน req.body
    const { order_code, product_name, quantity, amount, picture, create_by, status, created_at } = req.body;

    // 2. เพิ่ม amount และ $8 ในคำสั่ง SQL
    const result = await pool.query(
      `INSERT INTO sale_order (order_code, product_name, quantity, amount, picture, create_by, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [order_code, product_name, quantity, amount, picture, actorName(req, create_by), status, created_at]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error inserting into sale_order:', error);
    res.status(500).json({ success: false, message: 'Server all Error' });
  }
});

// 📌 ปิดการขายจาก POS ใน transaction เดียว: ตัดสต็อก + บันทึก sale_order + แจ้งเตือนสต็อกต่ำ
//    ถ้าสินค้าชิ้นใดมีไม่พอ จะยกเลิกทั้งออเดอร์ (ไม่มีการตัดสต็อกครึ่ง ๆ กลาง ๆ)
router.post('/api/checkout', requireRole('admin', 'manager', 'pos'), async (req, res) => {
  const { order_code, items, discount, picture } = req.body;

  if (!order_code || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่มีสินค้าในออเดอร์' });
  }

  // รวม SKU ซ้ำ และเรียงตาม SKU เพื่อให้ล็อกแถวลำดับเดียวกันเสมอ (กัน deadlock เมื่อขายพร้อมกันหลายเครื่อง)
  const quantities = new Map<string, number>();
  for (const item of items) {
    const qty = Number(item?.quantity);
    if (!item?.sku || !Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: 'จำนวนสินค้าไม่ถูกต้อง' });
    }
    quantities.set(String(item.sku), (quantities.get(String(item.sku)) || 0) + qty);
  }
  const lines = [...quantities].sort(([a], [b]) => a.localeCompare(b));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sold: { sku: string; product_name: string; quantity: number; lineTotal: number; remaining: number; alert: number }[] = [];
    for (const [sku, qty] of lines) {
      // ตัดสต็อกที่ฝั่ง DB โดยตรง และตัดได้เฉพาะเมื่อของพอ (กันสต็อกติดลบ / ขายเกิน)
      const result = await client.query(
        `UPDATE inventory SET quantity = quantity - $1
         WHERE sku = $2 AND quantity >= $1
         RETURNING sku, product_name, price, quantity, quantity_alert`,
        [qty, sku]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        const exists = await pool.query('SELECT product_name, quantity FROM inventory WHERE sku = $1', [sku]);
        const message = exists.rows.length === 0
          ? `ไม่พบสินค้า ${sku} ในระบบ`
          : `สินค้า ${exists.rows[0].product_name} คงเหลือไม่พอ (เหลือ ${exists.rows[0].quantity})`;
        return res.status(409).json({ success: false, message });
      }

      const row = result.rows[0];
      sold.push({
        sku,
        product_name: row.product_name,
        quantity: qty,
        lineTotal: Number(row.price) * qty, // ใช้ราคาจาก DB ไม่ใช้ราคาที่ client ส่งมา
        remaining: Number(row.quantity),
        alert: Number(row.quantity_alert ?? 10)
      });
    }

    const subtotal = sold.reduce((sum, line) => sum + line.lineTotal, 0);
    const discountAmount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);

    // กระจายส่วนลดตามสัดส่วนยอดของแต่ละรายการ ให้ยอดรวมใน sale_order ตรงกับเงินที่รับจริง
    let discountLeft = Math.round(discountAmount * 100) / 100;
    const createBy = actorName(req, req.body.create_by);
    const savedLines = [];
    for (const [index, line] of sold.entries()) {
      const isLast = index === sold.length - 1;
      const share = isLast
        ? discountLeft
        : Math.round((subtotal > 0 ? (discountAmount * line.lineTotal) / subtotal : 0) * 100) / 100;
      discountLeft = Math.round((discountLeft - share) * 100) / 100;
      const amount = Math.round((line.lineTotal - share) * 100) / 100;

      await client.query(
        `INSERT INTO sale_order (order_code, product_name, quantity, amount, picture, create_by, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'Completed', NOW())`,
        [order_code, line.product_name, line.quantity, amount, picture, createBy]
      );

      // แจ้งเตือนเฉพาะเมื่อสต็อกลดลงถึงเกณฑ์ quantity_alert จริง
      if (line.remaining <= line.alert) {
        await client.query(
          `INSERT INTO notification (title, description, type) VALUES ($1, $2, 'warning')`,
          [
            `Inventory Alert : ${line.product_name}`,
            `Stock levels have dropped to the preset threshold Order ${order_code}: Deducted ${line.quantity} (Remaining ${line.remaining})`
          ]
        );
      }

      savedLines.push({ sku: line.sku, product_name: line.product_name, quantity: line.quantity, amount, remaining: line.remaining });
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        order_code,
        items: savedLines,
        subtotal,
        discount: discountAmount,
        total: Math.round((subtotal - discountAmount) * 100) / 100
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error processing checkout:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    client.release();
  }
});

// 📌 ยกเลิกรายการขายและคืนสต็อกใน transaction เดียว
//    คืนสต็อกเฉพาะแถวที่เพิ่งเปลี่ยนเป็น Canceled ในครั้งนี้ จึงกดยกเลิกซ้ำแล้วสต็อกไม่เพิ่มซ้ำ
router.post('/api/sale_order/cancel', requireRole('admin', 'manager', 'pos'), async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
  if (ids.length === 0) {
    return res.status(400).json({ success: false, message: 'ไม่พบรายการที่ต้องการยกเลิก' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const canceled = await client.query(
      `UPDATE sale_order SET status = 'Canceled'
       WHERE id = ANY($1::int[]) AND status IS DISTINCT FROM 'Canceled'
       RETURNING id, product_name, quantity`,
      [ids]
    );

    for (const row of canceled.rows) {
      // sale_order เก็บแค่ชื่อสินค้า จึงคืนสต็อกให้สินค้าชื่อนั้น (ตัวแรกถ้ามีชื่อซ้ำ ตาม logic เดิมของหน้า Sale)
      await client.query(
        `UPDATE inventory SET quantity = quantity + $1
         WHERE id = (SELECT id FROM inventory WHERE product_name = $2 ORDER BY id LIMIT 1)`,
        [Number(row.quantity) || 0, row.product_name]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, canceled: canceled.rows.map(row => row.id) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error canceling sale order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  } finally {
    client.release();
  }
});

router.put('/api/sale_order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // ใช้คำสั่ง UPDATE ที่ระบุเฉพาะคอลัมน์ status
    const result = await pool.query(
      `UPDATE sale_order SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) return res.status(404).send('Not Found');
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).send('Server Error');
  }
});

router.get('/api/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        -- รวมยอดขายเฉพาะของวันนี้
        COALESCE((SELECT SUM(amount) FROM sale_order WHERE DATE(created_at) = CURRENT_DATE AND status = 'Completed'), 0) AS todays_sale,
        
        -- รวมยอดขายทั้งหมดของปีนี้
        COALESCE((SELECT SUM(amount) FROM sale_order WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) AND status = 'Completed'), 0) AS yearly_total_sales,
        
        -- รวมยอดขายทั้งหมดที่สถานะ Completed (หรือจะปรับเป็นกำไรสุทธิหากมีฟิลด์ต้นทุน)
        COALESCE((SELECT SUM(amount) FROM sale_order WHERE status = 'Completed'), 0) AS net_income,
        
        -- นับจำนวนสินค้าทั้งหมดในคลัง
        COALESCE((SELECT COUNT(*) FROM inventory), 0) AS products
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error calculating summary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
