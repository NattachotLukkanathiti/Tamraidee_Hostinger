import { Request, Response, NextFunction } from 'express';

// rate limit แบบ in-memory แยกตาม IP + อีเมล/username (กันเดา OTP/รหัสผ่าน และกันยิงอีเมลรัว ๆ)
// keyOf: เปลี่ยนตัวแยกได้ เช่น endpoint ที่ต้อง login ให้นับแยกตามบัญชี
export function rateLimit(windowMs: number, max: number, keyOf: (req: Request) => string = defaultKey) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (now > entry.resetAt) hits.delete(key);
  }, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyOf(req);
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

function defaultKey(req: Request) {
  return `${req.ip}|${req.body?.title || req.body?.username || ''}`;
}

export const otpRequestLimit = rateLimit(15 * 60 * 1000, 5);
export const authLimit = rateLimit(15 * 60 * 1000, 10);
