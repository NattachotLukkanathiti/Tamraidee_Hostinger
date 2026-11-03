import { Injectable } from '@angular/core';

export interface CartLine {
  sku: string;
  quantity: number;
}

const STORAGE_KEY = 'shopCart';

// ตะกร้าของหน้าร้าน: เก็บแค่ SKU + จำนวน (ราคา/ชื่อดึงจากข้อมูลสินค้าล่าสุดเสมอ) และจำไว้ใน localStorage
@Injectable({ providedIn: 'root' })
export class ShopCartService {
  lines: CartLine[] = this.load();

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
      this.lines = others;
    } else if (existing === -1) {
      this.lines = [...this.lines, { sku, quantity }];
    } else {
      this.lines = this.lines.map(line => (line.sku === sku ? { sku, quantity } : line));
    }
    this.save();
  }

  remove(sku: string): void {
    this.setQuantity(sku, 0);
  }

  clear(): void {
    this.lines = [];
    this.save();
  }

  private load(): CartLine[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed)
        ? parsed.filter(l => typeof l?.sku === 'string' && Number.isInteger(l?.quantity) && l.quantity > 0)
        : [];
    } catch {
      return []; // ไม่มี localStorage (prerender ฝั่ง server / private mode) หรือข้อมูลเสีย
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.lines));
    } catch {
      // เก็บไม่ได้ก็ยังใช้ตะกร้าในหน้านี้ได้ตามปกติ
    }
  }
}
