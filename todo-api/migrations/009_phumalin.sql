-- ///////////////////////////////////////////////////////////////////////////
-- /// PHUMALIN: ระบบวัตถุดิบ แยก "ร้านบน" (upper) และ "ร้านล่าง" (lower)
-- /// ตารางใหม่ทั้งหมด ไม่แตะตารางเดิม (inventory / sale_order / history)
-- /// เลิกใช้เมื่อไหร่: DROP TABLE phumalin_movement, phumalin_item;
-- /// ปลอดภัยที่จะรันซ้ำ
-- ///////////////////////////////////////////////////////////////////////////

-- /// วัตถุดิบของแต่ละร้าน: ชื่อ / หน่วย / หมวดหมู่ / คงเหลือ / หมายเหตุ
CREATE TABLE IF NOT EXISTS phumalin_item (
  id          serial PRIMARY KEY,
  store       text NOT NULL CHECK (store IN ('upper', 'lower')),
  name        text NOT NULL,
  unit        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('vegetable', 'meat', 'dry', 'packaging')),
  quantity    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  note        text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- /// ชื่อวัตถุดิบซ้ำในร้านเดียวกันไม่ได้ (คนละร้านชื่อซ้ำได้)
CREATE UNIQUE INDEX IF NOT EXISTS phumalin_item_store_name_key ON phumalin_item (store, lower(name));

-- /// ประวัติการเคลื่อนไหว: in = เติม, out = เบิก (จากหน้า POS), adjust = แก้ยอดคงเหลือ
CREATE TABLE IF NOT EXISTS phumalin_movement (
  id          serial PRIMARY KEY,
  store       text NOT NULL CHECK (store IN ('upper', 'lower')),
  item_id     integer REFERENCES phumalin_item(id) ON DELETE SET NULL,
  item_name   text NOT NULL,
  unit        text,
  category    text,
  type        text NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity    numeric(12, 2) NOT NULL,
  balance     numeric(12, 2),
  order_code  text,
  note        text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phumalin_movement_store_idx ON phumalin_movement (store, created_at DESC);
