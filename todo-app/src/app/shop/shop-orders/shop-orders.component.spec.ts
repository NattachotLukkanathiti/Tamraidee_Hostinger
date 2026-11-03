import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { TodoService } from '../../services/todo.service';
import { shopOrder } from '../../../testing/shop-order-fixtures';
import { ShopPaymentComponent } from '../shop-payment/shop-payment.component';
import { ShopOrdersComponent } from './shop-orders.component';

describe('ShopOrdersComponent', () => {
  let fixture: ComponentFixture<ShopOrdersComponent>;
  let component: ShopOrdersComponent;
  let todoService: jasmine.SpyObj<TodoService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const cards = () => el().querySelectorAll<HTMLElement>('.order');
  const ORDERS = [
    shopOrder({ id: 9, order_code: 'WEB-000009', status: 'Rejected', reject_reason: 'Amount does not match' }),
    shopOrder({ id: 8, order_code: 'WEB-000008', status: 'Verifying', has_slip: true }),
    shopOrder({ id: 7, order_code: 'WEB-000007', status: 'Awaiting Payment' }),
    shopOrder({ id: 6, order_code: 'WEB-000006', status: 'Completed' }),
    shopOrder({ id: 5, order_code: 'WEB-000005', status: 'Canceled' })
  ];

  const setUp = () => {
    fixture = TestBed.createComponent(ShopOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['getMyShopOrders', 'cancelShopOrder', 'uploadShopSlip']);
    todoService.getMyShopOrders.and.returnValue(of({ orders: ORDERS, promptpay_id: '0811112222' }));
    TestBed.configureTestingModule({
      imports: [ShopOrdersComponent],
      providers: [{ provide: TodoService, useValue: todoService }]
    });
  });

  it('แสดงทุกออเดอร์ของบัญชีพร้อมสถานะ รายการ และยอดรวม', () => {
    setUp();

    expect(cards().length).toBe(5);
    expect(Array.from(cards(), c => c.querySelector('.status')?.textContent?.trim())).toEqual([
      'Payment not accepted', 'Verifying payment', 'Awaiting payment', 'Paid', 'Canceled'
    ]);
    expect(cards()[0].textContent).toContain('Reason: Amount does not match');
    expect(cards()[2].textContent).toContain('Apple × 2');
    expect(cards()[2].textContent).toContain('฿51.00');
    expect(cards()[2].textContent).toContain('2 item(s)');
    // จ่าย / ยกเลิกได้เฉพาะที่ยังไม่จ่าย หรือสลิปไม่ผ่าน
    expect(Array.from(cards(), c => !!c.querySelector('.actions'))).toEqual([true, false, true, false, false]);
    expect(cards()[0].querySelector('.btn-primary')?.textContent).toContain('Send a new slip');
    expect(cards()[2].querySelector('.btn-primary')?.textContent).toContain('Pay now');
  });

  it('Pay now: เปิดหน้าชำระเงินของออเดอร์นั้น แนบสลิปแล้วสถานะเปลี่ยนเป็นรอตรวจ', () => {
    setUp();
    cards()[2].querySelector<HTMLButtonElement>('.btn-primary')!.click();
    fixture.detectChanges();

    const payment = fixture.debugElement.query(By.directive(ShopPaymentComponent)).componentInstance as ShopPaymentComponent;
    expect(payment.order().id).toBe(7);
    expect(payment.promptpayId()).toBe('0811112222');

    payment.paid.emit({ ...ORDERS[2], status: 'Verifying', has_slip: true });
    fixture.detectChanges();

    expect(component.payingId).toBeNull();
    expect(cards()[2].querySelector('.status')?.textContent).toContain('Verifying payment');
    expect(cards()[2].querySelector('.actions')).toBeNull();

    component.togglePay(ORDERS[0]);
    component.togglePay(ORDERS[0]); // กดซ้ำ = ซ่อน
    expect(component.payingId).toBeNull();
  });

  it('ยกเลิก: ถามยืนยันก่อน กดเก็บไว้ได้ แล้วยกเลิกจริง', () => {
    todoService.cancelShopOrder.and.returnValue(of({ order: { ...ORDERS[2], status: 'Canceled' } }));
    setUp();

    cards()[2].querySelector<HTMLButtonElement>('.link-btn')!.click();
    fixture.detectChanges();
    expect(cards()[2].querySelector('.confirm')?.textContent).toContain('Cancel this order?');
    cards()[2].querySelector<HTMLButtonElement>('.confirm .btn-outline')!.click();
    fixture.detectChanges();
    expect(cards()[2].querySelector('.confirm')).toBeNull();

    cards()[2].querySelector<HTMLButtonElement>('.link-btn')!.click();
    fixture.detectChanges();
    cards()[2].querySelector<HTMLButtonElement>('.btn-danger')!.click();
    fixture.detectChanges();

    expect(todoService.cancelShopOrder).toHaveBeenCalledWith(7);
    expect(cards()[2].querySelector('.status')?.textContent).toContain('Canceled');
    expect(component.confirmCancelId).toBeNull();
  });

  it('ยกเลิกไม่ได้เพราะสถานะเปลี่ยนแล้ว: แจ้งข้อความและโหลดใหม่ / ผิดพลาดอื่นแสดงข้อความกลาง', () => {
    todoService.cancelShopOrder.and.returnValue(throwError(() => ({ status: 409, error: { message: 'This order can no longer be changed.' } })));
    setUp();

    component.askCancel(ORDERS[2]);
    component.cancelOrder(ORDERS[2]);
    fixture.detectChanges();
    expect(el().querySelector('.error[role=alert]')?.textContent).toContain('no longer be changed');
    expect(todoService.getMyShopOrders).toHaveBeenCalledTimes(2);

    todoService.cancelShopOrder.and.returnValue(throwError(() => ({ status: 500 })));
    component.cancelOrder(ORDERS[2]);
    expect(component.actionError).toContain('could not be canceled');
    expect(todoService.getMyShopOrders).toHaveBeenCalledTimes(2);
  });

  it('ยังไม่มีออเดอร์ / โหลดไม่สำเร็จแล้วลองใหม่', () => {
    todoService.getMyShopOrders.and.returnValue(of({ orders: [], promptpay_id: null }));
    setUp();
    expect(el().querySelector('.empty')?.textContent).toContain('No orders yet');

    todoService.getMyShopOrders.and.returnValue(throwError(() => ({ status: 500 })));
    component.load();
    fixture.detectChanges();
    expect(el().querySelector('.error')?.textContent).toContain('could not be loaded');

    todoService.getMyShopOrders.and.returnValue(of({ orders: ORDERS, promptpay_id: '0811112222' }));
    el().querySelector<HTMLButtonElement>('.orders-body .btn-outline')!.click();
    fixture.detectChanges();
    expect(cards().length).toBe(5);
  });

  it('ปิดด้วยปุ่ม / พื้นหลัง / Esc: เล่น slideOut ก่อนแล้วแจ้งให้ปิด (กดซ้ำไม่ซ้ำ)', fakeAsync(() => {
    setUp();
    const closed = jasmine.createSpy('closed');
    component.closed.subscribe(closed);

    el().querySelector<HTMLButtonElement>('.backdrop')!.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el().querySelector('.orders-panel')?.classList).toContain('closing');

    tick(300);
    expect(closed).toHaveBeenCalledTimes(1);
  }));

  it('สถานะที่ไม่รู้จัก: แสดงชื่อสถานะตรง ๆ', () => {
    setUp();
    expect(component.status({ ...ORDERS[0], status: 'Refunded' as never }).label).toBe('Refunded');
  });
});
