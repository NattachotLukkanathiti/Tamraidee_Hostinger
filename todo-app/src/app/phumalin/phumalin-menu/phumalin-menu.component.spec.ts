import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from '../../services/auth.service';
import { PhumalinState } from '../phumalin-state.service';
import { PhumalinMenuComponent } from './phumalin-menu.component';

describe('PhumalinMenuComponent', () => {
  const open = () => {
    localStorage.removeItem('phumalin_store');
    TestBed.configureTestingModule({
      imports: [PhumalinMenuComponent],
      providers: [PhumalinState, { provide: AuthService, useValue: { user: { username: 'u', role: 'admin' } } }]
    });
    const fixture = TestBed.createComponent(PhumalinMenuComponent);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, state: TestBed.inject(PhumalinState) };
  };

  it('กดแฮมเบอร์เกอร์: เปิดเมนูหน้าย่อยภาษาไทย / กดซ้ำปิด', fakeAsync(() => {
    const { fixture, el } = open();
    const button = el.querySelector<HTMLButtonElement>('.pm-hamburger')!;
    expect(el.querySelector('.pm-ber')).toBeNull();

    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(Array.from(el.querySelectorAll('.pm-ber__link')).map((b) => b.textContent?.trim())).toEqual(['เพิ่มสินค้า', 'แดชบอร์ด', 'คลังสินค้า']);

    button.click();
    fixture.detectChanges();
    expect(el.querySelector('.pm-ber.closing')).not.toBeNull();
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('.pm-ber')).toBeNull();
  }));

  it('เลือกหน้าในเมนู: เปลี่ยนหน้าย่อยและปิดเมนู / Esc ปิดเมนู', fakeAsync(() => {
    const { fixture, el, state } = open();
    el.querySelector<HTMLButtonElement>('.pm-hamburger')!.click();
    fixture.detectChanges();
    Array.from(el.querySelectorAll<HTMLButtonElement>('.pm-ber__link')).find((b) => b.textContent?.includes('คลังสินค้า'))!.click();
    tick(300);
    fixture.detectChanges();
    expect(state.view()).toBe('inventory');
    expect(el.querySelector('.pm-ber')).toBeNull();

    el.querySelector<HTMLButtonElement>('.pm-hamburger')!.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('.pm-ber')).toBeNull();
  }));
});
