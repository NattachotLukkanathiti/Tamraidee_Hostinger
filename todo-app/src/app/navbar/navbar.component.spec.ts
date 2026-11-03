import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  it('สร้างได้ โดยแถบแจ้งเตือนเริ่มต้นเป็นปิด', () => {
    const { component } = setUpPage(NavbarComponent);

    expect(component).toBeTruthy();
    expect(component.noti_in).toBeFalse();
  });

  it('openNotifications: เปิดแถบ แล้วไปหน้าแจ้งเตือนพร้อมข้อมูลผู้ใช้', fakeAsync(() => {
    const { component, router } = setUpPage(NavbarComponent);
    component.username = 'somchai';
    component.email = 'somchai@test.com';
    component.userRole = 'admin';
    component.profile = 'p.png';

    component.openNotifications();
    expect(component.noti_in).toBeTrue();
    tick(500);

    expect(router.navigate).toHaveBeenCalledWith(['/notification'], {
      state: jasmine.objectContaining({ username: 'somchai', email: 'somchai@test.com', Move_returns3: true, role: 'admin' })
    });
    expect(component.noti_in).toBeFalse();
  }));

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(NavbarComponent)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(NavbarComponent);
        component.noti_in = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.noti_in).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  describe('ปุ่มไปหน้าร้าน (เฉพาะพนักงาน)', () => {
    afterEach(() => localStorage.clear());

    const login = (role: string) =>
      TestBed.inject(AuthService).setSession('t', { id: 1, username: 'boss', title: 'b@test.com', role });

    it('แอดมิน: เมนูบัญชีมี Online Shop กดแล้วไปหน้า /shop', () => {
      const { component, router, fixture } = setUpPage(NavbarComponent);
      login('admin');

      expect(component.canOpenShop).toBeTrue();
      component.toggleAccountMenu();
      fixture.detectChanges();
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.open-shop')!.click();

      expect(router.navigate).toHaveBeenCalledWith(['/shop']);
    });

    it('pos / backend: เห็นปุ่มไปหน้าร้านเหมือนกัน', () => {
      const { component } = setUpPage(NavbarComponent);
      login('pos');

      expect(component.canOpenShop).toBeTrue();
    });

    it('ไม่ใช่พนักงาน (แม้ history.state จะบอกว่าเป็น admin): ไม่เห็นปุ่มและไปหน้าร้านไม่ได้', () => {
      const { component, router } = setUpPage(NavbarComponent);
      login('customer');

      component.openShop();

      expect(component.canOpenShop).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalledWith(['/shop']);
    });
  });
});
