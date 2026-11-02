-- Phase 2: รองรับรหัสผ่านแบบ bcrypt (hash ยาว 60 ตัวอักษร)
-- รันก่อน deploy API เวอร์ชันใหม่ (ปลอดภัยที่จะรันซ้ำ)
ALTER TABLE todos ALTER COLUMN password TYPE text;
