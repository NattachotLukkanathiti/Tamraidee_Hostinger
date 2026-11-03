import {
  Component, DestroyRef, ElementRef, HostListener, Injector, OnInit, ViewChild, afterNextRender, computed, effect, inject, input, model,
  output, signal
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, canReviewOnlineOrders, canUseBackOffice } from '../../services/auth.service';
import { auditEntry } from '../../services/audit';
import { TodoService } from '../../services/todo.service';
import { ShopCartService } from '../shop-cart.service';

const SIDEBAR_ANIMATION_MS = 300;
const MENU_ANIMATION_MS = 300;
const MORE_WIDTH = 48; // ความกว้างโดยประมาณของปุ่ม More ก่อนแสดงครั้งแรก

export interface ShopCategory {
  label: string;
  count: number;
}

// Navbar ของหน้าร้านเท่านั้น (หน้าตาเดียวกับ Navbar หลังร้าน แต่ไม่ต้องใช้ state ของการ login)
@Component({
  selector: 'app-shop-navbar',
  imports: [FormsModule, DatePipe],
  templateUrl: './shop-navbar.component.html',
  styleUrl: './shop-navbar.component.css'
})
export class ShopNavbarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly todoService = inject(TodoService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cart = inject(ShopCartService);

  readonly search = model('');
  readonly home = output<void>();
  readonly cartToggle = output<void>();
  // พนักงานที่ login อยู่ = ไปหลังร้าน / ยังไม่ login = ไปหน้า login (ทุกคน login ได้)
  readonly signIn = output<void>();
  // เมนูประเภทสินค้า (แทนเมนูเปลี่ยนหน้าของหลังร้าน)
  readonly categories = input<ShopCategory[]>([]);
  readonly selectedCategory = input('');
  readonly categorySelect = output<string>();
  // เมนูโปรไฟล์ -> "My Orders" (สถานะคำสั่งซื้อของบัญชีนี้)
  readonly ordersOpen = output<void>();
  private readonly router = inject(Router);

  // แถบประเภทกลาง navbar แบบแถบเปลี่ยนหน้าของ Dashboard: แสดงเท่าที่พอดีแถวเดียว ที่เหลืออยู่ในเมนู More
  readonly fitCount = signal(Number.MAX_SAFE_INTEGER);
  readonly hasMore = computed(() => this.fitCount() < this.categories().length);
  readonly moreActive = computed(() =>
    this.categories().findIndex(c => c.label === this.selectedCategory()) >= this.fitCount()
  );
  private readonly injector = inject(Injector);
  private navEl?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  @ViewChild('nav') set nav(ref: ElementRef<HTMLElement> | undefined) {
    if (ref?.nativeElement === this.navEl) return;
    this.resizeObserver?.disconnect();
    this.navEl = ref?.nativeElement;
    if (this.navEl && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.fitLinks());
      this.resizeObserver.observe(this.navEl);
    }
  }

  currentTime = new Date();
  accountOpen = false;
  isClosing = false;
  menuOpen = false;
  menuClosing = false;

  constructor() {
    // ประเภท / ตัวที่เลือก (ตัวหนา) เปลี่ยน ความกว้างของลิงก์เปลี่ยน: วัดใหม่หลังวาดเสร็จ
    effect(() => {
      this.categories();
      this.selectedCategory();
      afterNextRender(() => this.fitLinks(), { injector: this.injector });
    });
    this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
  }

  ngOnInit(): void {
    const clock = setInterval(() => (this.currentTime = new Date()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
  }

  // นับลิงก์ที่วางเรียงได้ในความกว้างของแถบ (ถ้าไม่พอ เผื่อที่ให้ปุ่ม More) ลิงก์ที่ล้นยังวัดความกว้างได้เพราะแค่ถูกซ่อน
  fitLinks(): void {
    const nav = this.navEl;
    const links = nav?.querySelector('.nav-links');
    const available = nav?.clientWidth ?? 0;
    if (!nav || !links || !available) return; // จอ ≤ 1200px แถบถูกซ่อน ไม่ต้องวัด

    const gap = Number.parseFloat(getComputedStyle(links).columnGap) || 0;
    const widths = Array.from(links.children, el => (el as HTMLElement).offsetWidth);
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
    if (total <= available) {
      this.fitCount.set(Number.MAX_SAFE_INTEGER);
      return;
    }

    const moreWidth = nav.querySelector<HTMLElement>('.he.more')?.offsetWidth || MORE_WIDTH;
    let used = moreWidth;
    let count = 0;
    while (count < widths.length && used + gap + widths[count] <= available) {
      used += gap + widths[count];
      count++;
    }
    this.fitCount.set(count);
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  // admin / manager / pos / backend เท่านั้นที่มีทางเข้าหลังร้าน คนอื่นใช้ได้แค่หน้าร้าน
  get isStaff(): boolean {
    return this.isLoggedIn && canUseBackOffice(this.auth.user?.role);
  }

  // admin / manager / pos ตรวจสลิปออเดอร์ออนไลน์ได้
  get canReviewOrders(): boolean {
    return this.isLoggedIn && canReviewOnlineOrders(this.auth.user?.role);
  }

  get roleLabel(): string {
    const role = this.auth.user?.role || '';
    return this.isStaff ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Customer';
  }

  get user() {
    return this.auth.user;
  }

  toggleAccount(): void {
    if (this.accountOpen) {
      this.closeAccount();
    } else {
      this.closeMenu();
      this.accountOpen = true;
    }
  }

  // เล่นแอนิเมชันปิด (slideOut) ให้จบก่อนค่อยเอาแผงออก
  closeAccount(): void {
    if (!this.accountOpen || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.accountOpen = false;
      this.isClosing = false;
    }, SIDEBAR_ANIMATION_MS);
  }

  toggleMenu(): void {
    if (this.menuOpen) {
      this.closeMenu();
    } else {
      this.closeAccount();
      this.menuOpen = true;
    }
  }

  // เฟดออก (fade_out) ให้จบก่อนค่อยเอาเมนูออก เหมือนเมนูหลังร้าน
  @HostListener('document:keydown.escape')
  closeMenu(): void {
    if (!this.menuOpen || this.menuClosing) return;
    this.menuClosing = true;
    setTimeout(() => {
      this.menuOpen = false;
      this.menuClosing = false;
    }, MENU_ANIMATION_MS);
  }

  chooseCategory(label: string): void {
    this.categorySelect.emit(label);
    this.closeMenu();
  }

  openOrders(): void {
    this.closeAccount();
    this.ordersOpen.emit();
  }

  goOnlineOrders(): void {
    this.accountOpen = false;
    void this.router.navigate(['/online-orders'], { state: this.auth.navigationState() });
  }

  goBackOffice(): void {
    this.accountOpen = false;
    this.signIn.emit();
  }

  logout(): void {
    const user = this.auth.user;
    if (user) {
      this.todoService.logAudit(auditEntry(user, 'Logout')).subscribe({
        error: err => console.error('Failed to save logout audit', err)
      });
    }
    this.auth.clearSession();
    this.closeAccount();
  }
}
