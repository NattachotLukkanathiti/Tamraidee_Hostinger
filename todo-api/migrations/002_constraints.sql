-- Phase 3: constraint กันข้อมูลซ้ำ / สต็อกติดลบ ที่ระดับฐานข้อมูล
-- ปลอดภัยที่จะรันซ้ำ

-- ===== 1) ตรวจข้อมูลก่อน: ถ้า query ใดมีผลลัพธ์ ต้องแก้ข้อมูลนั้นก่อน ไม่งั้นขั้นที่ 2 จะ error =====

-- อีเมลซ้ำในตารางผู้ใช้
SELECT title, COUNT(*) FROM todos GROUP BY title HAVING COUNT(*) > 1;

-- SKU ซ้ำในคลังสินค้า
SELECT sku, COUNT(*) FROM inventory GROUP BY sku HAVING COUNT(*) > 1;

-- สต็อกติดลบ (เกิดได้จากการขายพร้อมกันในระบบเดิม)
SELECT sku, product_name, quantity FROM inventory WHERE quantity < 0;


-- ===== 2) เพิ่ม constraint =====

CREATE UNIQUE INDEX IF NOT EXISTS todos_title_unique ON todos (title);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_sku_unique ON inventory (sku);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_quantity_nonnegative'
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_quantity_nonnegative CHECK (quantity >= 0);
  END IF;
END $$;
