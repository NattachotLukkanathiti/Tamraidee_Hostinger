import express from 'express';
import cors from 'cors';
import { pool } from './database/db';



const app = express();

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

app.use(cors({
  origin: [
    'https://lamped.netlify.app',
    'http://localhost:4200',
    'https://coruscating-donut-62bb86.netlify.app',
    'https://tamraidee.netlify.app',
    'https://tamraidee.nat-lukkanathiti.workers.dev',
    'https://trd.tamraidee.workers.dev',
    'https://trd2.tamraidee.workers.dev',
    'https://tamraidee.tech'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}));

/* app.options('*', cors());  */
// เพิ่ม limit เพื่อให้รองรับรูปภาพ Base64 ขนาดใหญ่
// เพิ่ม limit ให้รองรับข้อมูลขนาด 50MB (จากเดิมที่ค่าเริ่มต้นคือ 100KB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.get('/', (req, res) => {
  res.send('Todo API Running');
});


app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM todos ORDER BY id DESC'
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});
// 📌 Route สำหรับอัปเดตสถานะและ Admin Note ของ Request History
app.put('/api/request_history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body; // เพิ่ม admin_note

    // อัปเดตทั้ง status และ admin_note
    const result = await pool.query(
      `UPDATE request_history SET status = $1, admin_note = $2 WHERE id = $3 RETURNING *`,
      [status, admin_note, id]
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
app.get('/api/months', async (req, res) => {
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

app.get('/api/sale_order', async (req, res) => {   
  try {     
    const result = await pool.query(       
      'SELECT * FROM sale_order'     
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
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM inventory'
        );
        

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
app.get('/api/history', async (req, res) => {
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

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No history records found' });
        }

        res.json(formattedRows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
app.get('/api/employee', async (req, res) => {
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
app.get('/api/suppliers', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id ,logo, supplier_name, email, phone , order_history FROM suppliers'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
// 📌 เพิ่ม Route สำหรับเรียกดูข้อมูล Audit Log
// 📌 Route สำหรับเรียกดูข้อมูล Audit และแปลงรูปแบบวันที่
// 📌 Route สำหรับบันทึกข้อมูล (มีทั้ง date และ time)
app.post('/api/audit', async (req, res) => {
  try {
    const { date, time, username, email, activity, role,product, picture } = req.body;

    const result = await pool.query(
      `INSERT INTO audit (date, time, username, email, activity, role, product, picture) 
       VALUES ($1, $2, $3, $4, $5, $6 ,$7, $8) 
       RETURNING *`,
      [date, time, username, email, activity, role, product,picture]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error saving audit log:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// 📌 เพิ่ม Route สำหรับบันทึกข้อมูลลงตาราง History
app.post('/api/history', async (req, res) => {
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
      [date, sku, product_name, brand, price, quantity, created_by, picture, status]
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
app.get('/api/audit', async (req, res) => {
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


app.get('/api/notification', async (req, res) => {
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
app.post('/api/notification', async (req, res) => {
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
app.post('/todos', async (req, res) => {
  try {
    const { username, title, password, otp } = req.body;
    if (!title || !otp) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัส OTP' });
    }

    // ➕ [เพิ่ม] ดึงข้อมูล OTP ที่จดไว้ในสมุดโน้ต (otpStore)
    const storedData = otpStore.get(title);

    // ➕ [เพิ่ม] Step 1: เช็กว่ามี OTP ของอีเมลนี้สร้างไว้ไหม
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'ไม่พบรหัส OTP หรือ OTP หมดอายุแล้ว' });
    }

    // ➕ [เพิ่ม] Step 2: เช็กว่า OTP หมดอายุหรือยัง (เกิน 5 นาทีไหม)
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(title);
      return res.status(400).json({ success: false, message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' });
    }

    // ➕ [เพิ่ม] Step 3: เช็กว่า OTP ที่ยูเซอร์พิมพ์มา ตรงกับรหัสจริงไหม
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'รหัส OTP ไม่ถูกต้อง' });
    }

    // ➕ [เพิ่ม] Step 4: ถ้ารหัสถูกต้อง -> ลบรหัสออกจากสมุดโน้ตทันที (กันเอามาใช้ซ้ำ)
    otpStore.delete(title);

    // ------------------------------------------
    // โค้ดเดิมของคุณ: บันทึกข้อมูลผู้ใช้ลง PostgreSQL
    // ------------------------------------------
    const result = await pool.query(
      `INSERT INTO todos (username, title, password, completed)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [username, title, password]
    );

    // ✏️ [ปรับแก้ไข] ส่งโครงสร้าง JSON ตอบกลับให้ละเอียดและอ่านง่ายขึ้น
    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ!',
      user: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// (โค้ดส่วนบนของคุณยังคงเดิมทั้งหมด)

app.get('/api/suppliers', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id ,logo, supplier_name, email, phone , order_history FROM suppliers'
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- ส่วนที่เพิ่มเข้ามาใหม่: Route สำหรับบันทึกข้อมูล Supplier ---
app.post('/api/suppliers', async (req, res) => {
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

// (โค้ดส่วนล่างของคุณยังคงเดิมทั้งหมด)
app.post('/api/inventory', async (req, res) => {
  try {
    const { 
      sku, product_name, category, brand, price, 
      quantity_alert, supplier, invoice_no, import_quantity, picture ,status
    } = req.body;

    if (!sku || !category || !brand || price === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (SKU, Category, Brand, Price)' 
      });
    }

    // เพิ่ม quantity และ $11 โดยใช้ค่าเดียวกับ import_quantity
    const result = await pool.query(
      `INSERT INTO inventory 
       (sku, product_name, category, brand, price, quantity, quantity_alert, supplier, invoice_no, import_quantity, picture,status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11 ,$12) 
       RETURNING *`,
      [sku, product_name, category, brand, price, import_quantity, quantity_alert, supplier, invoice_no, import_quantity, picture,status]
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลสินค้าสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error inserting into inventory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error', 
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
app.post('/api/sale_order', async (req, res) => {
  try {
    // 1. เพิ่ม amount เข้ามาใน req.body
    const { order_code, product_name, quantity, amount, picture, create_by, status, created_at } = req.body;

    // 2. เพิ่ม amount และ $8 ในคำสั่ง SQL
    const result = await pool.query(
      `INSERT INTO sale_order (order_code, product_name, quantity, amount, picture, create_by, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [order_code, product_name, quantity, amount, picture, create_by, status, created_at]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error inserting into sale_order:', error);
    res.status(500).json({ success: false, message: 'Server all Error' });
  }
});

// 📌 Route สำหรับดึงข้อมูล Request History
app.get('/api/request_history', async (req, res) => {
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
app.post('/api/request_history', async (req, res) => {
  try {
    const { sku, requested_quantity, staff_reason, status, created_by, created_at, time } = req.body;

    if (!sku || requested_quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูล SKU และ Requested Quantity' 
      });
    }

    const result = await pool.query(
      `INSERT INTO request_history (sku, requested_quantity, staff_reason, status, created_by, created_at, time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [sku, requested_quantity, staff_reason, status || 'Pending', created_by, created_at, time]
    );

    res.status(201).json({
      success: true,
      message: 'บันทึกคำขอปรับปรุงสต็อกสำเร็จ',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error inserting into request_history:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server Error' 
    });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { title, password } = req.body;

    // ค้นหาผู้ใช้จากตาราง todos
    const result = await pool.query(
      'SELECT * FROM todos WHERE title = $1 AND password = $2',
      [title, password]
    );

    if (result.rows.length > 0) {
      // ถ้าเจอผู้ใช้ป
      res.json({ success: true, message: 'Login successful', user: result.rows[0] });
    } else {
      // ถ้าไม่เจอผู้ใช้
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});
app.post('/api/request-otp', async (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  // ของใหม่ (4 หลัก): สุ่มตั้งแต่ 1000 ถึง 9999
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  otpStore.set(title, { otp, expiresAt });

  try {
    // ใช้ fetch ยิงหา Brevo API โดยตรง
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY ?? '', // แก้ไขตรงนี้: เพิ่ม ?? '' เพื่อให้เป็น string เสมอ
        'content-type': 'application/json'
      },
      // เปลี่ยนจาก process.env.EMAIL_USER เป็นอีเมลจริงของคุณ
      body: JSON.stringify({
        sender: {
          name: 'Tamraidee Co.Th',
          email:'minec2645@gmail.com'
      },
      to: [{ email: title }],
      subject: 'Passcode OTP for Register',
      htmlContent: `<p>Your PIN is a: <h1>${otp}</h1> (Expire in 5 minutes)</p>`
    })
    });

if (!response.ok) {
  const errorData = await response.json();
  console.error('Brevo API Error:', errorData);
  throw new Error('Failed to send via Brevo API');
}

console.log(`OTP sent to ${title}`);
res.json({ success: true, message: 'OTP sent successfully' });

  } catch (error) {
  console.error('Error sending email:', error);
  res.status(500).json({ success: false, message: 'Failed to send OTP' });
}
});

app.post('/api/verify-otp', (req, res) => {
  const { title, otp } = req.body;

  const storedData = otpStore.get(title);

  if (!storedData) {
    return res.status(400).json({ success: false, message: 'OTP not found or expired' });
  }

  const { otp: storedOtp, expiresAt } = storedData;

  // ตรวจสอบเวลาหมดอายุ
  if (Date.now() > expiresAt) {
    otpStore.delete(title);
    return res.status(400).json({ success: false, message: 'OTP has expired' });
  }

  // ตรวจสอบความถูกต้องของ OTP
  if (otp === storedOtp) {
    otpStore.delete(title); // ลบ OTP เมื่อใช้แล้ว
    res.json({ success: true, message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid OTP' });
  }
});

app.post('/api/check-email', async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        exists: false,
        message: 'กรุณากรอกอีเมล'
      });
    }

    const result = await pool.query(
      'SELECT id FROM todos WHERE title = $1',
      [title]
    );

    if (result.rows.length > 0) {
      return res.json({
        exists: true
      });
    }

    return res.json({
      exists: false,
      message: 'ไม่พบอีเมลนี้ในระบบ'
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      exists: false,
      message: 'Server Error'
    });
  }
});
app.put('/api/sale_order/:id', async (req, res) => {
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
app.put('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;

    const result = await pool.query(
      `UPDATE todos
       SET completed = $1
       WHERE id = $2
       RETURNING *`,
      [completed, id]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.put('/api/history/status/:sku', async (req, res) => {
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
app.put('/api/employee/:username', async (req, res) => {
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
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating employee in todos:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// 📌 Route สำหรับอัปเดตสถานะ Request History (เพิ่มส่วนนี้)

// --- เพิ่ม Route สำหรับอัปเดตข้อมูล Supplier ---
app.put('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name, email, phone, logo, created_by } = req.body;

    const result = await pool.query(
      `UPDATE suppliers 
       SET supplier_name = $1, email = $2, phone = $3, logo = $4, created_by = $5
       WHERE id = $6 
       RETURNING *`,
      [supplier_name, email, phone, logo, created_by, id]
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
// ==========================================
// 📌 Notification Status Routes
// ==========================================

// 1. ดึงรายการแจ้งเตือนที่ User คนนั้นๆ อ่านแล้ว
app.get('/api/notification_status/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
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
app.post('/api/notification_status', async (req, res) => {
  try {
    const { notification_id, username } = req.body;

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
app.put('/api/reset-password', async (req, res) => {
  try {
    const { title, password } = req.body;

    if (!title || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่านใหม่'
      });
    }

    // เช็กว่ามี Account นี้จริงไหม
    const userCheck = await pool.query(
      'SELECT * FROM todos WHERE title = $1',
      [title]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบอีเมลนี้ในระบบ'
      });
    }

    // เปลี่ยน Password
    const result = await pool.query(
      `UPDATE todos
       SET password = $1
       WHERE title = $2
       RETURNING id, username, title`,
      [password, title]
    );

    res.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      user: result.rows[0]
    });

  } catch (error) {

    console.error('Reset Password Error:', error);

    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

app.put('/api/inventory/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const { 
      product_name, category, brand, price, 
      quantity, quantity_alert, supplier, invoice_no, picture 
    } = req.body;

    const result = await pool.query(
      `UPDATE inventory 
       SET product_name = $1, category = $2, brand = $3, price = $4, 
           quantity = $5, quantity_alert = $6, supplier = $7, invoice_no = $8, picture = $9
       WHERE sku = $10 
       RETURNING *`,
      [product_name, category, brand, price, quantity, quantity_alert, supplier, invoice_no, picture, sku]
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
app.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      'DELETE FROM todos WHERE id = $1',
      [id]
    );

    res.json({
      message: 'Todo deleted successfully'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.delete('/api/inventory/:sku', async (req, res) => {
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
app.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, dob, national_id, address, emergency_contact, profile, phone } = req.body;

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

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

app.put('/api/employee/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { role, status, note } = req.body;

    // อัปเดตเฉพาะ 3 คอลัมน์นี้เท่านั้น
    const result = await pool.query(
      `UPDATE todos 
       SET role = $1, status = $2, note = $3
       WHERE username = $4 
       RETURNING *`,
      [role, status, note, username]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานนี้' });
    }

    res.json({
      success: true,
      message: 'อัปเดตข้อมูลสำเร็จ (Role, Status, Note)',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating specific fields:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
app.get('/api/summary', async (req, res) => {
  try {
    const query = `
      SELECT 
        -- นับจำนวน Order ของวันนี้
        COALESCE((SELECT COUNT(*) FROM sale_order WHERE date = CURRENT_DATE), 0) AS todays_sale,
        
        -- นับจำนวน Order ทั้งหมดในปีนี้
        COALESCE((SELECT COUNT(*) FROM sale_order WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS yearly_total_sales,
        
        -- นับจำนวน Order ที่มีสถานะ Completed
        COALESCE((SELECT COUNT(*) FROM sale_order WHERE status = 'Completed'), 0) AS net_income,
        
        -- นับจำนวนสินค้าใน Inventory
        COALESCE((SELECT COUNT(*) FROM inventory), 0) AS products
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error calculating summary:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});
const PORT = process.env.PORT || 3000;
const omise = require('omise')({
  'publicKey': 'pkey_test_...',
  'secretKey': 'skey_test_...'
});

app.post('/create-promptpay-charge', async (req, res) => {
  const { amount } = req.body; // ยอดเงิน (หน่วยเป็นสตางค์ เช่น 100 บาท = 10000)
  
  try {
    const source = await omise.sources.create({
      amount: amount,
      currency: 'thb',
      type: 'promptpay'
    });

    const charge = await omise.charges.create({
      amount: amount,
      currency: 'thb',
      source: source.id
    });

    // ส่ง URL ของ QR Code และ Charge ID กลับไปให้ Angular
    res.json({ 
      qrCodeUrl: charge.source.scannable_code.image.download_uri,
      chargeId: charge.id
    });
  } catch (error) {
    res.status(500).json;
  }
});
app.get('/api/chat', async (req, res) => {
  try {
    const limitParam = typeof req.query.limit === 'string' ? req.query.limit : '10';
    const offsetParam = typeof req.query.offset === 'string' ? req.query.offset : '0';

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    // อัปเดต SQL: ทำ LEFT JOIN กับตาราง chat เองเพื่อดึงข้อความที่ถูกตอบกลับ (reply_message)
    const result = await pool.query(
      `SELECT 
         <unsafe_url>chat.id</unsafe_url>, chat.sender, chat.message, chat.created_at, 
         chat.is_read, chat.picture, chat.reply_to_id,
         todos.profile AS user_profile,
         reply.message AS reply_message,
         reply.sender AS reply_sender
       FROM chat 
       LEFT JOIN todos ON chat.sender = todos.username
       LEFT JOIN chat AS reply ON chat.reply_to_id = <unsafe_url>reply.id</unsafe_url>
       ORDER BY chat.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const formattedRows = result.rows.reverse().map(row => ({
      id: row.id,
      sender: row.sender,
      message: row.message,
      created_at: row.created_at,
      is_read: row.is_read,
      picture: row.picture,
      profile: row.user_profile,
      reply_to_id: row.reply_to_id,
      reply_message: row.reply_message, // ส่งข้อความที่ถูกตอบกลับไปให้ Angular
      reply_sender: row.reply_sender     // ส่งชื่อคนส่งข้อความต้นฉบับไปด้วย
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
app.put('/api/chat/read', async (req, res) => {
  const { username } = req.body;
  
  try {
    // อัปเดตข้อความที่คนอื่นส่งมา ให้กลายเป็นอ่านแล้ว (is_read = true)
    await pool.query(
      `UPDATE chat SET is_read = true WHERE sender != $1`, 
      [username]
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating read status:', error);
    res.status(500).json({ success: false });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { sender, message, picture, reply_to_id, profile } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูล sender และ message' });
    }

    const insertResult = await pool.query(
      `INSERT INTO chat (sender, message, picture, reply_to_id, profile) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [sender, message, picture || null, reply_to_id || null, profile || null] 
    );

    const newChat = insertResult.rows[0];

    res.status(201).json({ 
      success: true, 
      data: newChat
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});
// อัปเดตสถานะกำลังพิมพ์
app.post('/api/chat/typing', async (req, res) => {
  const { username, is_typing } = req.body;
  await pool.query(
    `INSERT INTO chat_typing (username, is_typing) VALUES ($1, $2) 
     ON CONFLICT (username) DO UPDATE SET is_typing = $2, updated_at = NOW()`,
    [username, is_typing]
  );
  res.sendStatus(200);
});

// ดึงสถานะคนอื่นที่กำลังพิมพ์
app.get('/api/chat/typing/:username', async (req, res) => {
  const { username } = req.params;
  const result = await pool.query(
    `SELECT username FROM chat_typing WHERE username != $1 AND is_typing = true AND updated_at > NOW() - INTERVAL '5 seconds'`,
    [username]
  );
  res.json(result.rows);
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});