import { Component, HostListener, OnInit, inject } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, homeRouteFor } from '../services/auth.service';
import { ShopOrder, ShopOrderStatus, TodoService } from '../services/todo.service';
import { formatPrice } from '../shop/shop-format';

type Filter = ShopOrderStatus | 'All';

// แท็บกรอง: เริ่มที่ "รอตรวจสลิป" เพราะเป็นงานที่พนักงานต้องทำ
const FILTERS: Filter[] = ['Verifying', 'Awaiting Payment', 'Completed', 'Rejected', 'Canceled', 'All'];

// หลังร้าน: ตรวจสลิป PromptPay ของออเดอร์หน้าร้าน
// ยืนยัน = ตัดสต็อก + บันทึกยอดขาย (Completed) / ปฏิเสธ = แจ้งเหตุผลให้ลูกค้าแนบสลิปใหม่
@Component({
  selector: 'app-online-orders',
  imports: [DatePipe, FormsModule],
  templateUrl: './online-orders.component.html',
  styleUrl: './online-orders.component.css'
})
export class OnlineOrdersComponent implements OnInit {
  private readonly todoService = inject(TodoService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly filters = FILTERS;
  readonly formatPrice = formatPrice;
  orders: ShopOrder[] = [];
  filter: Filter = 'Verifying';
  isLoading = true;
  loadError = '';

  reviewing: ShopOrder | null = null;
  slip = '';
  slipError = '';
  rejectReason = '';
  showReject = false;
  isSaving = false;
  reviewError = '';
  notice = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.loadError = '';
    this.todoService.getOnlineOrders().subscribe({
      next: ({ orders }) => {
        this.orders = orders;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Online orders could not be loaded. Please try again.';
      }
    });
  }

  // กลับหน้าก่อนหน้าในแอป (เช่น หน้าร้าน / หลังร้าน) ถ้าเปิดหน้านี้ตรง ๆ ให้ไปหน้าแรกหลังร้านของ role นั้น
  back(): void {
    if (this.router.lastSuccessfulNavigation?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigate([homeRouteFor(this.auth.user?.role)], { state: this.auth.navigationState() });
    }
  }

  get visibleOrders(): ShopOrder[] {
    return this.filter === 'All' ? this.orders : this.orders.filter(o => o.status === this.filter);
  }

  count(filter: Filter): number {
    return filter === 'All' ? this.orders.length : this.orders.filter(o => o.status === filter).length;
  }

  statusClass(status: string): string {
    return 'status-' + status.toLowerCase().replace(/\s+/g, '-');
  }

  itemSummary(order: ShopOrder): string {
    return order.items.map(line => `${line.product_name} ×${line.quantity}`).join(', ');
  }

  openReview(order: ShopOrder): void {
    this.reviewing = order;
    this.slip = '';
    this.slipError = '';
    this.reviewError = '';
    this.rejectReason = '';
    this.showReject = false;
    if (!order.has_slip) return;
    this.todoService.getOnlineOrderSlip(order.id).subscribe({
      next: ({ slip }) => {
        if (this.reviewing?.id === order.id) this.slip = slip;
      },
      error: () => {
        if (this.reviewing?.id === order.id) this.slipError = 'The payment slip could not be loaded.';
      }
    });
  }

  @HostListener('document:keydown.escape')
  closeReview(): void {
    if (this.isSaving) return;
    this.reviewing = null;
  }

  confirm(): void {
    const order = this.reviewing;
    if (!order || this.isSaving) return;
    this.isSaving = true;
    this.reviewError = '';
    this.todoService.confirmOnlineOrder(order.id).subscribe({
      next: ({ order: updated }) => this.finish(updated, `${updated.order_code} confirmed. Stock deducted and sale recorded.`),
      error: err => this.fail(err, 'The payment could not be confirmed. Please try again.')
    });
  }

  reject(): void {
    const order = this.reviewing;
    const reason = this.rejectReason.trim();
    if (!order || this.isSaving) return;
    if (!reason) {
      this.reviewError = 'Please tell the customer why the slip was not accepted.';
      return;
    }
    this.isSaving = true;
    this.reviewError = '';
    this.todoService.rejectOnlineOrder(order.id, reason).subscribe({
      next: ({ order: updated }) => this.finish(updated, `${updated.order_code} rejected. The customer can send a new slip.`),
      error: err => this.fail(err, 'The slip could not be rejected. Please try again.')
    });
  }

  private finish(updated: ShopOrder, message: string): void {
    this.isSaving = false;
    this.orders = this.orders.map(o => (o.id === updated.id ? updated : o));
    this.reviewing = null;
    this.notice = message;
  }

  private fail(err: { error?: { message?: string } }, fallback: string): void {
    this.isSaving = false;
    this.reviewError = err?.error?.message || fallback;
  }
}
