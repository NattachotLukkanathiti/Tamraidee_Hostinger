import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { SaleComponent } from './sale.component';

describe('SaleComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลดรายการขาย', () => {
      const { fixture, component, todo } = setUpPage(SaleComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(component.userRole).toBe('admin');
      expect(todo.getSaleOrders).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): ไม่เล่น animation เข้าหน้าและจำสถานะไว้', () => {
      const { fixture, component } = setUpPage(SaleComponent, {
        username: 'somchai',
        email: 'somchai@test.com',
        form_noti: true
      });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      expect(component.out).toBeFalse();
      fixture.destroy();
    });

    it('ไม่มี session: แจ้งเตือนและไม่โหลดข้อมูล', () => {
      const { fixture, component, todo } = setUpPage(SaleComponent, {});

      fixture.detectChanges();

      expect(component.showpopupnoti).toBeTrue();
      expect(todo.getSaleOrders).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('state Move_return: เล่น animation ตอนกลับเข้าหน้า', () => {
      const { fixture, component } = setUpPage(SaleComponent, {
        username: 'somchai',
        email: 'somchai@test.com',
        Move_return: true
      });

      fixture.detectChanges();

      expect(component.play_Return).toBeTrue();
      expect(component.stan).toBeFalse();
      fixture.destroy();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(SaleComponent)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้าพร้อมส่งข้อมูลผู้ใช้`, fakeAsync(() => {
        const { component, router } = setUpPage(SaleComponent);
        component.username = 'somchai';
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  describe('ค้นหาและแบ่งหน้า', () => {
    const orders = [
      { order_code: '#1001', create_by: 'Somchai' },
      { order_code: '#1002', create_by: 'Suda' },
      { order_code: '#2001', create_by: 'somying' }
    ];

    it('ช่องค้นหาว่าง: แสดงทั้งหมดและกลับไปหน้าแรก', () => {
      const { component } = setUpPage(SaleComponent);
      component.groupedSaleOrders = orders;
      component.currentPage = 3;
      component.search = '   ';

      component.filterS();

      expect(component.filteredSaleOrders).toEqual(orders);
      expect(component.currentPage).toBe(1);
    });

    it('ค้นหาด้วยรหัสออเดอร์หรือชื่อพนักงาน (ไม่สนตัวพิมพ์)', () => {
      const { component } = setUpPage(SaleComponent);
      component.groupedSaleOrders = orders;

      component.search = '#100';
      component.filterS();
      expect(component.filteredSaleOrders.map((o) => o.order_code)).toEqual(['#1001', '#1002']);

      component.search = 'SOM';
      component.filterS();
      expect(component.filteredSaleOrders.map((o) => o.create_by)).toEqual(['Somchai', 'somying']);

      component.search = 'zzz';
      component.filterS();
      expect(component.filteredSaleOrders).toEqual([]);
    });

    it('ข้อมูลที่ไม่มีรหัสออเดอร์/ผู้ขาย ไม่ทำให้ค้นหาพัง', () => {
      const { component } = setUpPage(SaleComponent);
      component.groupedSaleOrders = [{}, { order_code: '#1' }, { create_by: 'Suda' }];
      component.search = 'suda';

      component.filterS();

      expect(component.filteredSaleOrders).toHaveSize(1);
    });

    it('visiblePages แสดงทีละ 3 หน้า', () => {
      const { component } = setUpPage(SaleComponent);
      component.totalPages = 8;

      component.currentPage = 1;
      expect(component.visiblePages).toEqual([1, 2, 3]);
      component.currentPage = 5;
      expect(component.visiblePages).toEqual([4, 5, 6]);
      component.currentPage = 8;
      expect(component.visiblePages).toEqual([7, 8]);
    });

    it('changePage เปลี่ยนเฉพาะหน้าที่มีอยู่จริง', () => {
      const { component } = setUpPage(SaleComponent);
      component.totalPages = 3;

      component.changePage(2);
      component.changePage(9);
      component.changePage(0);

      expect(component.currentPage).toBe(2);
    });
  });

  describe('ยกเลิกออเดอร์', () => {
    const selected = () => ({ order_code: '#1001', status: 'Completed', items: [{ id: 11 }, { id: 12 }] });

    it('สำเร็จ: ให้ Backend ยกเลิกทั้งบิลในครั้งเดียว บันทึก audit และโหลดรายการใหม่', fakeAsync(() => {
      const { component, todo } = setUpPage(SaleComponent);
      todo.cancelSaleOrders.and.returnValue(of({ success: true }));
      component.selectedProduct = selected();

      component.confirmCancel();
      tick(500);

      expect(todo.cancelSaleOrders).toHaveBeenCalledOnceWith([11, 12]);
      expect(todo.logAudit).toHaveBeenCalledWith(jasmine.objectContaining({ activity: 'Cancel Order: #1001' }));
      expect(component.selectedProduct.status).toBe('Canceled');
      expect(todo.getSaleOrders).toHaveBeenCalled();
      expect(component.product2).toBeTrue();
    }));

    it('บิลที่ไม่มี items: ยกเลิกรายการเดียวด้วย id ของตัวเอง', () => {
      const { component, todo } = setUpPage(SaleComponent);
      todo.cancelSaleOrders.and.returnValue(of({ success: true }));
      component.selectedProduct = { id: 7, order_code: '#9' };

      component.confirmCancel();

      expect(todo.cancelSaleOrders).toHaveBeenCalledOnceWith([7]);
    });

    it('ล้มเหลว: แจ้งข้อความจาก Backend และโหลดรายการล่าสุด ไม่เปลี่ยนสถานะบนจอ', () => {
      const { component, todo } = setUpPage(SaleComponent);
      spyOn(window, 'alert');
      todo.cancelSaleOrders.and.returnValue(throwError(() => ({ error: { message: 'ยกเลิกไม่ได้' } })));
      component.selectedProduct = selected();

      component.confirmCancel();

      expect(window.alert).toHaveBeenCalledWith('ยกเลิกไม่ได้');
      expect(component.selectedProduct.status).toBe('Completed');
      expect(todo.getSaleOrders).toHaveBeenCalled();
    });

    it('ล้มเหลวโดย Backend ไม่ส่งข้อความ: ใช้ข้อความมาตรฐาน', () => {
      const { component, todo } = setUpPage(SaleComponent);
      spyOn(window, 'alert');
      todo.cancelSaleOrders.and.returnValue(throwError(() => ({})));
      component.selectedProduct = selected();

      component.confirmCancel();

      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('ไม่สามารถยกเลิกออเดอร์ได้'));
    });
  });
});
