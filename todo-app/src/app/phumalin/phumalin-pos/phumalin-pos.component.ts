import { Component, DestroyRef, ElementRef, HostListener, ViewChild, effect, inject, untracked } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhumalinService } from '../phumalin.service';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinSwitchComponent } from '../phumalin-switch/phumalin-switch.component';
import {
  PHUMALIN_ALL_ICON, PHUMALIN_CATEGORIES, PhumalinCategory, PhumalinItem, PhumalinStore,
  categoryIcon, categoryLabel, formatQty, itemImage, storeLabel, useCategoryIcon
} from '../phumalin.models';

interface CategoryCard {
  id: PhumalinCategory | 'all';
  label: string;
  count: number;
  icon: string;
  /// ไอคอนสำรองถ้ารูปสินค้าโหลดไม่ได้
  fallback?: string;
}

const MAX_QUANTITY = 9_999_999;

interface CartItem {
  item: PhumalinItem;
  quantity: number;
}

/// PHUMALIN Pos: หน้าตาเดียวกับ POS เดิม จิ้มสินค้าเพื่อเพิ่มลงรายการ แล้วกดยืนยัน = เพิ่มจำนวนเข้าสต็อกของร้านที่เลือก
/// (ไม่มีราคา / ไม่มีชำระเงิน / ไม่ใช่การเบิก)
@Component({
  selector: 'app-phumalin-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, PhumalinSwitchComponent],
  templateUrl: './phumalin-pos.component.html',
  styleUrls: ['./phumalin-pos.component.css', '../phumalin-extra.css']
})
export class PhumalinPosComponent {
  @ViewChild('categoryRow') categoryRow?: ElementRef<HTMLElement>;

  private readonly api = inject(PhumalinService);
  readonly state = inject(PhumalinState);

  readonly categoryLabel = categoryLabel;
  readonly categoryIcon = categoryIcon;
  readonly itemImage = itemImage;
  readonly useCategoryIcon = useCategoryIcon;
  readonly formatQty = formatQty;
  readonly storeLabel = storeLabel;

  items: PhumalinItem[] = [];
  categories: CategoryCard[] = [];
  selectedCategory: CategoryCard['id'] = 'all';
  searchTerm = '';
  loadError = '';

  cartItems: CartItem[] = [];
  note = '';
  orderCode = '-';

  showConfirm = false;
  outimport = false;
  isLoading = false;
  saveError = '';
  successCode = '';

  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    effect(() => {
      const store = this.state.store();
      untracked(() => {
        // คนละร้านคนละสต็อก: สลับร้านแล้วล้างรายการที่เลือกไว้
        this.resetOrder();
        this.orderCode = '-';
        this.items = [];
        this.load(store);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.timers.forEach(clearTimeout);
      this.body.classList.remove('pm-cart-lock');
    });
  }

  load(store: PhumalinStore = this.state.store()): void {
    this.api.getItems(store).subscribe({
      next: (items) => {
        if (store !== this.state.store()) return;
        this.items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        this.loadError = '';
        this.buildCategories();
        // ใช้คงเหลือล่าสุด และตัดรายการที่ถูกลบไปแล้วออก
        this.cartItems = this.cartItems
          .map((entry) => {
            const item = this.items.find((i) => i.id === entry.item.id);
            return item ? { item, quantity: entry.quantity } : null;
          })
          .filter((entry): entry is CartItem => !!entry);
      },
      error: (err) => (this.loadError = err?.error?.message || 'โหลดรายการสินค้าไม่สำเร็จ กรุณาลองใหม่')
    });
  }

  /// รูปของแต่ละหมวด = รูปสินค้าชิ้นแรกในหมวดที่มีลิงก์รูป (เหมือน POS เดิมที่ใช้รูปสินค้าชิ้นแรก)
  /// แสดงเฉพาะหมวดที่มีสินค้า / "ทั้งหมด" แสดงเสมอ ใช้รูปสินค้าชิ้นแรกที่มีรูป / ไม่มีสินค้าที่มีรูปเลย ใช้ไอคอนหมวดแทน
  private buildCategories(): void {
    const firstPicture = (list: PhumalinItem[]) => list.find((item) => itemImage(item) !== categoryIcon(item.category));
    const allPicture = firstPicture(this.items);
    this.categories = [
      { id: 'all', label: 'ทั้งหมด', count: this.items.length, icon: allPicture ? itemImage(allPicture) : PHUMALIN_ALL_ICON },
      ...PHUMALIN_CATEGORIES.map((cat) => {
        const inCategory = this.items.filter((item) => item.category === cat.id);
        const withPicture = firstPicture(inCategory);
        return {
          id: cat.id,
          label: cat.label,
          count: inCategory.length,
          icon: withPicture ? itemImage(withPicture) : cat.icon,
          fallback: cat.icon
        };
      }).filter((cat) => cat.count > 0) // หมวดที่ไม่มีสินค้าไม่ต้องแสดง (เหมือน POS เดิม)
    ];
    // หมวดที่เลือกไว้ไม่มีสินค้าแล้ว (เช่นสลับร้าน / ลบสินค้า) กลับไปทั้งหมด
    if (!this.categories.some((cat) => cat.id === this.selectedCategory)) this.selectedCategory = 'all';
  }

  get filteredProducts(): PhumalinItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.items.filter((item) =>
      (this.selectedCategory === 'all' || item.category === this.selectedCategory) &&
      (!query || `${item.name} ${categoryLabel(item.category)} ${item.note ?? ''}`.toLowerCase().includes(query)));
  }

