import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { setUpPage } from '../../testing/page-test-utils';
import { PosComponent } from './pos.component';

const apple = { id: 'SKU-A', category: 'Fruit', name: 'Apple', stock: 5, price: 100, image: 'a.png', brand: 'B1', quantity_alert: 2 };
const banana = { id: 'SKU-B', category: 'Fruit', name: 'Banana', stock: 3, price: 50, image: 'b.png' };

describe('PosComponent', () => {
  const setUp = () => {
    const harness = setUpPage(PosComponent);
    harness.component.orderCode = '123456';
    harness.component.username = 'somchai';
    harness.component.email = 'somchai@test.com';
    harness.component.userRole = 'pos';
    harness.component.profile = 'p.png';
    harness.component.cartItems = [
      { ...apple, quantity: 2, batchNo: '' },
      { ...banana, quantity: 1, batchNo: '' }
    ];
    return harness;
  };

  describe('เมื่อเปิดหน้า', () => {
    it('โหลดสินค้า แจ้งเตือน และตั้งค่าร้าน', () => {
      const { fixture, todo } = setUpPage(PosComponent);
      todo.getInventory.and.returnValue(of([{ sku: 'SKU-A', category: 'Fruit', product_name: 'Apple', quantity: 5, price: 100, picture: 'a.png' }]));

      fixture.detectChanges();

      expect(todo.getInventory).toHaveBeenCalled();
      expect(todo.getSettings).toHaveBeenCalled();
      expect(fixture.componentInstance.products[0].name).toBe('Apple');
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(PosComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.play_Return).toBeFalse();
      fixture.destroy();
    });
  });

  describe('getCartQuantity', () => {
    it('คืนจำนวนของสินค้าในตะกร้า และ 0 ถ้าไม่มี', () => {
      const { component } = setUp();

      expect(component.getCartQuantity('SKU-A')).toBe(2);
      expect(component.getCartQuantity('SKU-B')).toBe(1);
      expect(component.getCartQuantity('NONE')).toBe(0);
    });
  });

  describe('ชำระเงิน (processOrder)', () => {
    it('ส่งทั้งออเดอร์ให้ Backend ครั้งเดียว: รหัสสินค้า จำนวน ส่วนลด และรูปพนักงาน', () => {
      const { component, todo } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      component.discountUnit = '$';
      component.discount = 30;

      component.processOrder();

      expect(todo.checkout).toHaveBeenCalledOnceWith({
        order_code: '#123456',
        items: [{ sku: 'SKU-A', quantity: 2 }, { sku: 'SKU-B', quantity: 1 }],
        discount: 30,
        picture: 'p.png'
      });
    });

    it('สำเร็จ: บันทึก audit แสดงสถานะสำเร็จ แล้วไปหน้าใบเสร็จพร้อมล้างตะกร้า', fakeAsync(() => {
      const { component, todo, router } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      todo.getInventory.calls.reset();

      component.processOrder();

      expect(todo.logAudit).toHaveBeenCalledWith(
        jasmine.objectContaining({ activity: 'Completed Order: #123456', product: 'Apple, Banana', role: 'pos' })
      );
      expect(component.paymentSuccess).toBeTrue();

      tick(1500);

      expect(component.paymentSuccess).toBeFalse();
      expect(component.isLoading).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/receipt'], {
        state: {
          receiptData: jasmine.objectContaining({ orderCode: '#123456', cashier: 'somchai' }),
          userData: { username: 'somchai', email: 'somchai@test.com', role: 'pos', profile: 'p.png' }
        }
      });
      expect(component.cartItems).toEqual([]);
      expect(todo.getInventory).toHaveBeenCalled();
    }));

    it('บันทึก audit ไม่สำเร็จ ไม่ขัดขวางการขาย', fakeAsync(() => {
      const { component, todo } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      todo.logAudit.and.returnValue(throwError(() => new Error('audit down')));
      const logged = spyOn(console, 'error');

      component.processOrder();
      tick(1500);

      expect(logged).toHaveBeenCalled();
      expect(component.cartItems).toEqual([]);
    }));

    it('ของไม่พอ/ล้มเหลว: แจ้งข้อความจาก Backend คงตะกร้าไว้ และโหลดสต็อกล่าสุด', () => {
      const { component, todo, router } = setUp();
      spyOn(window, 'alert');
      todo.checkout.and.returnValue(throwError(() => ({ error: { message: 'สินค้า Banana คงเหลือไม่พอ (เหลือ 0)' } })));
      todo.getInventory.calls.reset();

      component.processOrder();

      expect(window.alert).toHaveBeenCalledWith('สินค้า Banana คงเหลือไม่พอ (เหลือ 0)');
      expect(component.isLoading).toBeFalse();
      expect(component.cartItems).toHaveSize(2);
      expect(todo.getInventory).toHaveBeenCalled();
      expect(todo.logAudit).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('ล้มเหลวโดย Backend ไม่ส่งข้อความ: ใช้ข้อความมาตรฐาน', () => {
      const { component, todo } = setUp();
      spyOn(window, 'alert');
      todo.checkout.and.returnValue(throwError(() => ({})));

      component.processOrder();

      expect(window.alert).toHaveBeenCalledWith(jasmine.stringContaining('ไม่สามารถบันทึกการขายได้'));
    });

    it('ไม่มีที่อยู่ร้านในการตั้งค่า: ใบเสร็จใช้ข้อความ "ไม่พบข้อมูลที่อยู่"', fakeAsync(() => {
      const { component, todo, router } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      component.storeAddress = '';

      component.processOrder();
      tick(1500);

      const state = (router.navigate as jasmine.Spy).calls.mostRecent().args[1].state;
      expect(state.receiptData.companyAddress).toEqual(['ไม่พบข้อมูลที่อยู่']);
    }));

    it('มีที่อยู่ร้าน: แยกที่อยู่เป็นบรรทัดในใบเสร็จ', fakeAsync(() => {
      const { component, todo, router } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      component.storeAddress = '123 Road, Bangkok 10330';

      component.processOrder();
      tick(1500);

      const state = (router.navigate as jasmine.Spy).calls.mostRecent().args[1].state;
      expect(state.receiptData.companyAddress).toEqual(['123 Road', 'Bangkok 10330']);
    }));
  });

  describe('ชำระด้วยเงินสด', () => {
    it('เงินที่รับไม่พอ: แจ้งเตือนและไม่เรียก Backend', () => {
      const { component, todo } = setUp();
      spyOn(window, 'alert');
      component.cashReceived = 10;

      component.confirmCashPayment();

      expect(window.alert).toHaveBeenCalled();
      expect(component.isLoading).toBeFalse();
      expect(todo.checkout).not.toHaveBeenCalled();
    });

    it('เงินพอ: คิดเงินทอนและส่งออเดอร์', () => {
      const { component, todo } = setUp();
      todo.checkout.and.returnValue(of({ success: true }));
      component.cashReceived = 1000;

      component.calculateChange();
      component.confirmCashPayment();

      expect(component.changeAmount).toBe(1000 - component.total);
      expect(todo.checkout).toHaveBeenCalled();
    });
  });
});
