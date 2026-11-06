import { Component, Injector, OnDestroy, ViewEncapsulation, afterNextRender, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PhumalinState } from './phumalin-state.service';
import { PhumalinDashboardComponent } from './phumalin-dashboard/phumalin-dashboard.component';
import { PhumalinInventoryComponent } from './phumalin-inventory/phumalin-inventory.component';
import { PhumalinPosComponent } from './phumalin-pos/phumalin-pos.component';
import { PhumalinMenuComponent } from './phumalin-menu/phumalin-menu.component';

/// ///////////////////////////////////////////////////////////////////////////
/// PHUMALIN: หน้าวัตถุดิบ แยกโหมด ร้านบน / ร้านล่าง (route /phumalin)
/// หน้าย่อย Dashboard / Inventory / Pos หน้าตาเดียวกับหน้าเดิม (copy CSS มาทั้งไฟล์)
/// ไม่ต้อง login / ไม่ใช้ component / service ของหน้าเดิม เลิกใช้: ลบโฟลเดอร์นี้ + route "/// PHUMALIN" ใน app.routes.ts
/// ///////////////////////////////////////////////////////////////////////////
@Component({
  selector: 'app-phumalin',
  standalone: true,
  imports: [PhumalinDashboardComponent, PhumalinInventoryComponent, PhumalinPosComponent, PhumalinMenuComponent],
  providers: [PhumalinState],
  template: `
    <app-phumalin-menu />
    @switch (state.view()) {
      @case ('dashboard') { <app-phumalin-dashboard /> }
      @case ('inventory') { <app-phumalin-inventory /> }
      @default { <app-phumalin-pos /> }
    }
  `,
  // ไม่ใช้ OnPush: หน้าย่อยเป็น change detection แบบเดิม (เหมือนหน้าเดิม) ต้องถูกเช็คตามปกติ
  styleUrl: './phumalin-global.css',
  /// ไม่ห่อ CSS: ต้องซ่อนเวลา / แจ้งเตือน / โปรไฟล์ ใน navbar กลาง เฉพาะตอนอยู่หน้านี้ (ผ่านคลาสบน body)
  encapsulation: ViewEncapsulation.None
})
export class PhumalinComponent implements OnDestroy {
  readonly state = inject(PhumalinState);
  private readonly document = inject(DOCUMENT);
  private readonly body = this.document.body;
  private readonly injector = inject(Injector);

  constructor() {
    this.body.classList.add('phumalin-page');

    /// เลื่อนขึ้นบนสุดทุกครั้งที่โหลด: เปิดหน้า / เปลี่ยนหน้าย่อย / สลับร้าน
    /// (หน้าเดิมเรียก window.scrollTo({ top: 0, behavior: 'smooth' }) ใน ngOnInit)
    /// รอให้หน้าใหม่ render ก่อน ไม่งั้นเบราว์เซอร์จะเลื่อนตามความสูงของหน้าเก่า
    effect(() => {
      this.state.view();
      this.state.store();
      afterNextRender(() => this.scrollToTop(), { injector: this.injector });
    });
  }

  private scrollToTop(): void {
    this.document.defaultView?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    this.body.classList.remove('phumalin-page');
  }
}
