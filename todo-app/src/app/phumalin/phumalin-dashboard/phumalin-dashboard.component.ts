import { Component, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { PhumalinService } from '../phumalin.service';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinSwitchComponent } from '../phumalin-switch/phumalin-switch.component';
import {
  PHUMALIN_CATEGORIES, PhumalinItem, PhumalinMovement, PhumalinStore, categoryIcon, categoryLabel, formatQty, itemImage, storeLabel, thaiDateTime
} from '../phumalin.models';

type Range = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y';
type ActivityFilter = 'last-7-days' | 'last-30-days' | 'all';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const CHART_HEIGHT = 300;

/// PHUMALIN Dashboard: หน้าตาเดียวกับ Dashboard เดิม แต่สรุปการเบิก / เติมวัตถุดิบของร้านที่เลือก
@Component({
  selector: 'app-phumalin-dashboard',
  standalone: true,
  imports: [CommonModule, PhumalinSwitchComponent],
  templateUrl: './phumalin-dashboard.component.html',
  styleUrls: ['./phumalin-dashboard.component.css', '../phumalin-extra.css']
})
export class PhumalinDashboardComponent {
  private readonly api = inject(PhumalinService);
  readonly state = inject(PhumalinState);

  readonly storeLabel = storeLabel;
  readonly categoryLabel = categoryLabel;
  readonly categoryIcon = categoryIcon;
  readonly formatQty = formatQty;
  readonly thaiDateTime = thaiDateTime;

  readonly dateRanges: Range[] = ['1D', '1W', '1M', '3M', '6M', '1Y'];
  readonly rangeLabels: Record<Range, string> = { '1D': 'วันนี้', '1W': '7วัน', '1M': '1เดือน', '3M': '3เดือน', '6M': '6เดือน', '1Y': '1ปี' };
  readonly heatmapDays = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
  readonly heatmapTimes = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  loader = true;
  errorMessage = '';
  items: PhumalinItem[] = [];
  movements: PhumalinMovement[] = [];

  summary = { withdrawalsToday: 0, addedToday: 0, outOfStock: 0, items: 0 };

  selectedRange: Range = '1Y';
  chart: { label: string; value: number }[] = [];
  chartMax = 0;
  totalWithdrawals = 0;

  currentWeekOffset = 0;
  currentWeekRange = '';
  private weekly: Record<string, number> = {};

  activityFilter: ActivityFilter = 'last-7-days';
  currentPage = 1;
  readonly itemsPerPage = 5;

  categoryUsage: { name: string; percent: number }[] = [];
  topItems: { name: string; count: number; image: string }[] = [];

  constructor() {
    effect(() => {
      const store = this.state.store();
      untracked(() => {
        this.loader = true;
        this.load(store);
      });
    });
  }

  load(store: PhumalinStore = this.state.store()): void {
    forkJoin({ items: this.api.getItems(store), movements: this.api.getMovements(store, 2000) }).subscribe({
      next: ({ items, movements }) => {
        if (store !== this.state.store()) return;
        this.items = items;
        this.movements = movements;
        this.errorMessage = '';
        this.compute();
        this.loader = false;
      },
      error: (err) => {
        this.loader = false;
        this.errorMessage = err?.error?.message || 'โหลดข้อมูลแดชบอร์ดไม่สำเร็จ';
      }
    });
  }

  private get withdrawals(): PhumalinMovement[] {
    return this.movements.filter((move) => move.type === 'out');
  }

  private compute(): void {
    const today = new Date().toDateString();
    const isToday = (move: PhumalinMovement) => new Date(move.created_at).toDateString() === today;
    const todayOrders = new Set(this.withdrawals.filter(isToday).map((move) => move.order_code ?? move.id));

    this.summary = {
      withdrawalsToday: todayOrders.size,
      addedToday: this.movements.filter((move) => move.type === 'in' && isToday(move)).length,
      outOfStock: this.items.filter((item) => item.quantity <= 0).length,
      items: this.items.length
    };

    this.selectRange(this.selectedRange);
    this.updateWeekly();
    this.computeCategoryUsage();
    this.computeTopItems();
    this.currentPage = 1;
  }

  // ---------- กราฟการเบิก (จำนวนรายการที่เบิกในแต่ละช่วง) ----------

  selectRange(range: Range): void {
    this.selectedRange = range;
    const now = new Date();
    const maxDays = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 }[range];
    const inRange = this.withdrawals.filter((move) => (now.getTime() - new Date(move.created_at).getTime()) / DAY_MS <= maxDays);

