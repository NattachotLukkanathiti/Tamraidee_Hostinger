import { Component, DestroyRef, ElementRef, ViewChild, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PhumalinService } from '../phumalin.service';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinSwitchComponent } from '../phumalin-switch/phumalin-switch.component';
import {
  PHUMALIN_ALL_ICON, PHUMALIN_CATEGORIES, PhumalinCategory, PhumalinItem, PhumalinStore,
  categoryIcon, categoryLabel, formatQty, storeLabel
} from '../phumalin.models';

interface CategoryCard {
  id: PhumalinCategory | 'all';
  label: string;
  count: number;
  icon: string;
}

interface CartItem {
  item: PhumalinItem;
  quantity: number;
}

/// PHUMALIN Pos: หน้าตาเดียวกับ POS เดิม จิ้มวัตถุดิบเพื่อเพิ่มลงรายการ แล้วกดยืนยัน = เบิกออกจากสต็อกของร้านที่เลือก
/// (ไม่มีราคา / ไม่มีชำระเงิน)
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
  withdrawError = '';
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
    inject(DestroyRef).onDestroy(() => this.timers.forEach(clearTimeout));
  }

  load(store: PhumalinStore = this.state.store()): void {
    this.api.getItems(store).subscribe({
      next: (items) => {
        if (store !== this.state.store()) return;
        this.items = [...items].sort((a, b) => a.name.localeCompare(b.name));
        this.loadError = '';
        this.buildCategories();
        // สต็อกเปลี่ยน (เช่นเครื่องอื่นเบิกไป) -> จำนวนในรายการต้องไม่เกินที่เหลือ
        this.cartItems = this.cartItems
          .map((entry) => {
            const item = this.items.find((i) => i.id === entry.item.id);
            return item ? { item, quantity: Math.min(entry.quantity, item.quantity) } : null;
          })
          .filter((entry): entry is CartItem => !!entry && entry.quantity > 0);
      },
      error: (err) => (this.loadError = err?.error?.message || 'Could not load items. Please try again.')
    });
  }

  private buildCategories(): void {
    this.categories = [
      { id: 'all', label: 'All Categories', count: this.items.length, icon: PHUMALIN_ALL_ICON },
      ...PHUMALIN_CATEGORIES.map((cat) => ({
        id: cat.id,
        label: cat.label,
        count: this.items.filter((item) => item.category === cat.id).length,
        icon: cat.icon
      }))
    ];
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

  // ---------- รายการเบิก ----------

  get itemCount(): number {
    return this.cartItems.length;
  }

  getCartQuantity(id: number): number {
    return this.cartItems.find((entry) => entry.item.id === id)?.quantity ?? 0;
  }

  /// จิ้มวัตถุดิบ = เพิ่มทีละ 1 (ไม่เกินคงเหลือ, หมดแล้วกดไม่ได้)
  addToCart(item: PhumalinItem): void {
    if (item.quantity <= 0) return;
    const entry = this.cartItems.find((e) => e.item.id === item.id);
    if (entry) entry.quantity = Math.min(entry.quantity + 1, item.quantity);
    else this.cartItems = [...this.cartItems, { item, quantity: Math.min(1, item.quantity) }];
  }

  changeQuantity(entry: CartItem, change: number): void {
    const next = Math.round((entry.quantity + change) * 100) / 100;
    if (next <= 0) {
      this.removeFromCart(entry);
      return;
    }
    entry.quantity = Math.min(next, entry.item.quantity);
  }

  /// พิมพ์จำนวนเองได้ (เช่น 0.5 กก.) ค่าที่ไม่ใช่ตัวเลข / ติดลบไม่รับ
  setQuantity(entry: CartItem, value: number | string | null): void {
    const quantity = Number(value);
    if (value === null || value === '' || !Number.isFinite(quantity) || quantity <= 0) return;
    entry.quantity = Math.min(Math.round(quantity * 100) / 100, entry.item.quantity);
  }

  remainingAfter(entry: CartItem): number {
    return Math.max(0, Math.round((entry.item.quantity - entry.quantity) * 100) / 100);
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
    this.state.go(this.state.canSee('dashboard') ? 'dashboard' : 'inventory');
  }

  get canViewActivity(): boolean {
    return this.state.canSee('dashboard') || this.state.canSee('inventory');
  }

  // ---------- ยืนยันเบิก ----------

  openConfirm(): void {
    if (!this.cartItems.length) return;
    this.withdrawError = '';
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

  confirmWithdraw(): void {
    if (!this.cartItems.length || this.isLoading) return;
    const store = this.state.store();
    this.isLoading = true;
    this.withdrawError = '';
    this.api.withdraw(store, this.cartItems.map((e) => ({ id: e.item.id, quantity: e.quantity })), this.note.trim()).subscribe({
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
        this.withdrawError = err?.error?.message || 'Could not save this withdrawal. Please try again.';
        this.load(store); // เผื่อเครื่องอื่นเบิกไปก่อน
      }
    });
  }
}
