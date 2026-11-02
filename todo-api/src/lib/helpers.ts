import { Request } from 'express';

// ไม่ส่งรหัสผ่านกลับไปให้ client
export function omitPassword<T extends Record<string, any>>(row: T) {
  if (!row) return row;
  const { password, ...rest } = row;
  return rest;
}

// ข้อมูลส่วนตัวที่ให้เห็นได้เฉพาะเจ้าของบัญชีและ admin/manager
export const PRIVATE_USER_FIELDS = ['dob', 'national_id', 'address', 'emergency_contact', 'phone', 'note'];

// Postgres error 23505 = ข้อมูลซ้ำกับ UNIQUE constraint
export function isUniqueViolation(error: unknown) {
  return (error as { code?: string })?.code === '23505';
}

// ชื่อผู้ทำรายการ: ยึดจาก token เป็นหลัก (กันการปลอมชื่อ) ถ้าไม่มี token (โหมด log-only) ค่อยใช้ค่าที่ส่งมา
export function actorName(req: Request, fallback?: string) {
  return req.user?.username ?? fallback;
}
