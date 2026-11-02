import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  const setUp = () => {
    const harness = setUpPage(NotificationComponent);
    harness.component.username = 'somchai';
    harness.component.email = 'somchai@test.com';
    harness.component.userRole = 'admin';
    harness.component.profile = 'p.png';
    const markAsRead = spyOn(harness.component, 'markAsRead');
    return { ...harness, markAsRead };
  };

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(NotificationComponent)) {
      it(`${name} เล่น animation แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUp();

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  it('inventory: ไปหน้าสินค้าพร้อมสถานะ form_noti', fakeAsync(() => {
    const { component, router } = setUp();

    component.inventory();
    expect(component.animation).toBeTrue();
    tick(300);

    expect(router.navigate).toHaveBeenCalledWith(['/inventory'], {
      state: jasmine.objectContaining({ form_noti: true, username: 'somchai' })
    });
  }));

  describe('กดที่การแจ้งเตือน', () => {
    it('สต็อกต่ำ: ทำเครื่องหมายว่าอ่านแล้ว แล้วไปหน้าสินค้าพร้อมตัวกรอง Low in Stock', fakeAsync(() => {
      const { component, router, markAsRead } = setUp();
      const item = { id: 1, title: 'Inventory Alert : Apple' };

      component.goToInventory(item);
      expect(component.Animation_out).toBeTrue();
      tick(300);

      expect(markAsRead).toHaveBeenCalledWith(item);
      expect(router.navigate).toHaveBeenCalledWith(['/inventory'], {
        state: jasmine.objectContaining({ username: 'somchai', filterStatus: 'Low in Stock' })
      });
    }));

    const historyCases: [string, { title?: string; message?: string }, string][] = [
      ['อนุมัติ (ใน title)', { title: 'Request Approved' }, 'Approved'],
      ['อนุมัติ (accepted)', { title: 'Accepted by admin' }, 'Approved'],
      ['อนุมัติ (ใน message)', { title: 'Update', message: 'Your request was approved' }, 'Approved'],
      ['ปฏิเสธ', { title: 'Request Rejected' }, 'Rejected'],
      ['ปฏิเสธ (ใน message)', { title: 'Update', message: 'rejected by admin' }, 'Rejected'],
      ['รออนุมัติ', { title: 'Pending Approvals' }, 'Pending'],
      ['รออนุมัติ (ใน message)', { title: 'Update', message: 'still pending' }, 'Pending'],
      ['ไม่ตรงเงื่อนไขใด', { title: 'Hello' }, 'all'],
      ['ไม่มีทั้ง title และ message', {}, 'all']
    ];

    for (const [name, item, expected] of historyCases) {
      it(`ประวัติสต็อก - ${name}: ส่งตัวกรอง ${expected}`, fakeAsync(() => {
        const { component, router, markAsRead } = setUp();

        component.goToHistory(item);
        tick(300);

        expect(markAsRead).toHaveBeenCalledWith(item);
        expect(router.navigate).toHaveBeenCalledWith(['/history'], {
          state: jasmine.objectContaining({ filterStatus: expected, form_noti: true })
        });
      }));
    }
  });

  describe('สรุปจำนวน', () => {
    it('inventoryAlerts นับสินค้าที่เหลือไม่เกินเกณฑ์แจ้งเตือน', () => {
      const { component } = setUp();
      component.inventoryList = [
        { quantity: 1, quantity_alert: 5 },
        { quantity: 5, quantity_alert: 5 },
        { quantity: 6, quantity_alert: 5 }
      ];

      expect(component.inventoryAlerts()).toBe(2);
    });

    it('stockUpdates นับการแจ้งเตือนประเภท success', () => {
      const { component } = setUp();
      component.notifications = [{ type: 'success' }, { type: 'warning' }, { type: 'success' }];

      expect(component.stockUpdates()).toBe(2);
    });
  });

  describe('โหลดข้อมูล', () => {
    it('โหลดสินค้า: รองรับทั้ง array และ { data }', () => {
      const { component, todo } = setUp();

      todo.getInventory.and.returnValue(of([{ quantity: 1 }]));
      component.loadInventory();
      expect(component.inventoryList).toHaveSize(1);

      todo.getInventory.and.returnValue(of({ data: [{ quantity: 1 }, { quantity: 2 }] }) as never);
      component.loadInventory();
      expect(component.inventoryList).toHaveSize(2);
    });

    it('โหลดสินค้าไม่สำเร็จ: บันทึก error โดยไม่พัง', () => {
      const { component, todo } = setUp();
      todo.getInventory.and.returnValue(throwError(() => new Error('down')));
      const logged = spyOn(console, 'error');

      component.loadInventory();

      expect(logged).toHaveBeenCalled();
    });
  });
});
