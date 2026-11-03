import { Injectable, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ShopCartItem, TodoService } from '../services/todo.service';

export type CartLine = ShopCartItem;

const STORAGE_KEY = 'shopCart'; // ตะกร้าของคนที่ยังไม่ login (บัญชีที่ login ใช้ shopCart:<id> เป็นสำเนาในเครื่อง)
const MAX_QTY_PER_LINE = 99; // ตรงกับ Backend
const SYNC_DELAY_MS = 400;

// ตะกร้าของหน้าร้าน: เก็บแค่ SKU + จำนวน (ราคา/ชื่อดึงจากข้อมูลสินค้าล่าสุดเสมอ)
// - ยังไม่ login: จำไว้ใน localStorage ของเครื่องนี้
// - login แล้ว: ตะกร้าแยกตามบัญชีและเก็บที่เซิร์ฟเวอร์ (login เครื่องไหนก็เห็นตะกร้าเดียวกัน)
//   ของที่ใส่ไว้ก่อน login จะถูกรวมเข้าตะกร้าของบัญชีให้อัตโนมัติ
@Injectable({ providedIn: 'root' })
export class ShopCartService {
  private readonly auth = inject(AuthService);
  private readonly todoService = inject(TodoService);
  private loadedKey?: string;
  private current: CartLine[] = [];
  private loading = false; // กำลังดึงตะกร้าจากเซิร์ฟเวอร์
  private changedWhileLoading = false;
  private syncTimer?: ReturnType<typeof setTimeout>;

  get lines(): CartLine[] {
    this.followOwner();
    return this.current;
  }

  get count(): number {
    return this.lines.reduce((sum, line) => sum + line.quantity, 0);
  }

  quantityOf(sku: string): number {
    return this.lines.find(line => line.sku === sku)?.quantity ?? 0;
  }

  // เพิ่มสินค้าได้ไม่เกินจำนวนในสต็อก คืนจำนวนที่เพิ่มได้จริง
  add(sku: string, quantity: number, stock: number): number {
    const current = this.quantityOf(sku);
    const next = Math.min(current + quantity, stock);
    if (next <= current) return 0;
    this.setQuantity(sku, next);
    return next - current;
  }

  setQuantity(sku: string, quantity: number): void {
    const others = this.lines.filter(line => line.sku !== sku);
    const existing = this.lines.findIndex(line => line.sku === sku);
    if (quantity <= 0) {
      this.current = others;
    } else if (existing === -1) {
      this.current = [...this.lines, { sku, quantity }];
    } else {
      this.current = this.lines.map(line => (line.sku === sku ? { sku, quantity } : line));
    }
    this.save();
  }

  remove(sku: string): void {
    this.setQuantity(sku, 0);
  }

  clear(): void {
    this.followOwner(); // ล้างตะกร้าของบัญชีปัจจุบัน
    this.current = [];
    this.save();
  }

  private storageKey(): string {
    const id = this.auth.isLoggedIn() ? this.auth.user?.id : undefined;
    return id == null ? STORAGE_KEY : `${STORAGE_KEY}:${id}`;
  }

  private followOwner(): void {
    const key = this.storageKey();
    if (key !== this.loadedKey) this.switchTo(key);
  }

  // เปลี่ยนเจ้าของตะกร้า (login / logout / สลับบัญชี): แสดงสำเนาในเครื่องก่อน แล้วค่อยดึงของจริงจากเซิร์ฟเวอร์
  private switchTo(key: string): void {
    clearTimeout(this.syncTimer);
    this.loadedKey = key;
    this.current = this.read(key);
    this.loading = false;
    if (key === STORAGE_KEY) return;

    this.loading = true;
    this.changedWhileLoading = false;
    this.todoService.getShopCart().subscribe({
      next: ({ items }) => this.adopt(key, this.valid(items)),
      error: err => {
        console.error('Failed to load shop cart', err);
        this.adopt(key, this.current); // ใช้สำเนาในเครื่องไปก่อน
      }
    });
  }

  private adopt(key: string, server: CartLine[]): void {
    if (key !== this.loadedKey) return; // สลับบัญชีไปแล้ว
    this.loading = false;
    const base = this.changedWhileLoading ? this.current : server;
    const guest = this.read(STORAGE_KEY);
    this.current = this.merge(base, guest);
    this.write(key, this.current);
    if (guest.length) this.write(STORAGE_KEY, []);
    if (guest.length || this.changedWhileLoading) this.scheduleSync();
  }

  private merge(a: CartLine[], b: CartLine[]): CartLine[] {
    const quantities = new Map<string, number>();
    for (const line of [...a, ...b]) {
      quantities.set(line.sku, Math.min((quantities.get(line.sku) ?? 0) + line.quantity, MAX_QTY_PER_LINE));
    }
    return [...quantities].map(([sku, quantity]) => ({ sku, quantity }));
  }

  private save(): void {
    const key = this.loadedKey ?? this.storageKey();
    this.write(key, this.current);
    if (key === STORAGE_KEY) return;
    if (this.loading) {
      this.changedWhileLoading = true; // รอให้ดึงจากเซิร์ฟเวอร์เสร็จก่อนค่อยส่ง
    } else {
      this.scheduleSync();
    }
  }

  // รวมการแก้ไขที่ถี่ ๆ (กด + หลายครั้ง) เป็นการส่งครั้งเดียว
  private scheduleSync(): void {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.todoService.saveShopCart(this.current).subscribe({
        error: err => console.error('Failed to save shop cart', err)
      });
    }, SYNC_DELAY_MS);
  }

  private valid(value: unknown): CartLine[] {
    return Array.isArray(value)
      ? value.filter(l => typeof l?.sku === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0)
      : [];
  }

  private read(key: string): CartLine[] {
    try {
      return this.valid(JSON.parse(localStorage.getItem(key) ?? '[]'));
    } catch {
      return []; // ไม่มี localStorage (prerender ฝั่ง server / private mode) หรือข้อมูลเสีย
    }
  }

  private write(key: string, lines: CartLine[]): void {
    try {
      if (lines.length) {
        localStorage.setItem(key, JSON.stringify(lines));
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // เก็บไม่ได้ก็ยังใช้ตะกร้าในหน้านี้ได้ตามปกติ
    }
  }
}
