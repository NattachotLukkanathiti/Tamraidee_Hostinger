-- การตั้งค่าหน้า POS (หน้า Setting): ปิดการแสดงราคาสินค้า / อนุญาตให้แก้ราคาในตะกร้าก่อนชำระเงิน
-- ค่าเริ่มต้นปิดทั้งคู่ (POS ทำงานเหมือนเดิม) ปลอดภัยที่จะรันซ้ำ
ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS pos_hide_prices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pos_allow_price_edit boolean NOT NULL DEFAULT false;
