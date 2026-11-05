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

// รหัสออเดอร์หน้าร้าน (ใช้เป็น order_code ใน sale_order ด้วย) เช่น id 12 -> WEB-000012
export function webOrderCode(id: number) {
  return `WEB-${String(id).padStart(6, '0')}`;
}

// ข้อความ error จาก PostgreSQL ที่อ่านแล้วรู้ว่าต้องแก้อะไร (ใช้กับหน้าที่เปิดได้เฉพาะ admin / manager)
export function dbErrorMessage(error: unknown) {
  const { code, column, constraint } = (error ?? {}) as { code?: string; column?: string; constraint?: string };
  switch (code) {
    case '23505':
      return constraint?.endsWith('_pkey')
        ? 'Database ID counter is out of sync. Please try again.'
        : 'This record already exists.';
    case '23502':
      return `Missing required value: ${column ?? 'unknown column'}`;
    case '42703':
    case '42P01':
      return 'Database table structure is outdated. Please run the latest migrations.';
    case '22P02':
    case '22001':
      return 'Some values are in the wrong format or too long.';
    default:
      return 'Server Error';
  }
}
