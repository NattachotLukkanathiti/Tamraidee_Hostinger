/// PHUMALIN API test (ร้านบน / ร้านล่าง) — แยกไฟล์จาก api.test.ts เลิกใช้ระบบนี้ก็ลบไฟล์นี้ได้เลย
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AddressInfo } from 'node:net';
import { Server } from 'node:http';

if (process.env.DATABASE_URL || !/test$/.test(process.env.DB_NAME || '')) {
  throw new Error('API tests ต้องใช้ DB_* ที่ชี้ไปฐานข้อมูลทดสอบ (DB_NAME ลงท้ายด้วย "test") และห้ามตั้ง DATABASE_URL');
}
process.env.JWT_SECRET ||= 'test-secret';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { pool } = require('../src/database/db') as typeof import('../src/database/db');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { signToken } = require('../src/middleware/auth') as typeof import('../src/middleware/auth');

let server: Server;
let base = '';
const sql = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

async function api(method: string, url: string, body?: unknown, token?: string) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const textBody = await res.text();
  let json: any = textBody;
  try { json = JSON.parse(textBody); } catch { /* ไม่ใช่ JSON */ }
  return { status: res.status, body: json };
}

async function tokenFor(username: string) {
  const { rows } = await pool.query('SELECT id FROM todos WHERE username = $1', [username]);
  return signToken({ id: rows[0].id });
}

const remaining = async (id: number) =>
  Number((await pool.query('SELECT quantity FROM phumalin_item WHERE id = $1', [id])).rows[0].quantity);

