import { fakeAsync, tick } from '@angular/core/testing';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { EmployeeComponent } from './employee.component';

describe('EmployeeComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลดรายชื่อพนักงาน', () => {
      const { fixture, component, todo } = setUpPage(EmployeeComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(component.userRole).toBe('admin');
      expect(todo.getTodoss).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(EmployeeComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      expect(component.out).toBeFalse();
      fixture.destroy();
    });

    const returnStates: [string, Record<string, unknown>, Partial<Record<'play_Return' | 'out' | 'stan', boolean>>][] = [
      ['Move_return', { Move_return: true }, { play_Return: true, out: false, stan: false }],
      ['Move_return2', { Move_return2: true }, { play_Return: true, out: false, stan: false }],
      ['Move_return4', { Move_return4: true }, { play_Return: false, out: false, stan: false }],
      ['Move_returnout', { Move_returnout: true }, { play_Return: true }]
    ];

    for (const [name, extra, expected] of returnStates) {
      it(`กลับมาจากหน้าอื่นด้วย ${name}: ตั้งค่า animation ให้ถูกต้อง`, () => {
        const { fixture, component } = setUpPage(EmployeeComponent, { username: 'somchai', email: 's@test.com', ...extra });

        fixture.detectChanges();

        for (const [key, value] of Object.entries(expected)) {
          expect((component as unknown as Record<string, unknown>)[key]).withContext(key).toBe(value);
        }
        fixture.destroy();
      });
    }

    it('ไม่มี session: แจ้งเตือนและไม่โหลดข้อมูล', () => {
      const { fixture, component, todo } = setUpPage(EmployeeComponent, {});

      fixture.detectChanges();

      expect(component.showpopupnoti).toBeTrue();
      expect(todo.getTodoss).not.toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(EmployeeComponent, true)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(EmployeeComponent);
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });
});
