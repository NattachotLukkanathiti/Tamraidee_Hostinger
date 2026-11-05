import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { PHUMALIN_VIEW_ROLES, PhumalinStore, PhumalinView } from './phumalin.models';

const STORE_KEY = 'phumalin_store';

/// สถานะของหน้า phumalin: ร้านที่เลือก (บน / ล่าง) และหน้าย่อย (Dashboard / Inventory / Pos)
/// provide ที่ PhumalinComponent จึงมีชุดเดียวต่อการเปิดหน้า
@Injectable()
export class PhumalinState implements OnDestroy {
  private auth = inject(AuthService);
  private leaveTimer?: ReturnType<typeof setTimeout>;

  readonly username = this.auth.user?.username ?? '';
  readonly role = (this.auth.user?.role ?? '').toLowerCase();

  /// ลำดับเดียวกับแถบเมนูหน้าเดิม: Pos / Dashboard / Inventory
  readonly views: { id: PhumalinView; label: string }[] = ([
    { id: 'pos', label: 'Pos' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'inventory', label: 'Inventory' }
  ] as const).filter((view) => this.canSee(view.id));

  readonly store = signal<PhumalinStore>(this.readStore());
  readonly view = signal<PhumalinView>(this.views[0]?.id ?? 'pos');
  /// true ระหว่างเล่นอนิเมชันออกก่อนเปลี่ยนหน้าย่อย (เหมือนหน้าเดิมที่รอ 300ms ก่อน navigate)
  readonly leaving = signal(false);

  canSee(view: PhumalinView): boolean {
    return PHUMALIN_VIEW_ROLES[view].includes(this.role);
  }

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
    if (view === this.view() || !this.canSee(view) || this.leaving()) return;
    this.leaving.set(true);
    this.leaveTimer = setTimeout(() => {
      this.view.set(view);
      this.leaving.set(false);
    }, 300);
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
