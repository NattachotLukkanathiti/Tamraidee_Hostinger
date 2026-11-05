import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PhumalinComponent } from './phumalin.component';
import { PhumalinService } from './phumalin.service';
import { createPhumalinApiMock } from './phumalin-test-utils';

describe('PhumalinComponent', () => {
  const open = (role: string) => {
    localStorage.removeItem('phumalin_store');
    const api = createPhumalinApiMock();
    api.getItems.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [PhumalinComponent],
      providers: [
        { provide: PhumalinService, useValue: api },
        { provide: AuthService, useValue: { user: { username: 'u', role } } }
      ]
    });
    const fixture = TestBed.createComponent(PhumalinComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('admin เปิดมาเจอหน้า Pos พร้อมปุ่มร้านบน / ร้านล่าง', () => {
    const el = open('admin');
    expect(el.querySelector('app-phumalin-pos')).not.toBeNull();
    expect(Array.from(el.querySelectorAll('.pm-store')).map((b) => b.textContent?.trim())).toEqual(['ร้านบน', 'ร้านล่าง']);
  });

  it('backend เปิดมาเจอหน้า Inventory', () => {
    expect(open('backend').querySelector('app-phumalin-inventory')).not.toBeNull();
  });
});