before(() => {
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

beforeEach(async () => {
  await pool.query('DROP TABLE IF EXISTS phumalin_movement, phumalin_item');
  await pool.query(sql('tests/schema.sql'));
  await pool.query(sql('migrations/001_auth.sql'));
  await pool.query(sql('migrations/009_phumalin.sql'));
  await pool.query(sql('migrations/010_phumalin_picture.sql'));
  await pool.query(`
    INSERT INTO todos (username, title, password, completed, role, national_id) VALUES
      ('admin1', 'admin@test.com', 'x', false, 'admin', '1111'),
      ('pos1', 'pos@test.com', 'x', false, 'pos', '2222'),
      ('back1', 'back@test.com', 'x', false, 'backend', '3333'),
      ('cust1', 'cust@test.com', 'x', false, 'user', '4444');
  `);
});

test('phumalin: เพิ่มวัตถุดิบ / ร้านบนกับร้านล่างแยกกัน / ชื่อซ้ำในร้านเดียวกันไม่ได้', async () => {
  const admin = await tokenFor('admin1');
  const add = await api('POST', '/api/phumalin/upper/items', { name: 'Cabbage', unit: 'kg', category: 'vegetable', quantity: 5, note: 'fresh' }, admin);
  assert.equal(add.status, 201);
  assert.equal(add.body.data.quantity, 5);

  assert.equal((await api('POST', '/api/phumalin/upper/items', { name: 'cabbage', unit: 'kg', category: 'vegetable' }, admin)).status, 409);
  assert.equal((await api('POST', '/api/phumalin/lower/items', { name: 'Cabbage', unit: 'kg', category: 'vegetable' }, admin)).status, 201);

  const upper = await api('GET', '/api/phumalin/upper/items', undefined, admin);
  const lower = await api('GET', '/api/phumalin/lower/items', undefined, admin);
  assert.equal(upper.body.length, 1);
  assert.equal(lower.body.length, 1);
  assert.equal(lower.body[0].quantity, 0);

  assert.equal((await api('POST', '/api/phumalin/upper/items', { name: 'X', unit: 'kg', category: 'fruit' }, admin)).status, 400);
  assert.equal((await api('GET', '/api/phumalin/middle/items', undefined, admin)).status, 400);

  const moves = await api('GET', '/api/phumalin/upper/movements', undefined, admin);
  assert.equal(moves.body.length, 1);
  assert.equal(moves.body[0].type, 'in');
});

test('phumalin: เติมจำนวน / เบิกหลายรายการ ของไม่พอยกเลิกทั้งหมด / เบิกข้ามร้านไม่ได้', async () => {
  const admin = await tokenFor('admin1');
  const pos = await tokenFor('pos1');
  const pork = (await api('POST', '/api/phumalin/upper/items', { name: 'Pork', unit: 'kg', category: 'meat', quantity: 2 }, admin)).body.data;
  const box = (await api('POST', '/api/phumalin/upper/items', { name: 'Box', unit: 'pcs', category: 'packaging', quantity: 10 }, admin)).body.data;

  const stockIn = await api('POST', `/api/phumalin/upper/items/${pork.id}/stock-in`, { quantity: 1.5 }, admin);
  assert.equal(stockIn.status, 200);
  assert.equal(await remaining(pork.id), 3.5);
  assert.equal((await api('POST', `/api/phumalin/upper/items/${pork.id}/stock-in`, { quantity: 0 }, admin)).status, 400);

  const tooMuch = await api('POST', '/api/phumalin/upper/withdraw', { items: [{ id: box.id, quantity: 1 }, { id: pork.id, quantity: 9 }] }, pos);
  assert.equal(tooMuch.status, 409);
  assert.equal(await remaining(box.id), 10);

  assert.equal((await api('POST', '/api/phumalin/lower/withdraw', { items: [{ id: pork.id, quantity: 1 }] }, pos)).status, 404);

  const ok = await api('POST', '/api/phumalin/upper/withdraw', { items: [{ id: pork.id, quantity: 1 }, { id: box.id, quantity: 3 }] }, pos);
  assert.equal(ok.status, 200);
  assert.match(ok.body.order_code, /^UP-\d{6}$/);
  assert.equal(await remaining(pork.id), 2.5);
  assert.equal(await remaining(box.id), 7);

  const outs = (await api('GET', '/api/phumalin/upper/movements', undefined, admin)).body.filter((m: any) => m.type === 'out');
  assert.equal(outs.length, 2);
  assert.equal(outs[0].created_by, 'pos1');
});

test('phumalin: เพิ่มสินค้าหลายรายการจากหน้า POS / ของที่ไม่มีในร้านนี้ไม่เพิ่มเลยทั้งชุด', async () => {
  const admin = await tokenFor('admin1');
  const pos = await tokenFor('pos1');
  const back = await tokenFor('back1');
  const egg = (await api('POST', '/api/phumalin/upper/items', { name: 'Egg', unit: 'pcs', category: 'meat', quantity: 0 }, admin)).body.data;
  const bag = (await api('POST', '/api/phumalin/upper/items', { name: 'Bag', unit: 'pcs', category: 'packaging', quantity: 5 }, admin)).body.data;
  const other = (await api('POST', '/api/phumalin/lower/items', { name: 'Egg', unit: 'pcs', category: 'meat' }, admin)).body.data;

  const ok = await api('POST', '/api/phumalin/upper/restock', { items: [{ id: egg.id, quantity: 30 }, { id: bag.id, quantity: 2.5 }], note: 'market' }, pos);
  assert.equal(ok.status, 200);
  assert.match(ok.body.order_code, /^UP-IN-\d{6}$/);
  assert.equal(await remaining(egg.id), 30);
  assert.equal(await remaining(bag.id), 7.5);

  assert.equal((await api('POST', '/api/phumalin/upper/restock', { items: [{ id: egg.id, quantity: 1 }, { id: other.id, quantity: 1 }] }, pos)).status, 404);
  assert.equal(await remaining(egg.id), 30);
  assert.equal((await api('POST', '/api/phumalin/upper/restock', { items: [{ id: egg.id, quantity: 0 }] }, pos)).status, 400);
  assert.equal((await api('POST', '/api/phumalin/upper/restock', { items: [{ id: egg.id, quantity: 1 }] }, back)).status, 200);

  const ins = (await api('GET', '/api/phumalin/upper/movements', undefined, admin)).body.filter((m: any) => m.order_code === ok.body.order_code);
  assert.equal(ins.length, 2);
  assert.ok(ins.every((m: any) => m.type === 'in' && m.note === 'market'));
});

test('phumalin: ใส่ลิงก์รูปได้ (http/https เท่านั้น) / แก้ไขเปลี่ยนรูปได้', async () => {
  const admin = await tokenFor('admin1');
  const pic = 'https://cdn.test/cabbage.jpg';
  const add = await api('POST', '/api/phumalin/upper/items', { name: 'Cabbage', unit: 'kg', category: 'vegetable', picture: pic }, admin);
  assert.equal(add.status, 201);
  assert.equal(add.body.data.picture, pic);
  assert.equal((await api('POST', '/api/phumalin/upper/items', { name: 'Bad', unit: 'kg', category: 'vegetable', picture: 'javascript:alert(1)' }, admin)).status, 400);

  const edit = await api('PUT', `/api/phumalin/upper/items/${add.body.data.id}`, { name: 'Cabbage', unit: 'kg', category: 'vegetable', picture: '' }, admin);
  assert.equal(edit.body.data.picture, null);
});

test('phumalin: รีเซ็ตสต็อกเป็น 0 เฉพาะร้านที่เลือก / บันทึกยอดเดิมเป็น adjust', async () => {
  const admin = await tokenFor('admin1');
  const a = (await api('POST', '/api/phumalin/upper/items', { name: 'A', unit: 'kg', category: 'dry', quantity: 4 }, admin)).body.data;
  const b = (await api('POST', '/api/phumalin/upper/items', { name: 'B', unit: 'kg', category: 'dry', quantity: 0 }, admin)).body.data;
  const c = (await api('POST', '/api/phumalin/lower/items', { name: 'A', unit: 'kg', category: 'dry', quantity: 7 }, admin)).body.data;

  const res = await api('POST', '/api/phumalin/upper/reset-stock');
  assert.equal(res.status, 200);
  assert.equal(res.body.reset, 1);
  assert.match(res.body.order_code, /^UP-RESET-\d{6}$/);
  assert.equal(await remaining(a.id), 0);
  assert.equal(await remaining(b.id), 0);
  assert.equal(await remaining(c.id), 7); // ร้านล่างไม่โดน

  const adjust = (await api('GET', '/api/phumalin/upper/movements')).body.find((m: any) => m.order_code === res.body.order_code);
  assert.equal(adjust.type, 'adjust');
  assert.equal(adjust.quantity, -4);
  assert.equal(adjust.balance, 0);
});

test('phumalin: แก้คงเหลือบันทึก adjust / ลบแล้วประวัติยังอยู่ / ไม่ต้อง login', async () => {
  const admin = await tokenFor('admin1');
  const pos = await tokenFor('pos1');
  const back = await tokenFor('back1');
  const cust = await tokenFor('cust1');
  const rice = (await api('POST', '/api/phumalin/lower/items', { name: 'Rice', unit: 'bag', category: 'dry', quantity: 4 }, back)).body.data;

  const edit = await api('PUT', `/api/phumalin/lower/items/${rice.id}`, { name: 'Jasmine rice', unit: 'bag', category: 'dry', quantity: 3, note: 'shelf 2' }, admin);
  assert.equal(edit.status, 200);
  assert.equal(edit.body.data.name, 'Jasmine rice');
  const adjust = (await api('GET', '/api/phumalin/lower/movements', undefined, admin)).body.find((m: any) => m.type === 'adjust');
  assert.equal(adjust.quantity, -1);

  // ไม่ต้อง login / ไม่ตรวจ role: ทุก role และคนที่ไม่ได้ login ใช้ได้
  assert.equal((await api('POST', '/api/phumalin/lower/items', { name: 'Salt', unit: 'kg', category: 'dry' }, pos)).status, 201);
  assert.equal((await api('GET', '/api/phumalin/lower/items', undefined, cust)).status, 200);
  assert.equal((await api('GET', '/api/phumalin/lower/items')).status, 200);
  const anon = await api('POST', '/api/phumalin/lower/restock', { items: [{ id: rice.id, quantity: 1 }] });
  assert.equal(anon.status, 200);
  assert.equal(await remaining(rice.id), 4);
  // API อื่นยังต้อง login เหมือนเดิม
  assert.equal((await api('GET', '/api/inventory')).status, 401);

  assert.equal((await api('DELETE', `/api/phumalin/lower/items/${rice.id}`, undefined, admin)).status, 200);
  const history = (await api('GET', '/api/phumalin/lower/movements', undefined, admin)).body;
  assert.ok(history.length >= 2);
  assert.equal(history[0].item_id, null);
});
