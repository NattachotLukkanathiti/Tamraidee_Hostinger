export const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
export const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

export const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
// token ที่ออกให้หลังยืนยัน OTP ของการลืมรหัสผ่าน ใช้ได้ครั้งเดียว
export const resetTokens = new Map<string, { email: string; expiresAt: number }>();

// ตรวจ OTP: คืนข้อความ error หรือ null ถ้าถูกต้อง (ลบ OTP ทิ้งเมื่อใช้แล้ว/หมดอายุ/ผิดเกินกำหนด)
export function consumeOtp(email: string, otp: string): string | null {
  const stored = otpStore.get(email);
  if (!stored) return 'ไม่พบรหัส OTP หรือ OTP หมดอายุแล้ว';

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่';
  }

  if (stored.otp !== String(otp)) {
    stored.attempts++;
    if (stored.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      return 'กรอก OTP ผิดเกินกำหนด กรุณาขอรหัสใหม่';
    }
    return 'รหัส OTP ไม่ถูกต้อง';
  }

  otpStore.delete(email);
  return null;
}

// เคลียร์ OTP / reset token ที่หมดอายุ
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore) if (now > entry.expiresAt) otpStore.delete(key);
  for (const [key, entry] of resetTokens) if (now > entry.expiresAt) resetTokens.delete(key);
}, 10 * 60 * 1000).unref();
