import { Component, inject } from '@angular/core';
import { PhumalinState } from './phumalin-state.service';
import { PhumalinDashboardComponent } from './phumalin-dashboard/phumalin-dashboard.component';
import { PhumalinInventoryComponent } from './phumalin-inventory/phumalin-inventory.component';
import { PhumalinPosComponent } from './phumalin-pos/phumalin-pos.component';

/// ///////////////////////////////////////////////////////////////////////////
/// PHUMALIN: หน้าวัตถุดิบ แยกโหมด ร้านบน / ร้านล่าง (route /phumalin)
/// หน้าย่อย Dashboard / Inventory / Pos หน้าตาเดียวกับหน้าเดิม (copy CSS มาทั้งไฟล์)
/// ไม่ใช้ component / service ของหน้าเดิม เลิกใช้: ลบโฟลเดอร์นี้ + route "/// PHUMALIN" ใน app.routes.ts
/// ///////////////////////////////////////////////////////////////////////////
@Component({
  selector: 'app-phumalin',
  standalone: true,
  imports: [PhumalinDashboardComponent, PhumalinInventoryComponent, PhumalinPosComponent],
  providers: [PhumalinState],
  template: `
    @switch (state.view()) {
      @case ('dashboard') { <app-phumalin-dashboard /> }
      @case ('inventory') { <app-phumalin-inventory /> }
      @default { <app-phumalin-pos /> }
    }
  `,
  // ไม่ใช้ OnPush: หน้าย่อยเป็น change detection แบบเดิม (เหมือนหน้าเดิม) ต้องถูกเช็คตามปกติ
  styles: [':host { display: block; }']
})
export class PhumalinComponent {
  readonly state = inject(PhumalinState);
}
