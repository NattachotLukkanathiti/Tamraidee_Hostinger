import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';

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

// --- ส่วนที่เพิ่มเข้ามาใหม่: Route สำหรับบันทึกข้อมูล Supplier ---
router.post('/api/suppliers', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { supplier_name, email, phone, logo } = req.body;

    if (!supplier_name || !email || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' 
      });
    }

    // ตัด created_by ออก และใส่ค่า logo, supplier_name, email, phone, order_history
    const result = await pool.query(
      `INSERT INTO suppliers (supplier_name, email, phone, logo, order_history) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [supplier_name, email, phone, logo, 0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    // สั่งให้ console.error พิมพ์ error ออกมาดูใน Terminal
    console.error('Error inserting into suppliers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error',

    });
  }
});

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
