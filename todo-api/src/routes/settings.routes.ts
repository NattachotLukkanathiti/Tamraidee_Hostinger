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
  const { id, email, phone, address } = req.body;
  // การตั้งค่าหน้า POS (ไม่ส่งมา = คงค่าเดิม)
  const flag = (value: unknown) => (typeof value === 'boolean' ? value : null);
  const hidePrices = flag(req.body.pos_hide_prices);
  const allowPriceEdit = flag(req.body.pos_allow_price_edit);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result;

    if (id) {
      result = await client.query(
        `UPDATE settings 
         SET email = $1, phone = $2, address = $3, updated_at = NOW() 
         WHERE id = $4 RETURNING *`,
        [email, phone, address, id]
      );
    } else {
      result = await client.query(
        `INSERT INTO settings (email, phone, address) 
         VALUES ($1, $2, $3) RETURNING *`,
        [email, phone, address]
      );
    }

    let row = result.rows[0];
    if (row && (hidePrices !== null || allowPriceEdit !== null)) {
      row = (await client.query(
        `UPDATE settings
         SET pos_hide_prices = COALESCE($1, pos_hide_prices), pos_allow_price_edit = COALESCE($2, pos_allow_price_edit)
         WHERE id = $3 RETURNING *`,
        [hidePrices, allowPriceEdit, row.id]
      )).rows[0];
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: row });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error saving settings:', error);
    // ยังไม่ได้รัน migration 007 (ไม่มีคอลัมน์การตั้งค่า POS)
    const message = (error as { code?: string })?.code === '42703'
      ? 'POS settings are not available yet. Please run migration 007_pos_settings.sql.'
      : 'Server Error';
    res.status(500).json({ success: false, message });
  } finally {
    client.release();
  }
});

export default router;
