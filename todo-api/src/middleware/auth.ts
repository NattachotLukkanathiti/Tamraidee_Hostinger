import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import { pool } from '../database/db';
import dotenv from 'dotenv';
dotenv.config();

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set');
}
const JWT_EXPIRES_IN = '12h';

// AUTH_ENFORCE=false = โหมด log-only: เตือนใน log แต่ยังปล่อย request ผ่าน (ใช้ช่วงทยอย deploy)
const AUTH_ENFORCE = process.env.AUTH_ENFORCE !== 'false';

const BCRYPT_ROUNDS = 10;

// ---------- Password ----------

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

// ตรวจรหัสผ่าน: รองรับรหัสเก่าที่ยังเป็น plain text และ hash ทับให้อัตโนมัติเมื่อ login ถูก
export async function checkPassword(userId: number, plain: string, stored: string | null): Promise<boolean> {
  if (!stored || !plain) return false;

  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }

  if (plain !== stored) return false;

  const hashed = await hashPassword(plain);
  await pool.query('UPDATE todos SET password = $1 WHERE id = $2', [hashed, userId]);
  return true;
}

// ---------- JWT ----------

export function signToken(user: { id: number }) {
  return jwt.sign({ sub: String(user.id) }, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
}

// โหลดข้อมูลผู้ใช้จาก DB ทุก request เพื่อให้การเปลี่ยน role / ลบผู้ใช้มีผลทันที
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  try {
    if (!token) throw new Error('missing token');

    const payload = jwt.verify(token, JWT_SECRET!) as jwt.JwtPayload;
    const result = await pool.query(
      'SELECT id, username, title, role FROM todos WHERE id = $1',
      [Number(payload.sub)]
    );
    if (result.rows.length === 0) throw new Error('user not found');

    const row = result.rows[0];
    req.user = { id: row.id, username: row.username, email: row.title, role: row.role };
    return next();
  } catch (error) {
    if (!AUTH_ENFORCE) {
      console.warn(`[auth:log-only] ${req.method} ${req.originalUrl} - ${(error as Error).message}`);
      return next();
    }
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.user?.role || '').toLowerCase();
    if (roles.includes(role)) return next();

    if (!AUTH_ENFORCE) {
      console.warn(`[auth:log-only] ${req.method} ${req.originalUrl} - role "${role}" not in [${roles}]`);
      return next();
    }
    return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ทำรายการนี้' });
  };
}

export function isAdmin(req: Request) {
  return ['admin', 'manager'].includes((req.user?.role || '').toLowerCase());
}

// ---------- Firebase (Social Login) ----------

if (getApps().length === 0) {
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'tamraidee' });
}

type FirebaseVerifier = (idToken: string) => Promise<DecodedIdToken>;
let firebaseVerifier: FirebaseVerifier = (idToken) => getAuth().verifyIdToken(idToken);

export function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken> {
  return firebaseVerifier(idToken);
}

// ใช้ใน test เท่านั้น: แทนการตรวจ token กับ Firebase จริง
export function setFirebaseVerifierForTests(verifier: FirebaseVerifier) {
  firebaseVerifier = verifier;
}
