-- ออเดอร์จากหน้าร้านออนไลน์ (/shop) รอพนักงานยืนยัน ยังไม่ตัดสต็อกจนกว่าจะยืนยัน
-- ปลอดภัยที่จะรันซ้ำ
CREATE TABLE IF NOT EXISTS shop_order (
  id serial PRIMARY KEY,
  customer_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  note text,
  items jsonb NOT NULL,
  total numeric NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
