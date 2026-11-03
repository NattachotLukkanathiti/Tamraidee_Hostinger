-- ตะกร้าหน้าร้าน (/shop) ของแต่ละบัญชี: เก็บที่เซิร์ฟเวอร์ให้ login เครื่องไหนก็เห็นตะกร้าเดียวกัน
-- ปลอดภัยที่จะรันซ้ำ
CREATE TABLE IF NOT EXISTS shop_cart (
  user_id integer PRIMARY KEY REFERENCES todos(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
