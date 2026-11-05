/// ///////////////////////////////////////////////////////////////////////////
/// PHUMALIN API: ระบบวัตถุดิบ แยก "ร้านบน" (upper) และ "ร้านล่าง" (lower)
/// - ใช้ตารางใหม่ phumalin_item / phumalin_movement (migrations/009_phumalin.sql)
/// - ไม่แตะ API / ตารางเดิมเลย
/// - เลิกใช้เมื่อไหร่: ลบไฟล์นี้ + ลบบล็อก "/// PHUMALIN" ใน src/app.ts
/// ///////////////////////////////////////////////////////////////////////////
///
/// GET    /api/phumalin/:store/items                 รายการวัตถุดิบของร้าน
/// POST   /api/phumalin/:store/items                 เพิ่มวัตถุดิบ { name, unit, category, quantity, note }
/// PUT    /api/phumalin/:store/items/:id             แก้วัตถุดิบ (แก้คงเหลือ = บันทึกเป็น adjust)
/// DELETE /api/phumalin/:store/items/:id             ลบวัตถุดิบ (ประวัติยังอยู่)
/// POST   /api/phumalin/:store/items/:id/stock-in    เติมจำนวน { quantity, note }
/// POST   /api/phumalin/:store/withdraw              เบิกหลายรายการจากหน้า POS { items: [{ id, quantity }], note }
/// GET    /api/phumalin/:store/movements?limit=500   ประวัติเติม / เบิก / แก้ยอด ล่าสุดก่อน
///
/// :store = upper | lower

import { Router, Request, Response } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../database/db';
import { requireRole } from '../middleware/auth';
import { actorName, dbErrorMessage } from '../lib/helpers';

const router = Router();

/// ---------- ค่าคงที่ ----------

/// สิทธิ์ให้ตรงกับหน้าเดิม: Dashboard = admin/manager, Inventory = + backend, POS = + pos
const STAFF = ['admin', 'manager', 'pos', 'backend'];
const STOCK_EDITORS = ['admin', 'manager', 'backend'];
const WITHDRAWERS = ['admin', 'manager', 'pos'];

const STORES = ['upper', 'lower'] as const;
type Store = typeof STORES[number];

/// ผัก / เนื้อสัตว์ / ของแห้ง / บรรจุภัณฑ์
const CATEGORIES = ['vegetable', 'meat', 'dry', 'packaging'];

const MAX_QUANTITY = 9_999_999;

/// ---------- ตัวช่วย ----------

function storeOf(req: Request, res: Response): Store | null {
  const store = String(req.params.store || '').toLowerCase();
  if ((STORES as readonly string[]).includes(store)) return store as Store;
  res.status(400).json({ success: false, message: 'Unknown store. Use upper or lower.' });
  return null;
}

/// numeric ของ Postgres ส่งมาเป็น string แปลงเป็นตัวเลขก่อนส่งกลับ
function toItem(row: any) {
  return { ...row, quantity: Number(row.quantity) };
}

function toMovement(row: any) {
  return {
    ...row,
    quantity: Number(row.quantity),
    balance: row.balance === null ? null : Number(row.balance)
  };
}

/// จำนวนทศนิยมไม่เกิน 2 ตำแหน่ง; allowZero = รับ 0 ได้ (เช่นคงเหลือตอนเพิ่มวัตถุดิบ)
function parseQuantity(value: unknown, allowZero: boolean): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num > MAX_QUANTITY) return null;
  if (!allowZero && num === 0) return null;
  return Math.round(num * 100) / 100;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function itemInput(body: any) {
  return {
    name: text(body?.name),
    unit: text(body?.unit),
    category: text(body?.category),
    note: text(body?.note) || null
  };
}

function itemError(input: ReturnType<typeof itemInput>): string | null {
  if (!input.name) return 'Please enter a name.';
  if (!input.unit) return 'Please enter a unit.';
  if (!CATEGORIES.includes(input.category)) return 'Please choose a category.';
  if (input.name.length > 120 || input.unit.length > 30 || (input.note?.length ?? 0) > 500) return 'Some values are too long.';
  return null;
}

function itemSaveError(res: Response, error: unknown) {
  if ((error as { code?: string })?.code === '23505') {
    return res.status(409).json({ success: false, message: 'This item already exists in this store.' });
  }
  console.error('Phumalin item error:', error);
  return res.status(500).json({ success: false, message: dbErrorMessage(error) });
}

