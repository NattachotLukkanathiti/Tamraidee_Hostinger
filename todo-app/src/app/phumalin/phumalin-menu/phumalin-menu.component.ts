import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinView } from '../phumalin.models';

const CLOSE_MS = 300;

/// เมนูแฮมเบอร์เกอร์ของ phumalin (จอ ≤ 1200px) หน้าตาเดียวกับเมนูมือถือของ navbar เดิม
/// แต่ลิสต์เฉพาะหน้าย่อยของ phumalin: เพิ่มสินค้า / แดชบอร์ด / คลังสินค้า
@Component({
  selector: 'app-phumalin-menu',
  standalone: true,
  templateUrl: './phumalin-menu.component.html',
  styleUrl: './phumalin-menu.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhumalinMenuComponent {
  readonly state = inject(PhumalinState);
  readonly open = signal(false);
  readonly closing = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  toggle(): void {
    if (this.open()) this.close();
    else {
      clearTimeout(this.timer);
      this.closing.set(false);
      this.open.set(true);
    }
  }

  close(): void {
    if (!this.open() || this.closing()) return;
    this.closing.set(true);
    this.timer = setTimeout(() => {
      this.open.set(false);
      this.closing.set(false);
    }, CLOSE_MS);
  }

  pick(view: PhumalinView): void {
    this.state.go(view);
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  /// ขยายจอกลับเกิน 1200px (เมนูบนกลับมา) ให้ปิดเมนูไปเลย
  @HostListener('window:resize')
  onResize(): void {
    if (this.open() && window.innerWidth > 1200) {
      this.open.set(false);
      this.closing.set(false);
    }
  }
}
