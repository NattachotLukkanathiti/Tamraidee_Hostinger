import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { PhumalinStore, PhumalinView } from './phumalin.models';

const STORE_KEY = 'phumalin_store';
/// เท่ากับ setTimeout(..., 300) ก่อน router.navigate ในหน้าเดิม
const LEAVE_MS = 300;

/// สถานะของหน้า phumalin: ร้านที่เลือก (บน / ล่าง) และหน้าย่อย (Dashboard / Inventory / Pos)
/// provide ที่ PhumalinComponent จึงมีชุดเดียวต่อการเปิดหน้า
@Injectable()
export class PhumalinState implements OnDestroy {
  private leaveTimer?: ReturnType<typeof setTimeout>;

  /// ลำดับเดียวกับแถบเมนูหน้าเดิม: Pos / Dashboard / Inventory (ชื่อเมนูภาษาไทย)
  /// ไม่ต้อง login: ทุกคนเห็นครบ 3 หน้า
  readonly views: { id: PhumalinView; label: string }[] = [
    { id: 'pos', label: 'เพิ่มสินค้า' },
    { id: 'dashboard', label: 'แดชบอร์ด' },
    { id: 'inventory', label: 'คลังสินค้า' }
  ];

  readonly store = signal<PhumalinStore>(this.readStore());
  readonly view = signal<PhumalinView>('pos');
  /// การเปลี่ยนหน้าแบบหน้าเดิม: กดแล้วเล่นอนิเมชันออก รอ 300ms (setTimeout) แล้วค่อยเปลี่ยนหน้า
  /// แต่ละหน้าใช้คลาสอนิเมชันตามปลายทาง / ต้นทาง เหมือนหน้าเดิม:
  ///   Inventory -> Dashboard/Pos : fade-out + fade-out2 (เลื่อนออกซ้าย)
  ///   Dashboard -> Inventory     : fade-out (เลื่อนออกขวา) / Dashboard -> Pos : fade-out-left (เลื่อนออกซ้าย)
  ///   Pos -> ทุกหน้า              : fade-out-right (เลื่อนออกขวา)
  ///   เข้าหน้า Pos (จากหน้าอื่น) / เข้า Dashboard จาก Inventory : Return (เลื่อนเข้าจากขวา)
  /// หน้าปลายทางระหว่างรอ 300ms (null = ไม่ได้กำลังเปลี่ยนหน้า)
  readonly leavingTo = signal<PhumalinView | null>(null);
  /// หน้าก่อนหน้า (null = เพิ่งเปิดหน้า phumalin)
  readonly cameFrom = signal<PhumalinView | null>(null);
  readonly leaving = computed(() => this.leavingTo() !== null);

  setStore(store: PhumalinStore): void {
    if (store === this.store()) return;
    this.store.set(store);
    try {
      localStorage.setItem(STORE_KEY, store);
    } catch {
      /* เก็บไม่ได้ก็ใช้ได้แค่รอบนี้ */
    }
  }

  go(view: PhumalinView): void {
    if (view === this.view() || this.leaving()) return;
    this.leavingTo.set(view);
    this.leaveTimer = setTimeout(() => {
      this.cameFrom.set(this.view());
      this.view.set(view);
      this.leavingTo.set(null);
    }, LEAVE_MS);
  }

  ngOnDestroy(): void {
    clearTimeout(this.leaveTimer);
  }

  private readStore(): PhumalinStore {
    try {
      return localStorage.getItem(STORE_KEY) === 'lower' ? 'lower' : 'upper';
    } catch {
      return 'upper';
    }
  }
}