  selectCategory(category: CategoryCard): void {
    this.selectedCategory = category.id;
  }

  scrollLeft(element: HTMLElement): void {
    element.scrollBy({ left: -200, behavior: 'smooth' });
  }

  scrollRight(element: HTMLElement): void {
    element.scrollBy({ left: 200, behavior: 'smooth' });
  }

  // ---------- รายการที่จะเพิ่ม ----------

  /// มือถือ (≤ 900px): รายการเปิด / ปิดจากปุ่มตะกร้ามุมขวาล่าง (จอกว้างแสดงอยู่ด้านขวาตลอด)
  cartOpen = false;
  private readonly body = inject(DOCUMENT).body;

  toggleCart(): void {
    this.setCart(!this.cartOpen);
  }

  closeCart(): void {
    this.setCart(false);
  }

  /// เปิดรายการอยู่: ล็อกการเลื่อนหน้าข้างหลัง ให้แผงติดจอและเลื่อนได้เฉพาะในแผง
  private setCart(open: boolean): void {
    this.cartOpen = open;
    this.body.classList.toggle('pm-cart-lock', open);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.showConfirm) this.closeCart();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.cartOpen && window.innerWidth > 900) this.closeCart();
  }

  get itemCount(): number {
    return this.cartItems.length;
  }

  getCartQuantity(id: number): number {
    return this.cartItems.find((entry) => entry.item.id === id)?.quantity ?? 0;
  }

  /// จิ้มสินค้า = เพิ่มทีละ 1 (ของหมดก็กดเพิ่มได้)
  addToCart(item: PhumalinItem): void {
    const entry = this.cartItems.find((e) => e.item.id === item.id);
    if (entry) entry.quantity = Math.min(entry.quantity + 1, MAX_QUANTITY);
    else this.cartItems = [...this.cartItems, { item, quantity: 1 }];
  }

  changeQuantity(entry: CartItem, change: number): void {
    const next = Math.round((entry.quantity + change) * 100) / 100;
    if (next <= 0) {
      this.removeFromCart(entry);
      return;
    }
    entry.quantity = Math.min(next, MAX_QUANTITY);
  }

  /// พิมพ์จำนวนเองได้ (เช่น 0.5 กก.) ค่าที่ไม่ใช่ตัวเลข / ติดลบไม่รับ
  setQuantity(entry: CartItem, value: number | string | null): void {
    const quantity = Number(value);
    if (value === null || value === '' || !Number.isFinite(quantity) || quantity <= 0) return;
    entry.quantity = Math.min(Math.round(quantity * 100) / 100, MAX_QUANTITY);
  }

  /// คงเหลือหลังเพิ่ม
  totalAfter(entry: CartItem): number {
    return Math.round((entry.item.quantity + entry.quantity) * 100) / 100;
  }

  removeFromCart(entry: CartItem): void {
    this.cartItems = this.cartItems.filter((e) => e !== entry);
  }

  clearOrder(): void {
    this.cartItems = [];
  }

  resetOrder(): void {
    this.searchTerm = '';
    this.selectedCategory = 'all';
    this.note = '';
    this.cartItems = [];
  }

  viewActivity(): void {
    this.state.go('dashboard');
  }


  // ---------- ยืนยันเพิ่มสินค้า ----------

  openConfirm(): void {
    if (!this.cartItems.length) return;
    this.saveError = '';
    this.successCode = '';
    this.outimport = false;
    this.showConfirm = true;
  }

  closeConfirm(): void {
    if (this.isLoading) return;
    this.outimport = true;
    this.timers.push(setTimeout(() => {
      this.outimport = false;
      this.showConfirm = false;
      this.successCode = '';
    }, 300));
  }

  confirmRestock(): void {
    if (!this.cartItems.length || this.isLoading) return;
    const store = this.state.store();
    this.isLoading = true;
    this.saveError = '';
    this.api.restock(store, this.cartItems.map((e) => ({ id: e.item.id, quantity: e.quantity })), this.note.trim()).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successCode = res.order_code;
        this.orderCode = res.order_code;
        this.cartItems = [];
        this.note = '';
        this.load(store);
        // ให้เห็นข้อความสำเร็จสักครู่แล้วปิดเอง (เหมือนหน้า POS เดิมที่รอ 1.5 วินาที)
        this.timers.push(setTimeout(() => this.closeConfirm(), 1500));
      },
      error: (err) => {
        this.isLoading = false;
        this.saveError = err?.error?.message || 'เพิ่มสินค้าไม่สำเร็จ กรุณาลองใหม่';
        this.load(store); // เผื่อมีสินค้าถูกลบไประหว่างนั้น
      }
    });
  }
}
