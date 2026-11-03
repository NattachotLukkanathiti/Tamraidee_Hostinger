import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ShopOrder, TodoService } from '../../services/todo.service';
import { pngFile } from '../../../testing/image-test-utils';
import { ShopPaymentComponent } from './shop-payment.component';
import { waitFor } from '../../../testing/page-test-utils';
import { shopOrder } from '../../../testing/shop-order-fixtures';

const ORDER = shopOrder();

describe('ShopPaymentComponent', () => {
  let fixture: ComponentFixture<ShopPaymentComponent>;
  let component: ShopPaymentComponent;
  let todoService: jasmine.SpyObj<TodoService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const fileInput = () => el().querySelector<HTMLInputElement>('input[type=file]')!;
  const choose = async (file: File) => {
    const input = fileInput();
    const list = new DataTransfer();
    list.items.add(file);
    input.files = list.files;
    await component.onSlipSelected({ target: input } as unknown as Event);
    fixture.detectChanges();
  };

  const setUp = (order: ShopOrder = ORDER, promptpayId: string | null = '0811112222') => {
    fixture = TestBed.createComponent(ShopPaymentComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('order', order);
    fixture.componentRef.setInput('promptpayId', promptpayId);
    fixture.detectChanges();
  };

  beforeEach(() => {
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['uploadShopSlip']);
    TestBed.configureTestingModule({
      imports: [ShopPaymentComponent],
      providers: [{ provide: TodoService, useValue: todoService }]
    });
  });

  it('แสดง QR พร้อมเพย์ตามยอดออเดอร์ ยอดเงิน เลขออเดอร์ และเบอร์ร้านแบบปิดบางส่วน', async () => {
    setUp();

    await waitFor(() => !!component.qrUrl);
    fixture.detectChanges();

    expect(el().querySelector<HTMLImageElement>('.qr-frame img')!.src).toMatch(/^data:image\/png/);
    expect(el().querySelector('.pay-amount')?.textContent).toContain('฿51.00');
    expect(el().textContent).toContain('WEB-000007');
    expect(el().textContent).toContain('081-xxx-2222');
    expect(el().querySelector('.save-qr')?.getAttribute('download')).toBe('WEB-000007-promptpay.png');
    // ยังไม่แนบสลิป ส่งไม่ได้
    expect(el().querySelector<HTMLButtonElement>('.btn-primary')!.disabled).toBeTrue();
  });

  it('ร้านยังไม่ตั้ง PromptPay: แจ้งว่าจ่ายออนไลน์ไม่ได้', () => {
    setUp(ORDER, null);
    expect(el().querySelector('.qr-frame .error')?.textContent).toContain('not available');
  });

  it('แนบสลิปแล้วส่ง: ส่งรูปไปที่ออเดอร์นี้ แล้วแจ้งว่าจ่ายแล้ว', async () => {
    const updated = { ...ORDER, status: 'Verifying' as const, has_slip: true };
    todoService.uploadShopSlip.and.returnValue(of({ order: updated }));
    setUp();
    const paid = jasmine.createSpy('paid');
    component.paid.subscribe(paid);

    await choose(await pngFile(40, 80));
    expect(el().querySelector('.slip-preview img')).not.toBeNull();

    el().querySelector<HTMLButtonElement>('.btn-primary')!.click();

    expect(todoService.uploadShopSlip).toHaveBeenCalledWith(7, jasmine.stringMatching(/^data:image\/jpeg;base64,/));
    expect(paid).toHaveBeenCalledWith(updated);
    expect(component.slip).toBe('');
  });

  it('ไฟล์ผิดประเภท / อ่านรูปไม่ได้: แจ้งเตือนและไม่แนบ / ลบสลิปที่เลือกได้', async () => {
    setUp();

    await choose(new File(['%PDF'], 'slip.pdf', { type: 'application/pdf' }));
    expect(el().querySelector('.error')?.textContent).toContain('PNG, JPEG or WebP');

    await choose(new File(['broken'], 'slip.png', { type: 'image/png' }));
    expect(component.slipError).toContain('could not be read');
    expect(component.slip).toBe('');

    await choose(await pngFile(20, 20));
    el().querySelector<HTMLButtonElement>('.slip-preview .icon-btn')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.slip-preview')).toBeNull();

    await component.onSlipSelected({ target: { files: null, value: '' } } as unknown as Event); // ยกเลิกการเลือกไฟล์
    expect(component.slip).toBe('');
  });

  it('ส่งไม่สำเร็จ: แสดงข้อความจากระบบ และส่งซ้ำได้', async () => {
    todoService.uploadShopSlip.and.returnValue(throwError(() => ({ error: { message: 'This order can no longer be changed.' } })));
    setUp({ ...ORDER, status: 'Rejected', reject_reason: 'Amount does not match' });
    expect(el().textContent).toContain('Amount does not match');

    await choose(await pngFile(20, 20));
    component.submit();
    fixture.detectChanges();

    const alerts = el().querySelectorAll('.pay-steps .error');
    expect(alerts[alerts.length - 1].textContent).toContain('no longer be changed');
    expect(component.isUploading).toBeFalse();
    expect(component.slip).not.toBe('');

    todoService.uploadShopSlip.and.returnValue(throwError(() => ({})));
    component.submit();
    expect(component.slipError).toContain('could not be sent');
  });
});
