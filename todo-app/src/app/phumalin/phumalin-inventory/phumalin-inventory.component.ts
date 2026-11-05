import { Component, DestroyRef, HostListener, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { PhumalinService } from '../phumalin.service';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinSwitchComponent } from '../phumalin-switch/phumalin-switch.component';
import {
  PHUMALIN_CATEGORIES, PhumalinCategory, PhumalinItem, PhumalinItemInput, PhumalinMovement, PhumalinStore,
  categoryIcon, categoryLabel, formatQty, storeLabel
} from '../phumalin.models';

type StockFilter = 'all' | 'out';

const emptyItem = (): PhumalinItemInput => ({ name: '', unit: '', category: '', quantity: null, note: '' });

/// PHUMALIN Inventory: หน้าตาเดียวกับหน้า Inventory เดิม (ใช้ CSS ชุดเดียวกัน)
/// เพิ่มวัตถุดิบ = ชื่อ / หน่วย / หมวดหมู่ / คงเหลือ / หมายเหตุ, Add Quantity = เติมจำนวน
@Component({
  selector: 'app-phumalin-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, PhumalinSwitchComponent],
  templateUrl: './phumalin-inventory.component.html',
  styleUrls: ['./phumalin-inventory.component.css', '../phumalin-extra.css']
})
export class PhumalinInventoryComponent {
  private readonly api = inject(PhumalinService);
  readonly state = inject(PhumalinState);

  readonly categories = PHUMALIN_CATEGORIES;
  readonly categoryLabel = categoryLabel;
  readonly categoryIcon = categoryIcon;
  readonly formatQty = formatQty;
  readonly storeLabel = storeLabel;

  items: PhumalinItem[] = [];
  filteredItems: PhumalinItem[] = [];
  movements: PhumalinMovement[] = [];

  search = '';
  selectedStockFilter: StockFilter = 'all';
  selectedCategory: PhumalinCategory | 'all' = 'all';

  // หน้าละกี่แถวตามความสูงจอ (เหมือนหน้าเดิม)
  itemsPerPage = 10;
  currentPage = 1;
  totalPages = 1;
  private readonly rowHeight = 50;
  private readonly headerHeight = 250;

  loader = true;
  isLoading = false;

  // แผงฟอร์ม (คลาสเดียวกับหน้าเดิม: button_importt = เพิ่มวัตถุดิบ, button_addd = Add Quantity, button_edit = แก้ไข)
  button_importt = false;
  button_addd = false;
  button_edit = false;
  outimport = false;
  formError = '';

  newItem: PhumalinItemInput = emptyItem();
  editItem: PhumalinItemInput & { id?: number } = emptyItem();
  addQty = { itemId: null as number | null, quantity: null as number | null, note: '' };

  // ป๊อปอัป
  showpopup = false;
  showpopupnoti = false;
  showpopupconfirm = false;
  showpopupedit = false;
  popup = '';
  private pendingDelete: PhumalinItem | null = null;

  historyItem: PhumalinItem | null = null;