async function insertMovement(client: PoolClient | typeof pool, store: Store, item: any, movement: {
  type: 'in' | 'out' | 'adjust'; quantity: number; balance: number; orderCode?: string | null; note?: string | null; createdBy?: string;
}) {
  await client.query(
    `INSERT INTO phumalin_movement (store, item_id, item_name, unit, category, type, quantity, balance, order_code, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [store, item.id, item.name, item.unit, item.category, movement.type, movement.quantity, movement.balance,
      movement.orderCode ?? null, movement.note ?? null, movement.createdBy ?? null]
  );
}

/// รหัสการเบิก เช่น UP-482913 (ร้านบน) / LO-482913 (ร้านล่าง)
function withdrawCode(store: Store) {
  return `${store === 'upper' ? 'UP' : 'LO'}-${String(Date.now()).slice(-6)}`;
}

/// ---------- /// GET รายการวัตถุดิบ ----------
router.get('/api/phumalin/:store/items', requireRole(...STAFF), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;
  try {
    const result = await pool.query(
      'SELECT * FROM phumalin_item WHERE store = $1 ORDER BY updated_at DESC, id DESC',
      [store]
    );
    res.json(result.rows.map(toItem));
  } catch (error) {
    console.error('Phumalin items error:', error);
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  }
});

/// ---------- /// POST เพิ่มวัตถุดิบ ----------
router.post('/api/phumalin/:store/items', requireRole(...STOCK_EDITORS), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;

  const input = itemInput(req.body);
  const invalid = itemError(input);
  if (invalid) return res.status(400).json({ success: false, message: invalid });

  const quantity = parseQuantity(req.body?.quantity ?? 0, true);
  if (quantity === null) return res.status(400).json({ success: false, message: 'Remaining must be 0 or more.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const createdBy = actorName(req, req.body?.created_by);
    const result = await client.query(
      `INSERT INTO phumalin_item (store, name, unit, category, quantity, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [store, input.name, input.unit, input.category, quantity, input.note, createdBy]
    );
    const item = result.rows[0];
    if (quantity > 0) {
      await insertMovement(client, store, item, { type: 'in', quantity, balance: quantity, note: 'New item', createdBy });
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: toItem(item) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    itemSaveError(res, error);
  } finally {
    client.release();
  }
});

/// ---------- /// PUT แก้วัตถุดิบ ----------
router.put('/api/phumalin/:store/items/:id', requireRole(...STOCK_EDITORS), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;

  const input = itemInput(req.body);
  const invalid = itemError(input);
  if (invalid) return res.status(400).json({ success: false, message: invalid });

  const hasQuantity = req.body?.quantity !== undefined;
  const quantity = hasQuantity ? parseQuantity(req.body.quantity, true) : null;
  if (hasQuantity && quantity === null) return res.status(400).json({ success: false, message: 'Remaining must be 0 or more.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      'SELECT * FROM phumalin_item WHERE id = $1 AND store = $2 FOR UPDATE',
      [Number(req.params.id), store]
    );
    if (current.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    const before = toItem(current.rows[0]);
    const nextQuantity = quantity ?? before.quantity;

    const result = await client.query(
      `UPDATE phumalin_item SET name = $1, unit = $2, category = $3, note = $4, quantity = $5, updated_at = now()
       WHERE id = $6 RETURNING *`,
      [input.name, input.unit, input.category, input.note, nextQuantity, before.id]
    );
    const item = result.rows[0];

    /// แก้ยอดคงเหลือตรง ๆ: เก็บส่วนต่างไว้ในประวัติ (adjust)
    if (nextQuantity !== before.quantity) {
      await insertMovement(client, store, item, {
        type: 'adjust',
        quantity: Math.round((nextQuantity - before.quantity) * 100) / 100,
        balance: nextQuantity,
        note: 'Edited remaining',
        createdBy: actorName(req)
      });
    }
    await client.query('COMMIT');
    res.json({ success: true, data: toItem(item) });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    itemSaveError(res, error);
  } finally {
    client.release();
  }
});

