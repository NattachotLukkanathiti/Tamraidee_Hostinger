import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';
import { actorName } from '../lib/helpers';

const router = Router();

// 📌 เพิ่ม Route สำหรับเรียกดูข้อมูล Audit Log
// 📌 Route สำหรับเรียกดูข้อมูล Audit และแปลงรูปแบบวันที่
// 📌 Route สำหรับบันทึกข้อมูล (มีทั้ง date และ time)
router.post('/api/audit', async (req, res) => {
  try {
    const { date, time, username, email, activity, role,product, picture } = req.body;

    // ผู้ทำรายการต้องมาจาก token ไม่ใช่จากค่าที่ client ส่งมา
    const result = await pool.query(
      `INSERT INTO audit (date, time, username, email, activity, role, product, picture)
       VALUES ($1, $2, $3, $4, $5, $6 ,$7, $8)
       RETURNING *`,
      [
        date, time,
        actorName(req, username),
        req.user?.email ?? email,
        activity,
        req.user ? (req.user.role || 'Guest') : role,
        product, picture
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving audit log:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/api/audit', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit ORDER BY id DESC');

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
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