  private closeTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.calculateRows();
    // เปลี่ยนร้าน = โหลดข้อมูลร้านนั้นใหม่ และปิดฟอร์มที่ค้างอยู่
    effect(() => {
      const store = this.state.store();
      untracked(() => {
        this.closeForms();
        this.loader = true;
        this.load(store);
      });
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.closeTimer));
  }

  @HostListener('window:resize')
  calculateRows(): void {
    const available = (typeof window === 'undefined' ? 800 : window.innerHeight) - this.headerHeight;
    this.itemsPerPage = Math.max(1, Math.floor(available / this.rowHeight));
    this.updatePagination();
  }

  // ---------- โหลด / กรอง ----------

  load(store: PhumalinStore = this.state.store()): void {
    forkJoin({ items: this.api.getItems(store), movements: this.api.getMovements(store) }).subscribe({
      next: ({ items, movements }) => {
        if (store !== this.state.store()) return; // สลับร้านระหว่างโหลด
        this.items = items;
        this.movements = movements;
        this.applyFilters(false);
        this.loader = false;
        this.isLoading = false;
      },
      error: (err) => {
        this.loader = false;
        this.isLoading = false;
        this.openpopupnoti(err?.error?.message || 'Could not load items. Please try again.');
      }
    });
  }

  reloads(): void {
    this.isLoading = true;
    this.load();
  }

  applyFilters(resetPage = true): void {
    const term = this.search.trim().toLowerCase();
    this.filteredItems = this.items.filter((item) => {
      if (this.selectedCategory !== 'all' && item.category !== this.selectedCategory) return false;
      if (this.selectedStockFilter === 'out' && item.quantity > 0) return false;
      if (!term) return true;
      return [item.name, item.unit, item.note ?? '', categoryLabel(item.category)]
        .some((value) => value.toLowerCase().includes(term));
    });
    if (resetPage) this.currentPage = 1;
    this.updatePagination();
  }

  // ---------- แบ่งหน้า (เหมือนหน้าเดิม: แสดงเลขหน้าทีละ 3) ----------

  get paginatedItems(): PhumalinItem[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get visiblePages(): number[] {
    const blockSize = 3;
    const start = Math.floor((this.currentPage - 1) / blockSize) * blockSize + 1;
    const end = Math.min(start + blockSize - 1, this.totalPages);
    const pages: number[] = [];
    for (let page = start; page <= end; page++) pages.push(page);
    return pages;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) this.currentPage = this.totalPages;
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  // ---------- แผงฟอร์ม ----------

  button_imports(): void {
    this.formError = '';
    this.newItem = emptyItem();
    this.outimport = false;
    this.button_importt = true;
  }

  button_adds(): void {
    this.formError = '';
    this.addQty = { itemId: null, quantity: null, note: '' };
    this.outimport = false;
    this.button_addd = true;
  }

  button_editt(item: PhumalinItem): void {
    this.formError = '';
    this.editItem = { id: item.id, name: item.name, unit: item.unit, category: item.category, quantity: item.quantity, note: item.note ?? '' };
    this.outimport = false;
    this.button_edit = true;
  }

  /// ปิดแผงพร้อมอนิเมชันออก (0.4 วินาทีเหมือนหน้าเดิม)
  button_cancels(): void {
    this.outimport = true;
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.closeForms(), 400);
  }

  private closeForms(): void {
    this.button_importt = false;
    this.button_addd = false;
    this.button_edit = false;
    this.outimport = false;
    this.formError = '';
  }

  get selectedAddItem(): PhumalinItem | undefined {
    return this.items.find((item) => item.id === Number(this.addQty.itemId));
  }

  private validate(input: PhumalinItemInput): string {
    if (!input.name.trim() || !input.unit.trim() || !input.category) return 'Please fill in all required fields (*)';
    const quantity = Number(input.quantity);
    if (input.quantity === null || !Number.isFinite(quantity) || quantity < 0) return 'Remaining must be 0 or more';
    return '';
  }

  private payload(input: PhumalinItemInput): PhumalinItemInput {
    return {
      name: input.name.trim(),
      unit: input.unit.trim(),
      category: input.category,
      quantity: Number(input.quantity),
      note: input.note.trim()
    };
  }

  saveNewItem(): void {
    this.formError = this.validate(this.newItem);
    if (this.formError) return;
    const store = this.state.store();
    this.isLoading = true;
    this.api.addItem(store, this.payload(this.newItem)).subscribe({
      next: () => {
        this.closeForms();
        this.openpopup(`New item added to ${storeLabel(store)}`);
        this.load(store);
      },
      error: (err) => {
        this.isLoading = false;
        this.formError = err?.error?.message || 'An error occurred while saving data';
      }
    });
  }

  saveAddQuantity(): void {
    const item = this.selectedAddItem;
    const quantity = Number(this.addQty.quantity);
    if (!item || !Number.isFinite(quantity) || quantity <= 0) {
      this.formError = 'Please fill in all required fields (*)';
      return;
    }
    const store = this.state.store();
    this.isLoading = true;
    this.api.stockIn(store, item.id, quantity, this.addQty.note.trim()).subscribe({
      next: () => {
        this.closeForms();
        this.openpopup(`Added ${formatQty(quantity)} ${item.unit} to ${item.name}`);
        this.load(store);
      },
      error: (err) => {
        this.isLoading = false;
        this.formError = err?.error?.message || 'An error occurred while saving data';
      }
    });
  }

  /// กด Save ในแผงแก้ไข -> ถามยืนยันก่อน (เหมือนหน้าเดิม)
  editt(): void {
    this.formError = this.validate(this.editItem);
    if (this.formError) return;
    this.showpopupedit = true;
    this.popup = 'Are you sure you want to edit this item?';
  }

  saveEdit(): void {
    const id = this.editItem.id;
    if (!id) return;
    const store = this.state.store();
    this.showpopupedit = false;
    this.isLoading = true;
    this.api.updateItem(store, id, this.payload(this.editItem)).subscribe({
      next: () => {
        this.closeForms();
        this.openpopup('Item updated successfully');
        this.load(store);
      },
      error: (err) => {
        this.isLoading = false;
        this.formError = err?.error?.message || 'An error occurred while updating the item';
      }
    });
  }

  button_delete(item: PhumalinItem): void {
    this.pendingDelete = item;
    this.popup = `Delete "${item.name}"? This action cannot be undone.`;
    this.showpopupconfirm = true;
  }

  confirmdelete(): void {
    const item = this.pendingDelete;
    this.showpopupconfirm = false;
    this.pendingDelete = null;
    if (!item) return;
    const store = this.state.store();
    this.isLoading = true;
    this.api.deleteItem(store, item.id).subscribe({
      next: () => {
        this.openpopup('Item deleted successfully');
        this.load(store);
      },
      error: (err) => {
        this.isLoading = false;
        this.openpopupnoti(err?.error?.message || 'An error occurred while deleting the item');
      }
    });
  }

  // ---------- ประวัติของวัตถุดิบ (กดที่แถว) ----------

  showHistory(item: PhumalinItem): void {
    this.historyItem = item;
  }

  get historyRows(): PhumalinMovement[] {
    const id = this.historyItem?.id;
    return id ? this.movements.filter((move) => move.item_id === id).slice(0, 20) : [];
  }

  movementText(move: PhumalinMovement): string {
    // out เก็บเป็นจำนวนบวก, adjust เก็บส่วนต่าง (ติดลบได้)
    const negative = move.type === 'out' || move.quantity < 0;
    return `${negative ? '-' : '+'}${formatQty(Math.abs(move.quantity))}`;
  }

  movementLabel(move: PhumalinMovement): string {
    const labels = { in: 'Add', out: 'Withdraw', adjust: 'Edit' } as const;
    return labels[move.type];
  }

  // ---------- ป๊อปอัป ----------

  openpopup(message: string): void {
    this.popup = message;
    this.showpopup = true;
  }

  openpopupnoti(message: string): void {
    this.popup = message;
    this.showpopupnoti = true;
  }

  closepopup(): void {
    this.showpopup = false;
    this.showpopupnoti = false;
    this.showpopupconfirm = false;
    this.showpopupedit = false;
    this.pendingDelete = null;
  }
}
