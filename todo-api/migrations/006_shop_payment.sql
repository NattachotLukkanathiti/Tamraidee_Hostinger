-- ชำระเงินออเดอร์หน้าร้านด้วย PromptPay: ลูกค้า (ต้อง login) แนบสลิป แล้วพนักงานตรวจและยืนยัน
-- สถานะ: Awaiting Payment -> Verifying (แนบสลิปแล้ว) -> Completed (ยืนยันแล้ว ตัดสต็อก) / Rejected (สลิปไม่ผ่าน แนบใหม่ได้)
--        Awaiting Payment / Rejected -> Canceled (ลูกค้ายกเลิกเอง)
-- ปลอดภัยที่จะรันซ้ำ
ALTER TABLE shop_order
  ADD COLUMN IF NOT EXISTS user_id integer REFERENCES todos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slip text,
  ADD COLUMN IF NOT EXISTS slip_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE shop_order ALTER COLUMN status SET DEFAULT 'Awaiting Payment';

-- ออเดอร์เก่า (ก่อนมีระบบชำระเงิน) ยังไม่ได้จ่าย
UPDATE shop_order SET status = 'Awaiting Payment' WHERE status = 'Pending';

CREATE INDEX IF NOT EXISTS shop_order_user_idx ON shop_order (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_order_status_idx ON shop_order (status, created_at DESC);
