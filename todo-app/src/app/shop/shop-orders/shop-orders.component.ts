import { Component, DestroyRef, HostListener, OnInit, inject, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ShopOrder, ShopOrderStatus, TodoService } from '../../services/todo.service';
import { ShopPaymentComponent } from '../shop-payment/shop-payment.component';
import { formatPrice } from '../shop-format';

const PANEL_ANIMATION_MS = 300;

// ข้อความสถานะที่ลูกค้าเห็น
const STATUS_TEXT: Record<ShopOrderStatus, { label: string; detail: string; tone: string }> = {
  'Awaiting Payment': { label: 'Awaiting payment', detail: 'Pay with PromptPay and send us your slip.', tone: 'warning' },
  'Awaiting Pickup': { label: 'Awaiting pickup', detail: 'Pick up your order at the store and pay in cash.', tone: 'info' },
  Verifying: { label: 'Verifying payment', detail: 'We received your slip and are checking your payment.', tone: 'info' },
  Completed: { label: 'Paid', detail: 'Payment confirmed. We are preparing your order.', tone: 'success' },
  Rejected: { label: 'Payment not accepted', detail: 'Please send a new slip or cancel the order.', tone: 'danger' },
  Canceled: { label: 'Canceled', detail: 'This order was canceled.', tone: 'muted' }
};

// "My Orders": สถานะคำสั่งซื้อของบัญชีที่ login อยู่ เปิดจากเมนูโปรไฟล์ใน navbar หน้าร้าน
@Component({
  selector: 'app-shop-orders',
  imports: [DatePipe, ShopPaymentComponent],
  templateUrl: './shop-orders.component.html',
  styleUrls: ['../shop-ui.css', './shop-orders.component.css']
})
export class ShopOrdersComponent implements OnInit {
  private readonly todoService = inject(TodoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();
  readonly formatPrice = formatPrice;

  orders: ShopOrder[] = [];
  promptpayId: string | null = null;
  isLoading = true;
  loadError = '';
  actionError = '';
  payingId: number | null = null;
  confirmCancelId: number | null = null;
  cancelingId: number | null = null;
  isClosing = false;
  private closeTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
    this.destroyRef.onDestroy(() => clearTimeout(this.closeTimer));
  }

  load(): void {
    this.isLoading = true;
    this.loadError = '';
    this.todoService.getMyShopOrders().subscribe({
      next: ({ orders, promptpay_id }) => {
        this.orders = orders;
        this.promptpayId = promptpay_id;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Your orders could not be loaded. Please try again.';
      }
    });
  }

  status(order: ShopOrder) {
    return STATUS_TEXT[order.status] ?? { label: order.status, detail: '', tone: 'muted' };
  }

  canPay(order: ShopOrder): boolean {
    return order.payment_method !== 'cash' && (order.status === 'Awaiting Payment' || order.status === 'Rejected');
  }

  // ยกเลิกเองได้ตอนยังไม่จ่าย / สลิปไม่ผ่าน / ยังไม่มารับที่ร้าน
  canCancel(order: ShopOrder): boolean {
    return this.canPay(order) || order.status === 'Awaiting Pickup';
  }

  itemCount(order: ShopOrder): number {
    return order.items.reduce((sum, line) => sum + line.quantity, 0);
  }

  togglePay(order: ShopOrder): void {
    this.payingId = this.payingId === order.id ? null : order.id;
    this.confirmCancelId = null;
  }

  onPaid(order: ShopOrder): void {
    this.replace(order);
    this.payingId = null;
  }

  askCancel(order: ShopOrder): void {
    this.confirmCancelId = order.id;
    this.payingId = null;
    this.actionError = '';
  }

  cancelOrder(order: ShopOrder): void {
    if (this.cancelingId) return;
    this.cancelingId = order.id;
    this.todoService.cancelShopOrder(order.id).subscribe({
      next: ({ order: updated }) => {
        this.cancelingId = null;
        this.confirmCancelId = null;
        this.replace(updated);
      },
      error: err => {
        this.cancelingId = null;
        this.actionError = err?.error?.message || 'The order could not be canceled. Please try again.';
        if (err?.status === 409) this.load(); // สถานะเปลี่ยนไปแล้ว (เช่น พนักงานตรวจแล้ว)
      }
    });
  }

  // เลื่อนออก (slideOut) ให้จบก่อนค่อยแจ้งให้ปิด
  @HostListener('document:keydown.escape')
  close(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.closeTimer = setTimeout(() => this.closed.emit(), PANEL_ANIMATION_MS);
  }

  private replace(order: ShopOrder): void {
    this.orders = this.orders.map(o => (o.id === order.id ? order : o));
  }
}
