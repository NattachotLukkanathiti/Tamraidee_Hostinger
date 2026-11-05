-- สั่งซื้อแบบรับที่ร้าน จ่ายเงินสด (ใช้เมื่อเปิด "Hide product prices" ในหน้า Setting)
-- payment_method: promptpay = จ่าย QR แนบสลิป / cash = มารับและจ่ายที่ร้าน (สถานะ Awaiting Pickup)
-- ออเดอร์เดิมทั้งหมดเป็น promptpay ปลอดภัยที่จะรันซ้ำ
ALTER TABLE shop_order
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'promptpay';
