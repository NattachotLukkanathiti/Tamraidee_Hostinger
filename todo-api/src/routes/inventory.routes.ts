import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';
import { isUniqueViolation, actorName } from '../lib/helpers';

const router = Router();

// 📌 Route สำหรับอัปเดตสถานะและ Admin Note ของ Request History
router.put('/api/request_history/:id', requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note, approved_by, approved_date, approved_time } = req.body; // รับ approved_by เพิ่ม

    const result = await pool.query(
      `UPDATE request_history
       SET status = $1, admin_note = $2, approved_by = $3 ,  approved_date = $4,
           approved_time = $5
       WHERE id = $6 RETURNING *`,
      [status, admin_note, approved_by ? actorName(req, approved_by) : approved_by, approved_date, approved_time, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้ในระบบ' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating request history status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM inventory ORDER BY id ASC'
        );
        

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/api/history', async (req, res) => {
    try {
        // เพิ่ม picture เข้าไปในคำสั่ง SELECT
        const result = await pool.query(
            'SELECT * FROM history ORDER BY id DESC'
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

        // ไม่มีข้อมูลให้คืน [] (เดิมคืน 404 ทำให้หน้า History ค้าง loading)
        res.json(formattedRows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// 📌 เพิ่ม Route สำหรับบันทึกข้อมูลลงตาราง History
router.post('/api/history', async (req, res) => {
  try {
    const { date, sku, product_name, brand, price, quantity, created_by, picture,status } = req.body;

    if (!sku || !product_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูล SKU และ Product Name' 
      });
    }

    const result = await pool.query(
      `INSERT INTO history (date, sku, product_name, brand, price, quantity, created_by, picture, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [date, sku, product_name, brand, price, quantity, actorName(req, created_by), picture, status]
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกประวัติสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error inserting into history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
});

router.post('/api/inventory', requireRole('admin', 'manager', 'backend'), async (req, res) => {
  try {
    const { 
      sku, product_name, category, brand, price, 
      quantity_alert, supplier, invoice_no, import_quantity, picture, status, upload
    } = req.body;

    if (!sku || !category || !brand || price === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (SKU, Category, Brand, Price)' 
      });
    }

    // เพิ่ม upload เข้าไปเป็น $13
      const result = await pool.query(
      `INSERT INTO inventory 
       (sku, product_name, category, brand, price, quantity, quantity_alert, supplier, invoice_no, import_quantity, picture, status, upload) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING *`,
      [
        sku, product_name, category, brand, price, 
        import_quantity, quantity_alert, supplier, invoice_no, 
        import_quantity, // $10 คือ import_quantity
        picture,         // $11 คือ picture (ตรวจสอบให้แน่ใจว่าตรงนี้ส่งค่า picture)
        status,          // $12 คือ status
        upload           // $13 คือ upload
      ]
    );
    res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลสินค้าสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ success: false, message: 'SKU นี้มีอยู่ในระบบแล้ว' });
    }
    console.error('Error inserting into inventory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 📌 Route สำหรับดึงข้อมูล Request History
router.get('/api/request_history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM request_history ORDER BY id DESC'
    );
    
    const formattedRows = result.rows.map(row => {
      if (row.created_at) {
        const dateObj = new Date(row.created_at);
        row.created_at = dateObj.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return row;
    });

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching request history:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 📌 Route สำหรับบันทึกข้อมูล Request History (สถานะเริ่มต้น Pending)
router.post('/api/request_history', async (req, res) => {
  try {
    const { sku, requested_quantity, staff_reason, status, created_by, created_at, time ,upload_ref} = req.body;

    if (!sku || requested_quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูล SKU และ Requested Quantity' 
      });
    }

    const result = await pool.query(
      `INSERT INTO request_history (sku, requested_quantity, staff_reason, status, created_by, created_at, time,upload_ref) 
       VALUES ($1, $2, $3, $4, $5, $6, $7,$8) 
       RETURNING *`,
      [sku, requested_quantity, staff_reason, status || 'Pending', actorName(req, created_by), created_at, time,upload_ref]
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกคำขอปรับปรุงสต็อกสำเร็จ',
      data: result.rows[0]
    })

  } catch (error) {
    console.error('Error inserting into request_history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
});

router.put('/api/history/status/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE history SET status = $1 WHERE sku = $2 RETURNING *`,
      [status, sku]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบ SKU นี้ในตาราง History' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating history status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.put('/api/inventory/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { 
      product_name, category, brand, price, 
      quantity, quantity_alert, supplier, invoice_no, picture, upload
    } = req.body;

    // อัปเดตเฉพาะ field ที่ส่งมา (field ที่ไม่ได้ส่งจะคงค่าเดิม ไม่ถูกเขียนทับเป็น NULL)
    const result = await pool.query(
      `UPDATE inventory
       SET product_name = COALESCE($1, product_name), category = COALESCE($2, category),
           brand = COALESCE($3, brand), price = COALESCE($4, price),
           quantity = COALESCE($5, quantity), quantity_alert = COALESCE($6, quantity_alert),
           supplier = COALESCE($7, supplier), invoice_no = COALESCE($8, invoice_no),
           picture = COALESCE($9, picture), upload = COALESCE($10, upload)
       WHERE sku = $11
       RETURNING *`,
      [product_name, category, brand, price, quantity, quantity_alert, supplier, invoice_no, picture, upload, sku]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้านี้ในระบบ' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสินค้าเรียบร้อยแล้ว',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.delete('/api/inventory/:sku', requireRole('admin', 'manager', 'backend'), async (req, res) => {
  try {
    const { sku } = req.params;

    const result = await pool.query(
      'DELETE FROM inventory WHERE sku = $1 RETURNING *',
      [sku]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบสินค้านี้' });
    }

    res.json({
      success: true,
      message: 'ลบสินค้าเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
