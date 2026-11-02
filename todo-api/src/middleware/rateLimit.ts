import { Request, Response, NextFunction } from 'express';

// rate limit แบบ in-memory แยกตาม IP + อีเมล/username (กันเดา OTP/รหัสผ่าน และกันยิงอีเมลรัว ๆ)
export function rateLimit(windowMs: number, max: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (now > entry.resetAt) hits.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const who = req.body?.title || req.body?.username || '';
    const key = `${req.ip}|${who}`;
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      return res.status(429).json({ success: false, message: 'ส่งคำขอบ่อยเกินไป กรุณาลองใหม่ภายหลัง' });
    }
    next();
  };
}

export const otpRequestLimit = rateLimit(15 * 60 * 1000, 5);
export const authLimit = rateLimit(15 * 60 * 1000, 10);
