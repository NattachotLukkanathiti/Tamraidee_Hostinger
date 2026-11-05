-- schema จำลองสำหรับ API test (เฉพาะตาราง/คอลัมน์ที่ test ใช้) - ห้ามรันกับฐานข้อมูลจริง
DROP TABLE IF EXISTS todos, inventory, sale_order, notification, audit, history, settings, suppliers, shop_order, shop_cart CASCADE;

CREATE TABLE todos (
  id serial PRIMARY KEY, username text, title text, password varchar(50), completed boolean,
  role text, status text, note text, profile text, dob text, national_id text, address text,
  emergency_contact text, phone text
);
CREATE TABLE inventory (
  id serial PRIMARY KEY, sku text, product_name text, category text, brand text, price numeric,
  quantity int, quantity_alert int, supplier text, invoice_no text, import_quantity int,
  picture text, status text, upload text
);
CREATE TABLE sale_order (
  id serial PRIMARY KEY, order_code text, product_name text, quantity int, amount numeric,
  picture text, create_by text, status text, created_at timestamptz
);
CREATE TABLE notification (
  id serial PRIMARY KEY, title text NOT NULL, description text, type text, time_ago text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE audit (
  id serial PRIMARY KEY, date date, time text, username text, email text, activity text,
  role text, product text, picture text
);
CREATE TABLE history (
  id serial PRIMARY KEY, date date, sku text, product_name text, brand text, price numeric,
  quantity int, created_by text, picture text, status text
);
CREATE TABLE settings (
  id serial PRIMARY KEY, email text, phone text, address text, updated_at timestamptz
);
-- เหมือนตารางที่ย้ายเข้า Supabase: id ไม่มีค่าเริ่มต้น
CREATE TABLE suppliers (
  id integer PRIMARY KEY, logo text, supplier_name text, email text, phone text,
  order_history integer, status text
);
