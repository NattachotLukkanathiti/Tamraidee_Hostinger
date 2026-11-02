import { fakeAsync, tick } from '@angular/core/testing';
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
});
