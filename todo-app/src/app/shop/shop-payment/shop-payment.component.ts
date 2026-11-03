import { Component, effect, inject, input, output } from '@angular/core';
import { ShopOrder, TodoService } from '../../services/todo.service';
import { formatPrice, maskPromptPayId, promptPayQr, readSlip } from '../shop-format';

const ACCEPTED_SLIP_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SLIP_FILE_BYTES = 15 * 1024 * 1024; // ไฟล์ต้นฉบับ (ย่อแล้วค่อยส่ง)

// ชำระเงินด้วย PromptPay (ระบบเดียวกับหน้า POS): QR ตามยอดออเดอร์ -> ลูกค้าแนบสลิป -> รอพนักงานตรวจ
// ใช้ทั้งตอนสั่งซื้อเสร็จ และตอนจ่ายย้อนหลังจาก "My Orders"
@Component({
  selector: 'app-shop-payment',
  templateUrl: './shop-payment.component.html',
  styleUrls: ['../shop-ui.css', './shop-payment.component.css']
})
export class ShopPaymentComponent {
  private readonly todoService = inject(TodoService);

  readonly order = input.required<ShopOrder>();
  readonly promptpayId = input<string | null>(null);
  readonly paid = output<ShopOrder>();

  readonly accept = ACCEPTED_SLIP_TYPES.join(',');
  readonly formatPrice = formatPrice;
  qrUrl = '';
  qrError = '';
  slip = '';
  slipError = '';
  isReading = false;
  isUploading = false;

  constructor() {
    effect(() => this.buildQr(this.promptpayId(), this.order().total));
  }

  get maskedId(): string {
    const id = this.promptpayId();
    return id ? maskPromptPayId(id) : '';
  }

  async onSlipSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // เลือกไฟล์เดิมซ้ำได้
    if (!file) return;

    this.slipError = '';
    if (!ACCEPTED_SLIP_TYPES.includes(file.type) || file.size > MAX_SLIP_FILE_BYTES) {
      this.slipError = 'Please choose a PNG, JPEG or WebP image of your payment slip.';
      return;
    }
    this.isReading = true;
    try {
      this.slip = await readSlip(file);
    } catch {
      this.slipError = 'This image could not be read. Please choose another file.';
    } finally {
      this.isReading = false;
    }
  }

  removeSlip(): void {
    this.slip = '';
  }

  submit(): void {
    if (!this.slip || this.isUploading) return;
    this.isUploading = true;
    this.slipError = '';
    this.todoService.uploadShopSlip(this.order().id, this.slip).subscribe({
      next: ({ order }) => {
        this.isUploading = false;
        this.slip = '';
        this.paid.emit(order);
      },
      error: err => {
        this.isUploading = false;
        this.slipError = err?.error?.message || 'Your payment slip could not be sent. Please try again.';
      }
    });
  }

  private buildQr(promptpayId: string | null, amount: number): void {
    this.qrUrl = '';
    this.qrError = '';
    if (!promptpayId) {
      this.qrError = 'Online payment is not available right now. Please contact the store.';
      return;
    }
    promptPayQr(promptpayId, amount).then(
      url => (this.qrUrl = url),
      () => (this.qrError = 'The QR code could not be created. Please try again.')
    );
  }
}
