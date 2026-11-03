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
const { setFirebaseVerifierForTests, signToken } = require('../src/middleware/auth') as typeof import('../src/middleware/auth');

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
  await pool.query(sql('migrations/005_shop_cart.sql'));
  await pool.query(sql('migrations/006_shop_payment.sql'));
  for (const key of Object.keys(firebaseTokens)) delete firebaseTokens[key];
  await pool.query(`
    INSERT INTO todos (username, title, password, completed, role, national_id) VALUES
      ('admin1', 'admin@test.com', 'Admin@1234', false, 'admin', '1111'),
      ('pos1', 'pos@test.com', 'Pos@12345', false, 'pos', '2222'),
      ('cust1', 'cust@test.com', 'Cust@1234', false, 'user', '3333'),
      ('cust2', 'cust2@test.com', 'Cust@1234', false, 'user', '4444');
    INSERT INTO settings (email, phone, address) VALUES ('shop@test.com', '081-111-2222', 'Bangkok');
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
test('shop best sellers: เรียงตามจำนวนที่ขายได้ ไม่นับที่ยกเลิก เปิดได้โดยไม่ต้อง login และไม่ส่งยอดขาย', async () => {
  await pool.query(`
    INSERT INTO sale_order (order_code, product_name, quantity, amount, status) VALUES
      ('O1', 'Apple', 2, 200, 'Completed'),
      ('O2', 'Banana', 3, 150, 'Completed'),
      ('O3', 'Apple', 5, 500, 'Canceled'),
      ('O4', 'Deleted product', 9, 900, 'Completed');
  `);

  const res = await api('GET', '/api/shop/best-sellers');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { skus: ['SKU-B', 'SKU-A'] });
});

// token ของผู้ใช้ตาม username (ไม่ผ่าน /api/login เพื่อไม่ชน rate limit ของการ login)
const tokenFor = async (username: string) =>
  signToken({ id: (await pool.query('SELECT id FROM todos WHERE username = $1', [username])).rows[0].id });

const shopOrder = (body: Record<string, unknown>, token?: string) => api('POST', '/api/shop/orders', {
  customer_name: 'ลูกค้า ทดสอบ', phone: '081-234-5678', address: 'กรุงเทพฯ', ...body
}, token);

const SLIP = 'data:image/png;base64,iVBORw0KGgo=';

test('shop order: ต้อง login คิดราคาจาก DB ไม่ตัดสต็อก รอชำระเงิน และส่งเบอร์ PromptPay ของร้าน', async () => {
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-A', quantity: 1 }] })).status, 401);

  const cust = await tokenFor('cust1');
  const res = await shopOrder({ items: [{ sku: 'SKU-A', quantity: 2, price: 1 }, { sku: 'SKU-A', quantity: 1 }] }, cust);

  assert.equal(res.status, 201);
  assert.match(res.body.order.order_code, /^WEB-\d{6}$/);
  assert.equal(res.body.order.total, 300);
  assert.equal(res.body.order.status, 'Awaiting Payment');
  assert.equal(res.body.promptpay_id, '0811112222');
  assert.equal(await stock('SKU-A'), 5);

  const order = (await pool.query('SELECT phone, items, user_id FROM shop_order')).rows[0];
  assert.deepEqual([order.phone, order.items[0].quantity], ['0812345678', 3]);
  assert.ok(order.user_id);
  // ยังไม่จ่าย ยังไม่ต้องแจ้งพนักงาน
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM notification')).rows[0].n, 0);
});

test('shop order: ข้อมูลไม่ครบ / ของไม่พอ / ไม่มีสินค้า / ร้านยังไม่ตั้ง PromptPay ถูกปฏิเสธและไม่สร้างออเดอร์', async () => {
  const cust = await tokenFor('cust1');
  assert.equal((await shopOrder({ phone: '12', items: [{ sku: 'SKU-A', quantity: 1 }] }, cust)).status, 400);
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-B', quantity: 2 }] }, cust)).status, 409);
  assert.equal((await shopOrder({ items: [{ sku: 'NOPE', quantity: 1 }] }, cust)).status, 409);
  await pool.query("UPDATE settings SET phone = ''");
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-A', quantity: 1 }] }, cust)).status, 503);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM shop_order')).rows[0].n, 0);
});

test('shop order: สั่งถี่เกินไปได้ 429 (นับแยกตามบัญชี)', async () => {
  const cust = await tokenFor('cust2');
  for (let i = 0; i < 5; i++) assert.equal((await shopOrder({ items: [] }, cust)).status, 400);
  assert.equal((await shopOrder({ items: [{ sku: 'SKU-A', quantity: 1 }] }, cust)).status, 429);
  assert.equal((await shopOrder({ items: [] }, await tokenFor('admin1'))).status, 400); // บัญชีอื่นยังสั่งได้
});

test('shop payment: แนบสลิป -> พนักงานยืนยัน -> ตัดสต็อกและบันทึกยอดขาย / แต่ละบัญชีเห็นเฉพาะออเดอร์ตัวเอง', async () => {
  const cust = await tokenFor('cust1');
  const other = await tokenFor('cust2');
  const pos = await tokenFor('pos1');
  const created = (await api('GET', '/api/shop/orders/mine', undefined, cust)).body;
  assert.deepEqual(created, { orders: [], promptpay_id: '0811112222' });

  // ใส่ออเดอร์ตรง ๆ (endpoint สั่งซื้อมี rate limit)
  const id = (await pool.query(
    `INSERT INTO shop_order (user_id, customer_name, phone, address, items, total)
     VALUES ((SELECT id FROM todos WHERE username = 'cust1'), 'ลูกค้า', '0812345678', 'กรุงเทพฯ', $1, 300) RETURNING id`,
    [JSON.stringify([{ sku: 'SKU-A', product_name: 'Apple', price: 100, quantity: 3 }])]
  )).rows[0].id;

  const mine = await api('GET', '/api/shop/orders/mine', undefined, cust);
  assert.deepEqual(mine.body.orders.map((o: any) => [o.id, o.status, o.has_slip]), [[id, 'Awaiting Payment', false]]);
  assert.equal(mine.body.orders[0].slip, undefined);
  assert.deepEqual((await api('GET', '/api/shop/orders/mine', undefined, other)).body.orders, []);

  // ยังไม่จ่าย พนักงานยืนยันไม่ได้ (ต้องมีสลิปก่อน)
  assert.equal((await api('POST', `/api/shop/admin/orders/${id}/confirm`, {}, pos)).status, 409);

  // คนอื่นแนบสลิปแทนไม่ได้ / ไฟล์ที่ไม่ใช่รูปไม่รับ
  assert.equal((await api('POST', `/api/shop/orders/${id}/slip`, { slip: SLIP }, other)).status, 409);
  assert.equal((await api('POST', `/api/shop/orders/${id}/slip`, { slip: 'data:text/html;base64,PGh0bWw+' }, cust)).status, 400);

  const paid = await api('POST', `/api/shop/orders/${id}/slip`, { slip: SLIP }, cust);
  assert.equal(paid.status, 200);
  assert.equal(paid.body.order.status, 'Verifying');
  const notice = (await pool.query('SELECT title FROM notification')).rows[0];
  assert.ok(notice.title.includes(paid.body.order.order_code));
  // ส่งสลิปแล้วยกเลิกเองไม่ได้
  assert.equal((await api('POST', `/api/shop/orders/${id}/cancel`, {}, cust)).status, 409);

  // ลูกค้าเข้า endpoint ของพนักงานไม่ได้
  assert.equal((await api('GET', '/api/shop/admin/orders', undefined, cust)).status, 403);
  assert.equal((await api('POST', `/api/shop/admin/orders/${id}/confirm`, {}, cust)).status, 403);

  const list = await api('GET', '/api/shop/admin/orders?status=Verifying', undefined, pos);
  assert.deepEqual(list.body.orders.map((o: any) => o.id), [id]);
  assert.equal((await api('GET', '/api/shop/admin/orders?status=Nope', undefined, pos)).status, 400);
  assert.equal((await api('GET', `/api/shop/admin/orders/${id}/slip`, undefined, pos)).body.slip, SLIP);

  const confirmed = await api('POST', `/api/shop/admin/orders/${id}/confirm`, {}, pos);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.order.status, 'Completed');
  assert.equal(confirmed.body.order.reviewed_by, 'pos1');
  assert.equal(await stock('SKU-A'), 2);
  const sale = (await pool.query('SELECT order_code, quantity, amount, status, create_by FROM sale_order')).rows;
  assert.deepEqual(sale.map(r => [r.order_code, r.quantity, Number(r.amount), r.status, r.create_by]),
    [[confirmed.body.order.order_code, 3, 300, 'Completed', 'pos1']]);
  // สต็อกเหลือ 2 ถึงเกณฑ์แจ้งเตือน (2)
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM notification WHERE type = 'warning'")).rows[0].n, 1);

  // ยืนยันซ้ำไม่ตัดสต็อกซ้ำ
  assert.equal((await api('POST', `/api/shop/admin/orders/${id}/confirm`, {}, pos)).status, 409);
  assert.equal(await stock('SKU-A'), 2);
  assert.equal((await api('GET', '/api/shop/orders/mine', undefined, cust)).body.orders[0].status, 'Completed');
});

test('shop payment: สลิปไม่ผ่าน -> ลูกค้าเห็นเหตุผล แนบใหม่หรือยกเลิกได้ / ของไม่พอตอนยืนยันไม่ตัดสต็อก', async () => {
  const cust = await tokenFor('cust1');
  const admin = await tokenFor('admin1');
  const insert = async (items: unknown[], total: number) => (await pool.query(
    `INSERT INTO shop_order (user_id, customer_name, phone, address, items, total)
     VALUES ((SELECT id FROM todos WHERE username = 'cust1'), 'ลูกค้า', '0812345678', 'กรุงเทพฯ', $1, $2) RETURNING id`,
    [JSON.stringify(items), total]
  )).rows[0].id;

  const id = await insert([{ sku: 'SKU-A', product_name: 'Apple', price: 100, quantity: 1 }], 100);
  await api('POST', `/api/shop/orders/${id}/slip`, { slip: SLIP }, cust);
  assert.equal((await api('POST', `/api/shop/admin/orders/${id}/reject`, { reason: ' ' }, admin)).status, 400);
  const rejected = await api('POST', `/api/shop/admin/orders/${id}/reject`, { reason: 'Amount does not match' }, admin);
  assert.equal(rejected.body.order.status, 'Rejected');
  assert.equal((await api('GET', '/api/shop/orders/mine', undefined, cust)).body.orders[0].reject_reason, 'Amount does not match');
  assert.equal((await api('POST', `/api/shop/admin/orders/${id}/confirm`, {}, admin)).status, 409);

  const again = await api('POST', `/api/shop/orders/${id}/slip`, { slip: SLIP }, cust);
  assert.deepEqual([again.body.order.status, again.body.order.reject_reason], ['Verifying', null]);

  const toCancel = await insert([{ sku: 'SKU-A', product_name: 'Apple', price: 100, quantity: 1 }], 100);
  const canceled = await api('POST', `/api/shop/orders/${toCancel}/cancel`, {}, cust);
  assert.equal(canceled.body.order.status, 'Canceled');
  assert.equal((await api('POST', `/api/shop/orders/${toCancel}/slip`, { slip: SLIP }, cust)).status, 409);

  // ของไม่พอ: ยกเลิกทั้งออเดอร์ ไม่ตัดสินค้าอื่น และออเดอร์ยังรอตรวจอยู่
  const short = await insert([
    { sku: 'SKU-A', product_name: 'Apple', price: 100, quantity: 1 },
    { sku: 'SKU-B', product_name: 'Banana', price: 50, quantity: 2 }
  ], 200);
  await api('POST', `/api/shop/orders/${short}/slip`, { slip: SLIP }, cust);
  const failed = await api('POST', `/api/shop/admin/orders/${short}/confirm`, {}, admin);
  assert.equal(failed.status, 409);
  assert.match(failed.body.message, /Banana/);
  assert.deepEqual([await stock('SKU-A'), await stock('SKU-B')], [5, 1]);
  assert.equal((await pool.query('SELECT status FROM shop_order WHERE id = $1', [short])).rows[0].status, 'Verifying');
});

test('shop cart: ต้อง login และแต่ละบัญชีเห็นเฉพาะตะกร้าของตัวเอง', async () => {
  assert.equal((await api('GET', '/api/shop/cart')).status, 401);
  assert.equal((await api('PUT', '/api/shop/cart', { items: [] })).status, 401);

  const admin = await login('admin@test.com', 'Admin@1234');
  const pos = await login('pos@test.com', 'Pos@12345');
  assert.deepEqual((await api('GET', '/api/shop/cart', undefined, admin)).body, { items: [] });

  const saved = await api('PUT', '/api/shop/cart', {
    items: [{ sku: 'SKU-A', quantity: 2 }, { sku: 'SKU-A', quantity: 98 }, { sku: 'SKU-B', quantity: 1 }]
  }, admin);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.items, [{ sku: 'SKU-A', quantity: 99 }, { sku: 'SKU-B', quantity: 1 }]);

  assert.deepEqual((await api('GET', '/api/shop/cart', undefined, admin)).body.items, saved.body.items);
  assert.deepEqual((await api('GET', '/api/shop/cart', undefined, pos)).body, { items: [] });

  await api('PUT', '/api/shop/cart', { items: [] }, admin);
  assert.deepEqual((await api('GET', '/api/shop/cart', undefined, admin)).body, { items: [] });

  // ข้อมูลไม่ถูกต้องถูกปฏิเสธ (รวมไว้ใน test เดียวกัน เพราะ login มี rate limit)
  const put = (items: unknown) => api('PUT', '/api/shop/cart', { items }, admin);

  assert.equal((await put('nope')).status, 400);
  assert.equal((await put([{ sku: 'SKU-A', quantity: 0 }])).status, 400);
  assert.equal((await put([{ sku: 'SKU-A', quantity: 1.5 }])).status, 400);
  assert.equal((await put([{ sku: '', quantity: 1 }])).status, 400);
  assert.equal((await put(Array.from({ length: 51 }, (_, i) => ({ sku: `S${i}`, quantity: 1 })))).status, 400);
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
