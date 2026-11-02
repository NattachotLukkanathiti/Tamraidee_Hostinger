import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { SuppliersComponent } from './suppliers.component';

describe('SuppliersComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลด supplier', () => {
      const { fixture, component, todo } = setUpPage(SuppliersComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(todo.getSuppliers).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(SuppliersComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      expect(component.out).toBeFalse();
      fixture.destroy();
    });

    it('ไม่มี session: แจ้งเตือน และ popup ปิดแล้วกลับหน้า login', () => {
      const { fixture, component, router } = setUpPage(SuppliersComponent, {});

      fixture.detectChanges();
      expect(component.showpopupnoti).toBeTrue();

      component.closepopup();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      fixture.destroy();
    });
  });

  describe('โหลด supplier', () => {
    const suppliers = [{ supplier_name: 'ACME', email: 'a@acme.com', status: 'Active' }, { supplier_name: 'Other', status: 'Active' }];
    const inventory = [{ product_name: 'Apple', brand: 'ACME' }];

    it('รวมจำนวนที่ขายสำเร็จของสินค้าในแต่ละยี่ห้อ (ไม่นับออเดอร์ที่ยกเลิก)', () => {
      const { component, todo } = setUpPage(SuppliersComponent);
      todo.getSuppliers.and.returnValue(of(suppliers));
      todo.getInventory.and.returnValue(of(inventory));
      todo.getSaleOrders.and.returnValue(of([
        { status: 'Completed', product_name: 'Apple', quantity: 2 },
        { status: 'Completed', product_name: 'Apple', quantity: '3' },
        { status: 'Canceled', product_name: 'Apple', quantity: 50 },
        { status: 'Completed', product_name: 'Unknown', quantity: 7 },
        { status: 'Completed', product_name: 'Unknown', brand: 'other', quantity: 1 }
      ]));

      component.loadSuppliers();

      expect(component.suppliers.map((s) => s.order_history)).toEqual([5, 1]);
      expect(component.loader).toBeFalse();
    });

    it('รองรับ response ที่ห่อด้วย { data } และออเดอร์ที่ไม่ระบุยี่ห้อ', () => {
      const { component, todo } = setUpPage(SuppliersComponent);
      todo.getSuppliers.and.returnValue(of(suppliers));
      todo.getInventory.and.returnValue(of([]));
      todo.getSaleOrders.and.returnValue(of({ data: [{ status: 'Completed', product_name: 'X', quantity: 4 }] }) as never);

      component.loadSuppliers();

      expect(component.suppliers.map((s) => s.order_history)).toEqual([0, 0]);
    });

    it('โหลดไม่สำเร็จ: หยุดโหลดและบันทึก error', () => {
      const { component, todo } = setUpPage(SuppliersComponent);
      todo.getSuppliers.and.returnValue(throwError(() => new Error('down')));
      const logged = spyOn(console, 'error');

      component.loadSuppliers();

      expect(logged).toHaveBeenCalled();
      expect(component.loader).toBeFalse();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(SuppliersComponent, true)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(SuppliersComponent);
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });
});
