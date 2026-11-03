// API integration test: รันกับ PostgreSQL สำหรับทดสอบเท่านั้น (ดู tests/README.md)
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';

// test นี้ล้างตารางทุกครั้ง จึงยอมรันเฉพาะฐานข้อมูลที่ชื่อลงท้ายด้วย test
if (process.env.DATABASE_URL || !/test$/.test(process.env.DB_NAME || '')) {
  throw new Error('API tests ต้องใช้ DB_* ที่ชี้ไปฐานข้อมูลทดสอบ (DB_NAME ลงท้ายด้วย "test") และห้ามตั้ง DATABASE_URL');
}
process.env.JWT_SECRET ||= 'test-secret';

// import หลังตั้ง env แล้ว
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pool } = require('../src/database/db') as typeof import('../src/database/db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setFirebaseVerifierForTests } = require('../src/middleware/auth') as typeof import('../src/middleware/auth');

// Firebase ID token ปลอม: token -> ข้อมูลผู้ใช้ที่ Firebase จะยืนยันให้
const firebaseTokens: Record<string, { uid: string; email: string; email_verified: boolean; name?: string; auth_time?: number }> = {};
setFirebaseVerifierForTests(async (token) => {
  const decoded = firebaseTokens[token];
  if (!decoded) throw new Error('invalid token');
  return { auth_time: Math.floor(Date.now() / 1000), ...decoded } as never;
});

let server: Server;
let base = '';

const sql = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

async function api(method: string, url: string, body?: unknown, token?: string) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json: any = text;
  try { json = JSON.parse(text); } catch { /* response ไม่ใช่ JSON */ }
  return { status: res.status, body: json };
}

async function login(email: string, password: string) {
  const res = await api('POST', '/api/login', { title: email, password });
  assert.equal(res.status, 200, `login ${email} failed`);
  return res.body.token as string;
}

const stock = async (sku: string) =>
  Number((await pool.query('SELECT quantity FROM inventory WHERE sku = $1', [sku])).rows[0].quantity);

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await pool.query(sql('tests/schema.sql'));
  await pool.query(sql('migrations/001_auth.sql'));
  await pool.query(sql('migrations/002_constraints.sql'));
  await pool.query(sql('migrations/003_firebase_uid.sql'));
  await pool.query(sql('migrations/004_shop_orders.sql'));
  for (const key of Object.keys(firebaseTokens)) delete firebaseTokens[key];
  await pool.query(`
    INSERT INTO todos (username, title, password, completed, role, national_id) VALUES
      ('admin1', 'admin@test.com', 'Admin@1234', false, 'admin', '1111'),
      ('pos1', 'pos@test.com', 'Pos@12345', false, 'pos', '2222');
    INSERT INTO inventory (sku, product_name, category, brand, price, quantity, quantity_alert, supplier, invoice_no) VALUES
      ('SKU-A', 'Apple', 'Fruit', 'B1', 100, 5, 2, 'SupplierX', 'INV-1'),
      ('SKU-B', 'Banana', 'Fruit', 'B2', 50, 1, 0, 'SupplierY', 'INV-2');
  `);
});

// ---------- Auth ----------

test('login: รหัส plain text เดิมถูก hash อัตโนมัติ และไม่ส่ง password กลับ', async () => {
  const res = await api('POST', '/api/login', { title: 'admin@test.com', password: 'Admin@1234' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.password, undefined);

  const stored = (await pool.query("SELECT password FROM todos WHERE username = 'admin1'")).rows[0].password;
  assert.match(stored, /^\$2[aby]\$/);

  await login('admin@test.com', 'Admin@1234'); // login ซ้ำหลัง hash แล้วยังได้
  assert.equal((await api('POST', '/api/login', { title: 'admin@test.com', password: 'wrong' })).status, 401);
});

test('auth: ไม่มี token / token ปลอม ได้ 401 ส่วน public route ผ่านได้', async () => {
  assert.equal((await api('GET', '/api/inventory')).status, 401);
  assert.equal((await api('GET', '/api/inventory', undefined, 'forged.token.value')).status, 401);
  assert.equal((await api('POST', '/api/check-email', { title: 'admin@test.com' })).body.exists, true);
});

test('shop: ดูสินค้าได้โดยไม่ต้อง login และไม่เห็นข้อมูลภายใน (supplier / invoice)', async () => {
  const res = await api('GET', '/api/shop/products');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.map((p: any) => p.sku), ['SKU-A', 'SKU-B']);
  assert.deepEqual(Object.keys(res.body[0]).sort(), ['brand', 'category', 'picture', 'price', 'product_name', 'quantity', 'sku']);
});

