import { Router } from 'express';
import { pool } from '../database/db';
import crypto from 'crypto';
import { signToken, hashPassword, checkPassword, verifyFirebaseToken } from '../middleware/auth';
import { authLimit, otpRequestLimit } from '../middleware/rateLimit';
import { consumeOtp, otpStore, resetTokens, OTP_TTL_MS, RESET_TOKEN_TTL_MS } from '../lib/otp';
import { omitPassword, isUniqueViolation } from '../lib/helpers';

const router = Router();

router.post('/todos', authLimit, async (req, res) => {
  try {
    const { username, title, password, otp ,isReset } = req.body;
    if (!title || !otp) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัส OTP' });
    }

    const otpError = consumeOtp(title, otp);
    if (otpError) {
      return res.status(400).json({ success: false, message: otpError });
    }

    if (isReset) {
      // ลืมรหัสผ่าน -> ยังไม่เปลี่ยนรหัสที่นี่ ออก token ให้ไปใช้กับ /api/reset-password
      const resetToken = crypto.randomBytes(32).toString('hex');
      resetTokens.set(resetToken, { email: title, expiresAt: Date.now() + RESET_TOKEN_TTL_MS });

      return res.status(200).json({ success: true, message: 'ยืนยัน OTP สำเร็จ', resetToken });
    }

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const existing = await pool.query('SELECT id FROM todos WHERE title = $1', [title]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const result = await pool.query(
      `INSERT INTO todos (username, title, password, completed)
       VALUES ($1, $2, $3, false)
       RETURNING *`,
      [username, title, await hashPassword(password)]
    );

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ!',
      user: omitPassword(result.rows[0])
    });
  } catch (error) {
    // กันสมัครซ้ำพร้อมกัน 2 request (ชน UNIQUE index ใน migrations/002)
    if (isUniqueViolation(error)) {
      return res.status(409).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

router.post('/api/login', authLimit, async (req, res) => {
  try {
    const { title, password } = req.body;

    // ค้นหาผู้ใช้จากอีเมล แล้วตรวจรหัสผ่านด้วย bcrypt (รหัสเก่าที่เป็น plain text จะถูก hash ทับอัตโนมัติ)
    const result = await pool.query('SELECT * FROM todos WHERE title = $1', [title]);
    const user = result.rows[0];

    if (user && await checkPassword(user.id, password, user.password)) {
      res.json({
        success: true,
        message: 'Login successful',
        token: signToken(user),
        user: omitPassword(user)
      });
    } else {
      // ถ้าไม่เจอผู้ใช้
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/api/request-otp', otpRequestLimit, async (req, res) => {
  const { title } = req.body;
  console.log("BREVO_API_KEY is:", process.env.BREVO_API_KEY ? "Loaded" : "Not Found");
  if (!title) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  // OTP 6 หลัก สุ่มด้วย crypto (ปลอดภัยกว่า Math.random)
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  otpStore.set(title, { otp, expiresAt, attempts: 0 });

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

router.post('/api/verify-otp', authLimit, (req, res) => {
  const { title, otp } = req.body;

  const otpError = consumeOtp(title, otp);
  if (otpError) {
    return res.status(400).json({ success: false, message: otpError });
  }

  res.json({ success: true, message: 'OTP verified successfully' });
});

// ยืนยันตัวตนซ้ำก่อนทำรายการสำคัญ ด้วยรหัสผ่าน หรือ Firebase token ที่เพิ่ง re-authenticate (social login)
router.post('/api/verify-password', authLimit, async (req, res) => {
  try {
    const { username, password, firebaseToken } = req.body;
    if (!password && !firebaseToken) {
      return res.status(400).json({ valid: false, message: 'กรุณากรอกรหัสผ่าน' });
    }

    const result = req.user
      ? await pool.query('SELECT * FROM todos WHERE id = $1', [req.user.id])
      : await pool.query('SELECT * FROM todos WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.json({ valid: false });

    if (firebaseToken) {
      const decoded = await verifyFirebaseToken(firebaseToken).catch(() => null);
      // ต้องเป็นบัญชีเดียวกัน (ผูก UID ไว้ หรืออีเมลที่ยืนยันแล้วตรงกัน) และเพิ่งยืนยันตัวตนภายใน 5 นาที
      const sameAccount = !!decoded && (
        decoded.uid === user.firebase_uid || (decoded.email === user.title && decoded.email_verified === true)
      );
      const valid = sameAccount && Date.now() / 1000 - decoded!.auth_time < 5 * 60;
      return res.json({ valid });
    }

    res.json({ valid: await checkPassword(user.id, password, user.password) });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ valid: false, message: 'Server Error' });
  }
});

router.post('/api/check-email', async (req, res) => {
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

router.put('/api/reset-password', authLimit, async (req, res) => {
  try {
    const { title, password, resetToken } = req.body;

    if (!title || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกอีเมลและรหัสผ่านใหม่'
      });
    }

    // ต้องมี token ที่ได้จากการยืนยัน OTP ของอีเมลนี้เท่านั้น
    const tokenData = resetToken ? resetTokens.get(resetToken) : undefined;
    if (!tokenData || tokenData.email !== title || Date.now() > tokenData.expiresAt) {
      return res.status(403).json({
        success: false,
        message: 'สิทธิ์การเปลี่ยนรหัสผ่านหมดอายุ กรุณายืนยัน OTP ใหม่อีกครั้ง'
      });
    }
    resetTokens.delete(resetToken);

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
      [await hashPassword(password), title]
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

// หาบัญชีของผู้ใช้ Social Login:
// 1) เคยผูก Firebase UID ไว้แล้ว -> ใช้บัญชีนั้น
// 2) เจอบัญชีจากอีเมล -> ผูกให้เฉพาะเมื่ออีเมลยืนยันแล้ว หรือเป็นบัญชี social แบบเก่าที่เก็บ UID ไว้เป็นรหัสผ่าน
// 3) ไม่เจอเลย -> สร้างบัญชีใหม่
// คืน null ถ้าผูกไม่ได้ (อีเมลไม่ยืนยัน และพิสูจน์ความเป็นเจ้าของบัญชีเดิมไม่ได้)
async function findOrLinkSocialUser(uid: string, email: string, emailVerified: boolean, username: string, profile: string) {
  // บัญชีเดิม: อัปเดตเฉพาะรูปและ UID
  // - ไม่แตะ username เพราะใช้อ้างอิงในแชท/ประวัติการขาย/audit
  // - ไม่แตะ status เพื่อไม่ให้บัญชีที่ถูกระงับกลับมาใช้ได้
  const updateProfile = async (id: number) =>
    (await pool.query(
      `UPDATE todos SET profile = COALESCE(NULLIF($1, ''), profile), firebase_uid = $2 WHERE id = $3 RETURNING *`,
      [profile, uid, id]
    )).rows[0];

  const byUid = await pool.query('SELECT id FROM todos WHERE firebase_uid = $1', [uid]);
  if (byUid.rows.length > 0) return updateProfile(byUid.rows[0].id);

  const byEmail = await pool.query('SELECT id, password, firebase_uid FROM todos WHERE title = $1', [email]);
  if (byEmail.rows.length > 0) {
    const existing = byEmail.rows[0];
    const ownsLegacyAccount = !existing.firebase_uid && await checkPassword(existing.id, uid, existing.password);
    return emailVerified || ownsLegacyAccount ? updateProfile(existing.id) : null;
  }

  // ผู้ใช้ social ไม่ใช้รหัสผ่าน จึงตั้งรหัสแบบสุ่มไว้
  const created = await pool.query(
    `INSERT INTO todos (username, title, password, profile, status, completed, firebase_uid)
     VALUES ($1, $2, $3, $4, 'Active', false, $5) RETURNING *`,
    [username, email, await hashPassword(crypto.randomBytes(32).toString('hex')), profile, uid]
  );
  return created.rows[0];
}

// 1. Social Login: ตรวจ Firebase ID token ที่ฝั่ง server แล้วสร้าง/อัปเดตผู้ใช้ และออก JWT
//    (แทน /api/users/upsert เดิมที่เชื่อข้อมูลจาก client ทั้งหมด)
router.post('/api/auth/social', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Missing idToken' });
    }

    const decoded = await verifyFirebaseToken(idToken).catch(() => null);
    if (!decoded || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Social login ไม่ถูกต้อง กรุณาลองใหม่' });
    }

    const email = decoded.email;
    const username = decoded.name || email.split('@')[0];
    const profile = decoded.picture || '';

    const user = await findOrLinkSocialUser(decoded.uid, email, decoded.email_verified === true, username, profile);
    if (!user) {
      // มีบัญชีอีเมลนี้อยู่แล้ว แต่ผู้ให้บริการไม่ยืนยันว่าเป็นเจ้าของอีเมลจริง -> ไม่ผูกให้ (กันการยึดบัญชีคนอื่น)
      return res.status(403).json({
        success: false,
        message: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่าน หรือใช้บัญชีที่ยืนยันอีเมลแล้ว'
      });
    }

    res.json({ success: true, token: signToken(user), user: omitPassword(user) });
  } catch (error) {
    console.error('Error in social login:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

export default router;
