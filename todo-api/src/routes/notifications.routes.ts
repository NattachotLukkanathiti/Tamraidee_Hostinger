import { Router } from 'express';
import { pool } from '../database/db';
import { actorName } from '../lib/helpers';

const router = Router();

router.get('/api/notification', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 📌 เพิ่ม Route สำหรับบันทึกข้อมูล Notification
router.post('/api/notification', async (req, res) => {
  try {
    const { title, description, type, time_ago } = req.body;

    // ตรวจสอบว่ามีข้อมูล title ส่งมาหรือไม่ (ตามที่ฐานข้อมูลตั้งค่า NOT NULL ไว้)
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO notification (title, description, type, time_ago) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [title, description, type, time_ago]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving notification:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/api/notification_status/:username', async (req, res) => {
  try {
    const username = actorName(req, req.params.username);
    
    const result = await pool.query(
      'SELECT notification_id FROM notification_status WHERE username = $1',
      [username]
    );
    
    // ส่งกลับเป็น Array ของ Object ที่มี notification_id
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notification status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 2. บันทึกสถานะเมื่อ User กดอ่านแจ้งเตือน
router.post('/api/notification_status', async (req, res) => {
  try {
    const { notification_id } = req.body;
    const username = actorName(req, req.body.username);

    if (!notification_id || !username) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing notification_id or username' 
      });
    }

    // ใช้คำสั่ง ON CONFLICT เพื่อป้องกัน Error กรณีที่กดย้ำๆ (Insert Ignore)
    const result = await pool.query(
      `INSERT INTO notification_status (notification_id, username) 
       VALUES ($1, $2) 
       ON CONFLICT (notification_id, username) DO NOTHING 
       RETURNING *`,
      [notification_id, username]
    );

    res.status(201).json({ 
      success: true, 
      data: result.rows[0] || { message: 'Already marked as read' } 
    });
  } catch (error) {
    console.error('Error saving notification status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