// rate limit ของการสั่งซื้อคือ 5 ครั้ง / 15 นาที / IP นับรวมทุก test ในไฟล์นี้
const shopOrder = (body: Record<string, unknown>) => api('POST', '/api/shop/orders', {
  customer_name: 'ลูกค้า ทดสอบ', phone: '081-234-5678', address: 'กรุงเทพฯ', ...body
});

test('shop order: สั่งได้โดยไม่ login คิดราคาจาก DB ไม่ตัดสต็อก และแจ้งเตือนพนักงาน', async () => {
  const res = await shopOrder({ items: [{ sku: 'SKU-A', quantity: 2, price: 1 }, { sku: 'SKU-A', quantity: 1 }] });

  assert.equal(res.status, 201);
  assert.match(res.body.order_code, /^WEB-\d{6}$/);
  assert.equal(res.body.total, 300);
  assert.equal(await stock('SKU-A'), 5);

  const order = (await pool.query('SELECT phone, status, items FROM shop_order')).rows[0];
  assert.deepEqual([order.phone, order.status, order.items[0].quantity], ['0812345678', 'Pending', 3]);
  const notice = (await pool.query('SELECT title, description FROM notification')).rows[0];
  assert.ok(notice.title.includes(res.body.order_code));
  assert.ok(notice.description.includes('Apple x3'));
});

test('shop order: ข้อมูลไม่ครบ / ของไม่พอ / ไม่มีสินค้า ถูกปฏิเสธและไม่สร้างออเดอร์', async () => {
  assert.equal((await shopOrder({ phone: '12', items: [{ sku: 'SKU-A', quantity: 1 }] })).status, 400);
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-B', quantity: 2 }] })).status, 409);
  assert.equal((await shopOrder({ items: [{ sku: 'NOPE', quantity: 1 }] })).status, 409);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM shop_order')).rows[0].n, 0);
});

test('shop order: สั่งถี่เกินไปได้ 429', async () => {
  assert.equal((await shopOrder({ items: [] })).status, 400);
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-A', quantity: 1 }] })).status, 429);
});

test('reset-password: ไม่มี reset token ที่ได้จาก OTP ได้ 403', async () => {
  const res = await api('PUT', '/api/reset-password', { title: 'admin@test.com', password: 'New@1234' });
  assert.equal(res.status, 403);
});

test('role: pos ดู audit ไม่ได้ แต่ admin ดูได้', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const admin = await login('admin@test.com', 'Admin@1234');
  assert.equal((await api('GET', '/api/audit', undefined, pos)).status, 403);
  assert.equal((await api('GET', '/api/audit', undefined, admin)).status, 200);
});

test('users: ข้อมูลส่วนตัวของคนอื่นถูกซ่อนสำหรับผู้ใช้ที่ไม่ใช่ admin', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const users = (await api('GET', '/api/todos', undefined, pos)).body;
  const byName = Object.fromEntries(users.map((u: any) => [u.username, u]));
  assert.equal(byName.pos1.national_id, '2222');
  assert.equal(byName.admin1.national_id, undefined);
  assert.ok(users.every((u: any) => u.password === undefined));
});

test('audit: ชื่อผู้ทำรายการมาจาก token ปลอมเป็นคนอื่นไม่ได้', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const res = await api('POST', '/api/audit', { username: 'admin1', role: 'admin', activity: 'spoof' }, pos);
  assert.equal(res.body.data.username, 'pos1');
  assert.equal(res.body.data.role, 'pos');
});

