import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { TodoService } from '../services/todo.service';
import { shopOrder } from '../../testing/shop-order-fixtures';
import { OnlineOrdersComponent } from './online-orders.component';

describe('OnlineOrdersComponent', () => {
  let fixture: ComponentFixture<OnlineOrdersComponent>;
  let component: OnlineOrdersComponent;
  let todoService: jasmine.SpyObj<TodoService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => el().querySelectorAll<HTMLTableRowElement>('tbody tr');
  const SLIP = 'data:image/jpeg;base64,AAAA';
  const VERIFYING = shopOrder({
    id: 8, order_code: 'WEB-000008', status: 'Verifying', has_slip: true, note: 'Leave at door',
    slip_uploaded_at: '2026-11-04T10:05:00Z'
  });
  const ORDERS = [
    VERIFYING,
    shopOrder({ id: 7, status: 'Awaiting Payment' }),
    shopOrder({ id: 6, order_code: 'WEB-000006', status: 'Completed', has_slip: true, reviewed_by: 'pos1', reviewed_at: '2026-11-04T11:00:00Z' }),
    shopOrder({ id: 5, order_code: 'WEB-000005', status: 'Rejected', has_slip: true, reject_reason: 'Amount does not match' })
  ];

  const setUp = () => {
    fixture = TestBed.createComponent(OnlineOrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };
  const review = (order = VERIFYING) => {
    component.openReview(order);
    fixture.detectChanges();
  };

  beforeEach(() => {
    todoService = jasmine.createSpyObj<TodoService>('TodoService', [
      'getOnlineOrders', 'getOnlineOrderSlip', 'confirmOnlineOrder', 'rejectOnlineOrder'
    ]);
    todoService.getOnlineOrders.and.returnValue(of({ orders: ORDERS }));
    todoService.getOnlineOrderSlip.and.returnValue(of({ slip: SLIP }));
    TestBed.configureTestingModule({
      imports: [OnlineOrdersComponent],
      providers: [{ provide: TodoService, useValue: todoService }]
    });
  });

  it('เริ่มที่แท็บรอตรวจสลิป มีจำนวนในแต่ละแท็บ และเปลี่ยนแท็บได้', () => {
    setUp();

    expect(rows().length).toBe(1);
    expect(rows()[0].textContent).toContain('WEB-000008');
    expect(rows()[0].textContent).toContain('Apple ×2');
    expect(rows()[0].querySelector('.review-button')?.textContent).toContain('Review slip');
    const filters = Array.from(el().querySelectorAll<HTMLButtonElement>('.filter'));
    expect(filters.map(f => f.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Verifying 1', 'Awaiting Payment 1', 'Completed 1', 'Rejected 1', 'Canceled 0', 'All 4'
    ]);

    filters[5].click();
    fixture.detectChanges();
    expect(rows().length).toBe(4);
    expect(rows()[2].querySelector('.status')?.classList).toContain('status-completed');

    filters[4].click();
    fixture.detectChanges();
    expect(el().querySelector('.state')?.textContent).toContain('No canceled orders');
  });

  it('ตรวจสลิป: โหลดรูปสลิป แสดงยอดที่ต้องได้รับและข้อมูลลูกค้า แล้วยืนยันการชำระเงิน', () => {
    const confirmed = { ...VERIFYING, status: 'Completed' as const, reviewed_by: 'pos1' };
    todoService.confirmOnlineOrder.and.returnValue(of({ order: confirmed }));
    setUp();

    rows()[0].querySelector<HTMLButtonElement>('.review-button')!.click();
    fixture.detectChanges();

    expect(todoService.getOnlineOrderSlip).toHaveBeenCalledWith(8);
    expect(el().querySelector<HTMLImageElement>('.slip img')!.src).toBe(SLIP);
    const modal = el().querySelector('.modal')!;
    expect(modal.querySelector('.amount')?.textContent).toContain('฿51.00');
    expect(modal.textContent).toContain('Leave at door');
    expect(modal.textContent).toContain('Slip sent');

    modal.querySelector<HTMLButtonElement>('.btn-confirm')!.click();
    fixture.detectChanges();

    expect(todoService.confirmOnlineOrder).toHaveBeenCalledWith(8);
    expect(component.reviewing).toBeNull();
    expect(el().querySelector('.notice')?.textContent).toContain('WEB-000008 confirmed');
    expect(rows().length).toBe(0); // ย้ายไปแท็บ Completed แล้ว
    expect(component.count('Completed')).toBe(2);
  });

  it('ยืนยันไม่ได้ (เช่น ของไม่พอ): แสดงข้อความจากระบบ หน้าต่างยังเปิดอยู่', () => {
    todoService.confirmOnlineOrder.and.returnValue(throwError(() => ({ error: { message: 'Not enough stock for Apple (1 left)' } })));
    setUp();
    review();

    component.confirm();
    fixture.detectChanges();

    expect(el().querySelector('.modal .error')?.textContent).toContain('Not enough stock');
    expect(component.reviewing).not.toBeNull();
    expect(component.isSaving).toBeFalse();

    todoService.confirmOnlineOrder.and.returnValue(throwError(() => ({})));
    component.confirm();
    expect(component.reviewError).toContain('could not be confirmed');
  });

  it('ปฏิเสธสลิป: ต้องใส่เหตุผล แล้วส่งเหตุผลให้ลูกค้า', () => {
    todoService.rejectOnlineOrder.and.returnValue(of({ order: { ...VERIFYING, status: 'Rejected', reject_reason: 'Transfer not found' } }));
    setUp();
    review();

    el().querySelector<HTMLButtonElement>('.modal .btn-ghost')!.click();
    fixture.detectChanges();
    el().querySelector<HTMLButtonElement>('.modal .btn-danger')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.modal .error')?.textContent).toContain('why the slip was not accepted');
    expect(todoService.rejectOnlineOrder).not.toHaveBeenCalled();

    component.rejectReason = '  Transfer not found ';
    component.reject();
    fixture.detectChanges();

    expect(todoService.rejectOnlineOrder).toHaveBeenCalledWith(8, 'Transfer not found');
    expect(el().querySelector('.notice')?.textContent).toContain('rejected');
    expect(component.count('Rejected')).toBe(2);
  });

  it('ปฏิเสธไม่สำเร็จ: แสดงข้อความ / กด Back กลับไปหน้ายืนยัน', () => {
    todoService.rejectOnlineOrder.and.returnValue(throwError(() => ({})));
    setUp();
    review();
    component.showReject = true;
    component.rejectReason = 'x';

    component.reject();
    fixture.detectChanges();
    expect(component.reviewError).toContain('could not be rejected');

    el().querySelector<HTMLButtonElement>('.modal .btn-ghost')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.modal .btn-confirm')).not.toBeNull();
  });

  it('ดูออเดอร์ที่ยังไม่มีสลิป / ตรวจแล้ว: ไม่มีปุ่มยืนยัน และแสดงผู้ตรวจ / เหตุผล', () => {
    setUp();
    review(ORDERS[1]);
    expect(el().querySelector('.slip')?.textContent).toContain('No payment slip yet');
    expect(el().querySelector('.modal .btn-confirm')).toBeNull();
    expect(todoService.getOnlineOrderSlip).not.toHaveBeenCalled();

    review(ORDERS[2]);
    expect(el().querySelector('.modal')?.textContent).toContain('pos1');

    review(ORDERS[3]);
    expect(el().querySelector('.modal')?.textContent).toContain('Amount does not match');
  });

  it('โหลดสลิปไม่ได้: แจ้งเตือนและยืนยันไม่ได้ / สลิปของออเดอร์ที่ปิดไปแล้วไม่ถูกแสดง', () => {
    todoService.getOnlineOrderSlip.and.returnValue(throwError(() => ({})));
    setUp();
    review();
    expect(el().querySelector('.slip .error')?.textContent).toContain('could not be loaded');
    expect(el().querySelector<HTMLButtonElement>('.modal .btn-confirm')!.disabled).toBeTrue();

    // สลิปตอบกลับมาหลังเปลี่ยนไปดูออเดอร์อื่นแล้ว: ไม่เอามาแสดงผิดออเดอร์
    const late = new Subject<{ slip: string }>();
    todoService.getOnlineOrderSlip.and.returnValue(late);
    review();
    review(ORDERS[1]);
    late.next({ slip: SLIP });
    late.error({});
    expect(component.slipError).toBe('');
    expect(component.slip).toBe('');
  });

  it('ปิดหน้าต่างด้วยพื้นหลัง / Esc (ระหว่างบันทึกปิดไม่ได้)', () => {
    setUp();
    review();
    component.isSaving = true;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.reviewing).not.toBeNull();

    component.isSaving = false;
    el().querySelector<HTMLButtonElement>('.modal-layer .backdrop')!.click();
    expect(component.reviewing).toBeNull();
    component.confirm(); // ไม่มีออเดอร์ที่เปิดอยู่ ไม่ทำอะไร
    component.reject();
    expect(todoService.confirmOnlineOrder).not.toHaveBeenCalled();
  });

  it('โหลดรายการไม่สำเร็จ: แสดงข้อความ แล้วกดรีเฟรชได้', () => {
    todoService.getOnlineOrders.and.returnValue(throwError(() => ({})));
    setUp();
    expect(el().querySelector('.state.error')?.textContent).toContain('could not be loaded');

    todoService.getOnlineOrders.and.returnValue(of({ orders: ORDERS }));
    el().querySelector<HTMLButtonElement>('.page-head .icon-button')!.click();
    fixture.detectChanges();
    expect(rows().length).toBe(1);
  });
});