    const labels: string[] = [];
    if (range === '1D') {
      labels.push(now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }));
    } else if (range === '1W') {
      for (let i = 6; i >= 0; i--) labels.push(DAYS[new Date(now.getTime() - i * DAY_MS).getDay()]);
    } else if (range === '1Y') {
      labels.push(...MONTHS);
    } else {
      const count = { '1M': 1, '3M': 3, '6M': 6 }[range];
      for (let i = count - 1; i >= 0; i--) labels.push(MONTHS[(now.getMonth() - i + 12) % 12]);
    }

    const counts: Record<string, number> = Object.fromEntries(labels.map((label) => [label, 0]));
    for (const move of inRange) {
      const date = new Date(move.created_at);
      let label = MONTHS[date.getMonth()];
      if (range === '1D') label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
      else if (range === '1W') label = DAYS[date.getDay()];
      if (label in counts) counts[label] += 1;
    }

    this.totalWithdrawals = inRange.length;
    this.chart = labels.map((label) => ({ label, value: counts[label] }));
    this.chartMax = Math.max(0, ...this.chart.map((bar) => bar.value));
  }

  /// แกน Y 7 ระดับเหมือนกราฟเดิม (60K ... 0) แต่คิดจากค่าสูงสุดจริง
  get axisLabels(): string[] {
    const top = Math.max(6, Math.ceil(this.chartMax / 6) * 6);
    return Array.from({ length: 7 }, (_, i) => this.formatK(top - (top / 6) * i));
  }

  barHeight(value: number): number {
    const top = Math.max(6, Math.ceil(this.chartMax / 6) * 6);
    return (value / top) * CHART_HEIGHT;
  }

  formatK(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(Math.round(value));
  }

  // ---------- Weekly heatmap (จำนวนรายการที่เบิก 10:00 - 17:00) ----------

  changeWeek(offset: number): void {
    this.currentWeekOffset += offset;
    this.updateWeekly();
  }

  private updateWeekly(): void {
    const now = new Date();
    const day = now.getDay();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + (day === 0 ? -6 : 1) + this.currentWeekOffset * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
    const fmt = (date: Date) => date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
    this.currentWeekRange = `${fmt(start)} - ${fmt(end)}`;

    this.weekly = {};
    for (const move of this.withdrawals) {
      const date = new Date(move.created_at);
      if (date < start || date > end) continue;
      const hour = date.getHours();
      if (hour < 10 || hour > 17) continue;
      const key = `${DAYS[date.getDay()]}-${hour}`;
      this.weekly[key] = (this.weekly[key] ?? 0) + 1;
    }
  }

  heatLevel(day: string, slot: number): number {
    const count = this.weekly[`${day}-${10 + slot}`] ?? 0;
    if (count > 10) return 3;
    if (count > 5) return 2;
    if (count > 0) return 1;
    return 0;
  }

  // ---------- Recent activity (แทนตาราง Sale Order) ----------

  setActivityFilter(value: string): void {
    this.activityFilter = value as ActivityFilter;
    this.currentPage = 1;
  }

  get activity(): PhumalinMovement[] {
    if (this.activityFilter === 'all') return this.movements;
    const days = this.activityFilter === 'last-7-days' ? 7 : 30;
    const since = Date.now() - days * DAY_MS;
    return this.movements.filter((move) => new Date(move.created_at).getTime() >= since);
  }

  get paginatedActivity(): PhumalinMovement[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.activity.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.activity.length / this.itemsPerPage));
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  movementLabel(move: PhumalinMovement): string {
    const labels = { in: 'เพิ่ม', out: 'เบิก', adjust: 'แก้ยอด' } as const;
    return labels[move.type];
  }

  movementQty(move: PhumalinMovement): string {
    const negative = move.type === 'out' || move.quantity < 0;
    return `${negative ? '-' : '+'}${formatQty(Math.abs(move.quantity))} ${move.unit ?? ''}`.trim();
  }

  // ---------- หมวดหมู่ที่เบิกบ่อย (แทน Supplier Performance) / Top 5 ----------

  private computeCategoryUsage(): void {
    const counts = new Map<string, number>();
    for (const move of this.withdrawals) {
      if (move.category) counts.set(move.category, (counts.get(move.category) ?? 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    this.categoryUsage = PHUMALIN_CATEGORIES
      .filter((cat) => counts.has(cat.id))
      .map((cat) => ({ name: cat.label, percent: Math.round(((counts.get(cat.id) ?? 0) / max) * 100) }))
      .sort((a, b) => b.percent - a.percent);
  }

  private computeTopItems(): void {
    const counts = new Map<string, { name: string; count: number; image: string }>();
    for (const move of this.withdrawals) {
      const entry = counts.get(move.item_name) ?? { name: move.item_name, count: 0, image: itemImage(this.items.find((item) => item.id === move.item_id) ?? move) };
      entry.count += 1;
      counts.set(move.item_name, entry);
    }
    this.topItems = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }

  printPage(): void {
    window.print();
  }
}