test('verify-password: ตรวจจากผู้ใช้ใน token', async () => {
  const admin = await login('admin@test.com', 'Admin@1234');
  assert.equal((await api('POST', '/api/verify-password', { password: 'Admin@1234' }, admin)).body.valid, true);
  assert.equal((await api('POST', '/api/verify-password', { password: 'nope' }, admin)).body.valid, false);
});

// ---------- Checkout / Sales ----------

test('checkout: ตัดสต็อก กระจายส่วนลด และแจ้งเตือนเฉพาะสินค้าที่ถึงเกณฑ์', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const res = await api('POST', '/api/checkout', {
    order_code: '#T1',
    items: [{ sku: 'SKU-A', quantity: 2 }, { sku: 'SKU-B', quantity: 1 }],
    discount: 30
  }, pos);

  assert.equal(res.status, 201);
  assert.equal(res.body.data.total, 220);
  assert.equal(await stock('SKU-A'), 3);
  assert.equal(await stock('SKU-B'), 0);

  const amounts = (await pool.query('SELECT product_name, amount::float FROM sale_order ORDER BY id')).rows;
  assert.deepEqual(amounts, [{ product_name: 'Apple', amount: 176 }, { product_name: 'Banana', amount: 44 }]);

  const titles = (await pool.query('SELECT title FROM notification')).rows.map(r => r.title);
  assert.deepEqual(titles, ['Inventory Alert : Banana']);
});

test('checkout: ของไม่พอ ยกเลิกทั้งออเดอร์ ไม่ตัดสต็อกสินค้าอื่น', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const res = await api('POST', '/api/checkout', {
    order_code: '#T2',
    items: [{ sku: 'SKU-A', quantity: 1 }, { sku: 'SKU-B', quantity: 2 }],
    discount: 0
  }, pos);

  assert.equal(res.status, 409);
  assert.equal(await stock('SKU-A'), 5);
  assert.equal((await pool.query('SELECT COUNT(*)::int AS n FROM sale_order')).rows[0].n, 0);
});

test('checkout: ขายพร้อมกันหลายเครื่อง ไม่ขายเกินสต็อก', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      api('POST', '/api/checkout', { order_code: `#C${i}`, items: [{ sku: 'SKU-A', quantity: 1 }], discount: 0 }, pos)
    )
  );
  assert.equal(results.filter(r => r.status === 201).length, 5);
  assert.equal(results.filter(r => r.status === 409).length, 3);
  assert.equal(await stock('SKU-A'), 0);
});

test('cancel: กดยกเลิกซ้ำ คืนสต็อกแค่ครั้งเดียว', async () => {
  const pos = await login('pos@test.com', 'Pos@12345');
  await api('POST', '/api/checkout', { order_code: '#T3', items: [{ sku: 'SKU-A', quantity: 2 }], discount: 0 }, pos);
  const ids = (await pool.query("SELECT id FROM sale_order WHERE order_code = '#T3'")).rows.map(r => r.id);

  assert.deepEqual((await api('POST', '/api/sale_order/cancel', { ids }, pos)).body.canceled, ids);
  assert.deepEqual((await api('POST', '/api/sale_order/cancel', { ids }, pos)).body.canceled, []);
  assert.equal(await stock('SKU-A'), 5);
});

// ---------- Inventory ----------

test('inventory: แก้บาง field แล้ว field อื่นไม่หาย / SKU ซ้ำได้ 409', async () => {
  const admin = await login('admin@test.com', 'Admin@1234');
  const res = await api('PUT', '/api/inventory/SKU-A', { price: 120 }, admin);
  assert.equal(Number(res.body.data.price), 120);
  assert.equal(res.body.data.supplier, 'SupplierX');
  assert.equal(res.body.data.invoice_no, 'INV-1');

  const dup = await api('POST', '/api/inventory', { sku: 'SKU-A', category: 'x', brand: 'y', price: 1 }, admin);
  assert.equal(dup.status, 409);
});

test('history: ไม่มีข้อมูลคืน [] ไม่ใช่ 404', async () => {
  const admin = await login('admin@test.com', 'Admin@1234');
  const res = await api('GET', '/api/history', undefined, admin);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, []);
});