/// ---------- /// DELETE ลบวัตถุดิบ ----------
router.delete('/api/phumalin/:store/items/:id', requireRole(...STOCK_EDITORS), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;
  try {
    const result = await pool.query(
      'DELETE FROM phumalin_item WHERE id = $1 AND store = $2 RETURNING id',
      [Number(req.params.id), store]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true });
  } catch (error) {
    console.error('Phumalin delete error:', error);
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  }
});

/// ---------- /// POST เติมจำนวน (Add Quantity) ----------
router.post('/api/phumalin/:store/items/:id/stock-in', requireRole(...STOCK_EDITORS), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;

  const quantity = parseQuantity(req.body?.quantity, false);
  if (quantity === null) return res.status(400).json({ success: false, message: 'Quantity must be more than 0.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE phumalin_item SET quantity = quantity + $1, updated_at = now()
       WHERE id = $2 AND store = $3 AND quantity + $1 <= $4 RETURNING *`,
      [quantity, Number(req.params.id), store, MAX_QUANTITY]
    );
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }
    const item = toItem(result.rows[0]);
    await insertMovement(client, store, item, {
      type: 'in', quantity, balance: item.quantity, note: text(req.body?.note) || null, createdBy: actorName(req)
    });
    await client.query('COMMIT');
    res.json({ success: true, data: item });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Phumalin stock-in error:', error);
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  } finally {
    client.release();
  }
});

/// ---------- /// POST เบิกวัตถุดิบ (หน้า POS) ----------
/// ของไม่พอแม้รายการเดียว = ยกเลิกทั้งหมด ไม่ตัดรายการอื่น
router.post('/api/phumalin/:store/withdraw', requireRole(...WITHDRAWERS), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;

  const raw: any[] = Array.isArray(req.body?.items) ? req.body.items : [];
  const wanted = new Map<number, number>();
  for (const entry of raw) {
    const id = Number(entry?.id);
    const quantity = parseQuantity(entry?.quantity, false);
    if (!Number.isInteger(id) || quantity === null) {
      return res.status(400).json({ success: false, message: 'Each item needs a quantity more than 0.' });
    }
    wanted.set(id, Math.round(((wanted.get(id) ?? 0) + quantity) * 100) / 100);
  }
  if (wanted.size === 0) return res.status(400).json({ success: false, message: 'Please add at least one item.' });

  const note = text(req.body?.note) || null;
  const createdBy = actorName(req);
  const orderCode = withdrawCode(store);
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    /// ล็อกตามลำดับ id กันเบิกพร้อมกันหลายเครื่องแล้ว deadlock / ติดลบ
    const locked = await client.query(
      'SELECT * FROM phumalin_item WHERE store = $1 AND id = ANY($2::int[]) ORDER BY id FOR UPDATE',
      [store, ids]
    );
    if (locked.rowCount !== ids.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Some items no longer exist. Please reload.' });
    }

    const short = locked.rows.map(toItem).find((item) => item.quantity < wanted.get(item.id)!);
    if (short) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Not enough ${short.name}: ${short.quantity} ${short.unit} left.`
      });
    }

    const updated = [];
    for (const row of locked.rows) {
      const quantity = wanted.get(row.id)!;
      const result = await client.query(
        'UPDATE phumalin_item SET quantity = quantity - $1, updated_at = now() WHERE id = $2 RETURNING *',
        [quantity, row.id]
      );
      const item = toItem(result.rows[0]);
      await insertMovement(client, store, item, { type: 'out', quantity, balance: item.quantity, orderCode, note, createdBy });
      updated.push(item);
    }
    await client.query('COMMIT');
    res.json({ success: true, order_code: orderCode, items: updated });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Phumalin withdraw error:', error);
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  } finally {
    client.release();
  }
});

/// ---------- /// GET ประวัติการเคลื่อนไหว ----------
router.get('/api/phumalin/:store/movements', requireRole(...STAFF), async (req, res) => {
  const store = storeOf(req, res);
  if (!store) return;
  const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);
  try {
    const result = await pool.query(
      'SELECT * FROM phumalin_movement WHERE store = $1 ORDER BY created_at DESC, id DESC LIMIT $2',
      [store, limit]
    );
    res.json(result.rows.map(toMovement));
  } catch (error) {
    console.error('Phumalin movements error:', error);
    res.status(500).json({ success: false, message: dbErrorMessage(error) });
  }
});

export default router;
/// /////////////////////////// END PHUMALIN API ///////////////////////////////
