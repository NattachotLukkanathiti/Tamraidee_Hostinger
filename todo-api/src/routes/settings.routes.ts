import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/api/settings', async (req, res) => {
  try {

    const result = await pool.query('SELECT * FROM settings LIMIT 1');
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.post('/api/settings', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id, email, phone, address } = req.body; // เอาตัวที่ไม่มีออก

    let result;
    
    if (id) {
      result = await pool.query(
        `UPDATE settings 
         SET email = $1, phone = $2, address = $3, updated_at = NOW() 
         WHERE id = $4 RETURNING *`,
        [email, phone, address, id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO settings (email, phone, address) 
         VALUES ($1, $2, $3) RETURNING *`,
        [email, phone, address]
      );
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
