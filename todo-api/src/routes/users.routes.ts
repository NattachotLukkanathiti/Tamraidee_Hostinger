import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole, isAdmin } from '../middleware/auth';
import { omitPassword, PRIVATE_USER_FIELDS } from '../lib/helpers';

const router = Router();

router.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM todos ORDER BY id DESC'
    );

    const canSeePrivate = isAdmin(req);
    res.json(result.rows.map(row => {
      const user: Record<string, any> = omitPassword(row);
      if (!canSeePrivate && row.id !== req.user?.id) {
        for (const field of PRIVATE_USER_FIELDS) delete user[field];
      }
      return user;
    }));

  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

router.get('/api/employee', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, code, employee, email, phone FROM employee'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/api/employee/:username', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { username } = req.params;
    const { role, status, note } = req.body;

    const result = await pool.query(
      `UPDATE todos 
       SET role = $1, status = $2, note = $3
       WHERE username = $4 
       RETURNING *`,
      [role, status, note, username]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้งานนี้ในระบบ' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว',
      data: omitPassword(result.rows[0])
    });

  } catch (error) {
    console.error('Error updating employee in todos:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, dob, national_id, address, emergency_contact, profile, phone } = req.body;

    if (req.user && req.user.id !== Number(id) && !isAdmin(req)) {
      return res.status(403).json({ success: false, message: 'แก้ไขได้เฉพาะข้อมูลของตัวเอง' });
    }

    const result = await pool.query(
      `UPDATE todos 
       SET username = $1, dob = $2, national_id = $3, address = $4, emergency_contact = $5, profile = $6, phone = $7
       WHERE id = $8 
       RETURNING *`,
      [username, dob, national_id, address, emergency_contact, profile, phone, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
    }

    res.json({ success: true, data: omitPassword(result.rows[0]) });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.delete('/api/employee/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM todos WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้ในระบบ' });
    }

    res.json({ success: true, message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 2. Route สำหรับตรวจสอบ Role ของผู้ใช้
router.get('/api/users/role/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query('SELECT role FROM todos WHERE title = $1', [email]);

    if (result.rows.length > 0) {
      res.json({ success: true, role: result.rows[0].role });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