// ---------- Social Login ----------

const socialLogin = (idToken: string) => api('POST', '/api/auth/social', { idToken });
const uidOf = async (email: string) =>
  (await pool.query('SELECT firebase_uid FROM todos WHERE title = $1', [email])).rows[0]?.firebase_uid;

test('social: token ไม่ถูกต้อง ได้ 401', async () => {
  assert.equal((await socialLogin('forged')).status, 401);
});

test('social: ผู้ใช้ใหม่ -> สร้างบัญชีและผูก Firebase UID', async () => {
  firebaseTokens.t = { uid: 'uid-new', email: 'new@test.com', email_verified: true, name: 'New User' };

  const res = await socialLogin('t');

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.password, undefined);
  assert.equal(await uidOf('new@test.com'), 'uid-new');
});

test('social: บัญชีเดิม + อีเมลยืนยันแล้ว -> ผูกกับบัญชีเดิม (ไม่สร้างซ้ำ)', async () => {
  firebaseTokens.t = { uid: 'uid-admin', email: 'admin@test.com', email_verified: true };

  const res = await socialLogin('t');

  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'admin');
  assert.equal(res.body.user.username, 'admin1', 'ไม่เขียนทับ username เดิม');
  assert.equal(await uidOf('admin@test.com'), 'uid-admin');
  assert.equal((await pool.query("SELECT COUNT(*)::int AS n FROM todos WHERE title = 'admin@test.com'")).rows[0].n, 1);
});

test('social: บัญชีเดิม + อีเมลไม่ได้ยืนยัน -> ปฏิเสธ (กันยึดบัญชีคนอื่น)', async () => {
  firebaseTokens.t = { uid: 'uid-attacker', email: 'admin@test.com', email_verified: false };

  const res = await socialLogin('t');

  assert.equal(res.status, 403);
  assert.equal(res.body.token, undefined);
  assert.equal(await uidOf('admin@test.com'), null);
});

test('social: บัญชี social แบบเก่า (เก็บ UID เป็นรหัสผ่าน) + อีเมลไม่ยืนยัน -> ผูกได้เพราะเป็นเจ้าของจริง', async () => {
  await pool.query("INSERT INTO todos (username, title, password, completed) VALUES ('fb', 'fb@test.com', 'uid-facebook', false)");
  firebaseTokens.t = { uid: 'uid-facebook', email: 'fb@test.com', email_verified: false };

  const res = await socialLogin('t');

  assert.equal(res.status, 200);
  assert.equal(await uidOf('fb@test.com'), 'uid-facebook');
});

test('social: เคยผูก UID แล้ว -> เข้าบัญชีเดิมได้แม้อีเมลจาก provider ไม่ยืนยัน', async () => {
  await pool.query("UPDATE todos SET firebase_uid = 'uid-pos' WHERE username = 'pos1'");
  firebaseTokens.t = { uid: 'uid-pos', email: 'pos@test.com', email_verified: false };

  const res = await socialLogin('t');

  assert.equal(res.status, 200);
  assert.equal(res.body.user.username, 'pos1');
});

test('re-auth ด้วย Firebase: ต้องเป็นบัญชีเดียวกัน (UID หรืออีเมลที่ยืนยันแล้ว) และเพิ่งยืนยันตัวตน', async () => {
  const admin = await login('admin@test.com', 'Admin@1234');
  const check = (firebaseToken: string) => api('POST', '/api/verify-password', { firebaseToken }, admin);

  firebaseTokens.verified = { uid: 'x', email: 'admin@test.com', email_verified: true };
  firebaseTokens.unverified = { uid: 'y', email: 'admin@test.com', email_verified: false };
  firebaseTokens.stale = { uid: 'z', email: 'admin@test.com', email_verified: true, auth_time: Math.floor(Date.now() / 1000) - 3600 };

  assert.equal((await check('verified')).body.valid, true);
  assert.equal((await check('unverified')).body.valid, false);
  assert.equal((await check('stale')).body.valid, false);
  assert.equal((await check('forged')).body.valid, false);
});
