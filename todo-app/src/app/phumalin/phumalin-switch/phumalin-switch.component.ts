import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { PhumalinState } from '../phumalin-state.service';
import { PHUMALIN_STORES } from '../phumalin.models';

/// ปุ่มสลับโหมด ร้านบน / ร้านล่าง (+ ปุ่มหน้าย่อยบนจอแคบ ที่แถบเมนูด้านบนถูกซ่อน)
@Component({
  selector: 'app-phumalin-switch',
  standalone: true,
  templateUrl: './phumalin-switch.component.html',
  styleUrl: './phumalin-switch.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhumalinSwitchComponent {
  readonly state = inject(PhumalinState);
  readonly stores = PHUMALIN_STORES;
}
