import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';
import { dbErrorMessage } from '../lib/helpers';

const router = Router();

router.get('/api/suppliers', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id ,logo, supplier_name, email, phone , order_history, status FROM suppliers'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// เพิ่ม supplier ใหม่ (สถานะ Active ยังไม่มียอดสั่งซื้อ)
// ใส่เฉพาะคอลัมน์ที่ GET /api/suppliers อ่านอยู่ (ตารางจริงอาจไม่มี created_by จึงตัดออกตามโค้ดเดิม)
router.post('/api/suppliers', requireRole('admin', 'manager'), async (req, res) => {
  const text = (value: unknown) => String(value ?? '').trim();
  const supplier = {
    name: text(req.body?.supplier_name),
    email: text(req.body?.email),
    phone: text(req.body?.phone),
    logo: text(req.body?.logo) || null
  };

  if (!supplier.name || !supplier.email || !supplier.phone) {
    return res.status(400).json({
      success: false,
      message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน'
    });
  }

  try {
    const values = [supplier.name, supplier.email, supplier.phone, supplier.logo];
    let row;
    try {
      row = (await pool.query(
        `INSERT INTO suppliers (supplier_name, email, phone, logo, order_history, status)
         VALUES ($1, $2, $3, $4, 0, 'Active')
         RETURNING *`,
        values
      )).rows[0];
    } catch (error) {
      if (!needsExplicitId(error)) throw error;
      row = await insertWithNextId(values);
    }

    res.status(201).json({ success: true, data: row });
  } catch (error) {
    console.error('Error inserting into suppliers:', error);
    // บอกสาเหตุจากฐานข้อมูล (หน้านี้ใช้ได้เฉพาะ admin / manager) แทนคำว่า Server Error เฉย ๆ
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  }
});

// ตาราง suppliers ที่ย้ายข้อมูลเข้า Supabase: id ไม่มีค่าเริ่มต้น (23502) หรือตัวนับ id ค้างต่ำกว่า id ที่มีอยู่แล้ว (ชน primary key 23505)
function needsExplicitId(error: unknown) {
  const { code, column, constraint } = (error ?? {}) as { code?: string; column?: string; constraint?: string };
  return (code === '23502' && column === 'id') || (code === '23505' && !!constraint?.endsWith('_pkey'));
}

// ใส่ id = id ที่มากที่สุด + 1 เอง (ล็อกตารางกันเพิ่มพร้อมกันได้ id ซ้ำ)
// แล้วตั้งตัวนับ id ให้ต่อจากนี้ (ถ้ามี) ครั้งต่อไปจะเพิ่มแบบปกติได้เลย
async function insertWithNextId(values: (string | null)[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE suppliers IN SHARE ROW EXCLUSIVE MODE');
    const nextId = Number((await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS id FROM suppliers')).rows[0].id);
    const inserted = await client.query(
      `INSERT INTO suppliers (id, supplier_name, email, phone, logo, order_history, status)
       VALUES ($1, $2, $3, $4, $5, 0, 'Active')
       RETURNING *`,
      [nextId, ...values]
    );
    await client.query(
      `SELECT setval(seq, $1) FROM (SELECT pg_get_serial_sequence('suppliers', 'id') AS seq) s WHERE seq IS NOT NULL`,
      [nextId]
    );
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

router.put('/api/suppliers/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    // เพิ่ม status เข้ามารับค่าจาก body
    const { supplier_name, email, phone, logo, created_by, status } = req.body;

    // อัปเดตเฉพาะ field ที่ส่งมา (เช่น เปลี่ยนแค่ status จะไม่ล้าง created_by)
    const result = await pool.query(
      `UPDATE suppliers
       SET supplier_name = COALESCE($1, supplier_name), email = COALESCE($2, email),
           phone = COALESCE($3, phone), logo = COALESCE($4, logo),
           created_by = COALESCE($5, created_by), status = COALESCE($6, status)
       WHERE id = $7
       RETURNING *`,
      [supplier_name, email, phone, logo, created_by, status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้จัดจำหน่ายนี้' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้จัดจำหน่ายเรียบร้อยแล้ว',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
