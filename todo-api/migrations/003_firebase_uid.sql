-- ผูกบัญชีกับ Firebase UID (ใช้กับ Social Login) แทนการจับคู่ด้วยอีเมลอย่างเดียว
-- ปลอดภัยที่จะรันซ้ำ
ALTER TABLE todos ADD COLUMN IF NOT EXISTS firebase_uid text;

CREATE UNIQUE INDEX IF NOT EXISTS todos_firebase_uid_unique
  ON todos (firebase_uid) WHERE firebase_uid IS NOT NULL;
