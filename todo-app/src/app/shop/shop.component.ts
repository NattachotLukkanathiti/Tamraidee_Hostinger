import { Component, DestroyRef, ElementRef, HostListener, Injector, OnInit, ViewChild, afterNextRender, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, canUseBackOffice, homeRouteFor } from '../services/auth.service';
import { ShopOrderResult, ShopProduct, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';
import { ShopCategory, ShopNavbarComponent } from './shop-navbar/shop-navbar.component';
import { formatPrice } from './shop-format';
import { ShopOrdersComponent } from './shop-orders/shop-orders.component';
import { ShopPaymentComponent } from './shop-payment/shop-payment.component';

export const LOW_STOCK = 5;
// เวลาของแอนิเมชันปิดแผง / ออกจากหน้า (ตรงกับ CSS และหน้าอื่นในระบบที่รอ 300ms ก่อนเปลี่ยนหน้า)
export const ANIMATION_MS = 300;
const ALL = 'All';
const PHONE_PATTERN = /^0\d{8,9}$/;
// หน่วงการ์ดทีละใบตอนแสดง (แอนิเมชัน come) แต่ไม่เกินค่านี้ เพื่อไม่ให้รายการยาวต้องรอนาน
const MAX_STAGGER_MS = 600;
// สินค้าขายดีอันดับต้น ๆ แสดงเป็นแผ่นใหญ่ (showcase) ที่เหลือไปอยู่ในแถบเลื่อน
export const FEATURED_COUNT = 3;

type StockLevel = 'out' | 'low' | 'ok';
export type SortOption = 'name' | 'price-asc' | 'price-desc';

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

// หน้าร้านออนไลน์ (หน้าแรกของเว็บ): ดู/ค้นหาสินค้า ดูรายละเอียดที่ /shop/:sku ใส่ตะกร้า และสั่งซื้อ
@Component({
  selector: 'app-shop',
  imports: [FormsModule, NgTemplateOutlet, ShopNavbarComponent, ShopOrdersComponent, ShopPaymentComponent],
  templateUrl: './shop.component.html',
  styleUrls: ['./shop-ui.css', './shop.component.css']
})
export class ShopComponent implements OnInit {
  private readonly todoService = inject(TodoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  readonly cart = inject(ShopCartService);

  readonly allLabel = ALL;
  readonly featuredCount = FEATURED_COUNT;
  products: ShopProduct[] = [];
  private bestSellerSkus: string[] = [];
  bestAtStart = true;
  bestAtEnd = false;
  categories: ShopCategory[] = [];
  selectedCategory = ALL;
  searchTerm = '';
  sortBy: SortOption = 'name';
  // ซ่อนราคาทั้งตอนเลือกดูสินค้า ตะกร้า และหน้าสั่งซื้อ (เปิดจากหน้า Setting) โหมดนี้สั่งแบบรับที่ร้าน จ่ายเงินสด
  hidePrices = false;
  isLoading = true;
  loadError = false;

  selectedSku: string | null = null;
  quantity = 1;

  cartOpen = false;
  cartClosing = false;
  checkoutOpen = false;
  isSubmitting = false;
  orderError = '';
  orderResult: ShopOrderResult | null = null; // สั่งแล้ว รอชำระเงิน (แสดง QR พร้อมเพย์)
  paymentSent = false; // แนบสลิปแล้ว รอพนักงานตรวจ
  ordersOpen = false;
  customer = { customer_name: '', phone: '', address: '', note: '' };
  toast = '';
  isLeaving = false;
  private toastTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.selectedSku = params.get('sku');
      this.quantity = 1;
      window.scrollTo?.({ top: 0 });
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.toastTimer));
    this.loadProducts();
    this.loadBestSellers();
    this.loadConfig();
  }

  // แถบสินค้าขายดีเป็นส่วนเสริม: โหลดไม่ได้ก็แค่ไม่แสดง
  // โหลดไม่ได้ = แสดงราคาตามปกติ
  loadConfig(): void {
    this.todoService.getShopConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: config => (this.hidePrices = config?.hide_prices === true),
      error: () => (this.hidePrices = false)
    });
  }

  loadBestSellers(): void {
    this.todoService.getShopBestSellers().subscribe({
      next: res => (this.bestSellerSkus = res?.skus ?? []),
      error: err => console.error('Error loading best sellers:', err)
    });
  }

  loadProducts(): void {
    this.isLoading = true;
    this.loadError = false;
    this.todoService.getShopProducts().subscribe({
      next: rows => {
        this.products = rows ?? [];
        this.categories = this.buildCategories(this.products);
        this.isLoading = false;
      },
      error: err => {
        console.error('Error loading shop products:', err);
        this.loadError = true;
        this.isLoading = false;
      }
    });
  }

  // ---------- Product list ----------

  get filteredProducts(): ShopProduct[] {
    const term = this.searchTerm.trim().toLowerCase();
    const list = this.products.filter(p =>
      (this.selectedCategory === ALL || p.category === this.selectedCategory) &&
      (!term || [p.product_name, p.brand, p.sku].some(v => v?.toLowerCase().includes(term)))
    );
    if (this.sortBy === 'name' || this.hidePrices) return list;
    const direction = this.sortBy === 'price-asc' ? 1 : -1;
    return [...list].sort((a, b) => (Number(a.price) - Number(b.price)) * direction);
  }

  // เรียงตามยอดขายจาก Backend ข้ามสินค้าที่ไม่มีในร้านแล้ว
  get bestSellers(): ShopProduct[] {
    const bySku = new Map(this.products.map(p => [p.sku, p]));
    return this.bestSellerSkus.flatMap(sku => bySku.get(sku) ?? []);
  }

  // แสดงเฉพาะหน้ารวมที่ยังไม่ได้ค้นหา / กรองหมวด
  get showBestSellers(): boolean {
    return this.selectedCategory === ALL && !this.searchTerm.trim() && this.bestSellers.length > 0;
  }

  // แผ่นใหญ่ด้านบนสุด: แผ่นแรกเต็มความกว้าง ถัดไปเป็นสองคอลัมน์ (แบบหน้าแรก Apple)
  // ยังไม่มียอดขาย / โหลดยอดขายไม่ได้: แสดงสินค้าแนะนำ (มีของ มีรูปก่อน) โดยไม่อ้างว่าขายดี
  get featuredProducts(): ShopProduct[] {
    if (this.hasBestSellers) return this.bestSellers.slice(0, FEATURED_COUNT);
    const inStock = this.products.filter(p => this.stock(p) > 0);
    return [...inStock.filter(p => p.picture), ...inStock.filter(p => !p.picture)].slice(0, FEATURED_COUNT);
  }

  get hasBestSellers(): boolean {
    return this.bestSellers.length > 0;
  }

  featuredLabel(index: number): string {
    return this.hasBestSellers ? `#${index + 1} Best Seller` : 'Featured';
  }

  get carouselProducts(): ShopProduct[] {
    return this.bestSellers.slice(FEATURED_COUNT);
  }

  get showShowcase(): boolean {
    return !this.selectedSku && this.selectedCategory === ALL && !this.searchTerm.trim() && this.featuredProducts.length > 0;
  }

  // คำโปรยใต้ชื่อสินค้า: ไม่มีข้อมูลก็ใช้ข้อความกลาง
  tagline(product: ShopProduct): string {
    return [product.brand, product.category].filter(Boolean).join(' · ') || 'Available now';
  }

  @ViewChild('bestTrack')
  set bestTrack(ref: ElementRef<HTMLElement> | undefined) {
    // แถบเพิ่งแสดง: รอ layout เสร็จแล้วค่อยดูว่าเลื่อนไปขวาได้ไหม
    if (ref) setTimeout(() => this.updateBestArrows(ref.nativeElement));
  }

  // ปุ่มลูกศรเลื่อนทีละประมาณหนึ่งหน้าจอของแถบ
  scrollBestSellers(track: HTMLElement, direction: 1 | -1): void {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  updateBestArrows(track: HTMLElement): void {
    this.bestAtStart = track.scrollLeft <= 1;
    this.bestAtEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
  }

  get selectedProduct(): ShopProduct | undefined {
    return this.products.find(p => p.sku === this.selectedSku);
  }

  // สินค้าหมวดเดียวกัน (ไม่รวมตัวที่กำลังดู) แสดงใต้หน้ารายละเอียด
  get relatedProducts(): ShopProduct[] {
    const current = this.selectedProduct;
    if (!current) return [];
    return this.products.filter(p => p.category === current.category && p.sku !== current.sku).slice(0, 4);
  }

  staggerDelay(index: number): string {
    return `${Math.min(index * 60, MAX_STAGGER_MS)}ms`;
  }

  selectCategory(label: string): void {
    this.selectedCategory = label;
    if (this.selectedSku) this.backToList();
  }

  // เลือกจากเมนูประเภทบน navbar: รอให้หน้าวาดใหม่ก่อน (แผ่นสินค้าขายดีหาย/กลับมา) แล้วค่อยเลื่อนไปที่รายการ
  // (จากหน้ารายละเอียด selectCategory พากลับหน้ารวมให้แล้ว)
  pickCategory(label: string): void {
    const fromDetail = !!this.selectedSku;
    this.selectCategory(label);
    if (!fromDetail) afterNextRender(() => this.scrollToProducts(), { injector: this.injector });
  }

  // พิมพ์ค้นหาตอนอยู่หน้ารายละเอียด ให้กลับไปหน้ารวมเพื่อเห็นผลการค้นหา
  onSearchChange(): void {
    if (this.selectedSku) this.backToList();
  }

  goHome(): void {
    this.selectedCategory = ALL;
    this.searchTerm = '';
    this.backToList();
  }

  openProduct(product: ShopProduct): void {
    this.closeCart();
    void this.router.navigate(['/shop', product.sku]);
  }

  backToList(): void {
    void this.router.navigate(['/shop']);
  }

  // ปุ่ม Learn more ในแถบประกาศ: เลื่อนลงไปที่รายการสินค้าทั้งหมด
  scrollToProducts(): void {
    if (this.selectedSku) this.backToList();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('all-products')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  // ---------- Stock / price ----------

  stock(product: ShopProduct): number {
    return Math.max(0, Number(product.quantity) || 0);
  }

  stockLevel(product: ShopProduct): StockLevel {
    const qty = this.stock(product);
    if (qty === 0) return 'out';
    return qty <= LOW_STOCK ? 'low' : 'ok';
  }

  stockLabel(product: ShopProduct): string {
    const qty = this.stock(product);
    return {
      out: 'Out of stock',
      low: `Only ${qty} left`,
      ok: 'In stock'
    }[this.stockLevel(product)];
  }

  // จำนวนที่ยังใส่ตะกร้าเพิ่มได้ (สต็อก - ที่อยู่ในตะกร้าแล้ว)
  available(product: ShopProduct): number {
    return Math.max(0, this.stock(product) - this.cart.quantityOf(product.sku));
  }

  changeQuantity(delta: number): void {
    const product = this.selectedProduct;
    if (!product) return;
    this.quantity = Math.min(Math.max(1, this.quantity + delta), Math.max(1, this.available(product)));
  }

  formatPrice(value: number | string): string {
    return formatPrice(value);
  }

  initial(product: ShopProduct): string {
    return (product.product_name || '?').trim().charAt(0).toUpperCase();
  }

  // ---------- Cart ----------

  get cartItems(): CartItem[] {
    return this.cart.lines.flatMap(line => {
      const product = this.products.find(p => p.sku === line.sku);
      return product ? [{ product, quantity: line.quantity }] : [];
    });
  }

  get cartTotal(): number {
    return this.cartItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  }

  addToCart(product: ShopProduct, quantity = 1): boolean {
    const added = this.cart.add(product.sku, quantity, this.stock(product));
    this.showToast(added > 0 ? `Added ${product.product_name} to cart` : 'You already have all available stock in your cart');
    this.quantity = 1;
    return added > 0;
  }

  buyNow(product: ShopProduct): void {
    if (this.cart.quantityOf(product.sku) === 0) this.cart.add(product.sku, this.quantity, this.stock(product));
    this.quantity = 1;
    this.openCheckout();
  }

  updateCartQuantity(item: CartItem, delta: number): void {
    const next = Math.min(item.quantity + delta, this.stock(item.product));
    this.cart.setQuantity(item.product.sku, next);
  }

  toggleCart(): void {
    if (this.cartOpen) {
      this.closeCart();
    } else {
      this.cartOpen = true;
    }
  }

  // เล่นแอนิเมชันปิด (slideOut) ให้จบก่อนค่อยเอาแผงออก
  closeCart(): void {
    if (!this.cartOpen || this.cartClosing) return;
    this.cartClosing = true;
    setTimeout(() => {
      this.cartOpen = false;
      this.cartClosing = false;
    }, ANIMATION_MS);
  }

  // ---------- Checkout ----------

  // สั่งซื้อต้อง login (ออเดอร์ผูกกับบัญชี ดูสถานะได้ใน My Orders) ตะกร้าของ guest จะรวมเข้าบัญชีหลัง login
  openCheckout(): void {
    if (this.cartItems.length === 0) return;
    if (!this.auth.isLoggedIn()) {
      this.showToast('Please log in to place your order');
      this.enterBackOffice();
      return;
    }
    this.orderError = '';
    this.orderResult = null;
    this.paymentSent = false;
    this.cartOpen = false;
    this.cartClosing = false;
    if (!this.customer.customer_name) this.customer.customer_name = this.auth.user?.username ?? '';
    this.checkoutOpen = true;
  }

  // ปิดได้แม้ยังไม่จ่าย ออเดอร์ยังรอชำระเงินอยู่ จ่ายต่อได้จาก My Orders
  closeCheckout(): void {
    if (this.isSubmitting) return;
    this.checkoutOpen = false;
    this.orderResult = null;
    this.paymentSent = false;
  }

  onCheckoutPaid(): void {
    this.paymentSent = true;
  }

  openOrders(): void {
    this.closeCheckout();
    this.closeCart();
    this.ordersOpen = true;
  }

  submitOrder(): void {
    const phone = this.customer.phone.replace(/[\s-]/g, '');
    if (!this.customer.customer_name.trim() || !this.customer.address.trim()) {
      this.orderError = 'Please enter your name and delivery address.';
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      this.orderError = 'Please enter a valid 9-10 digit phone number starting with 0.';
      return;
    }

    this.isSubmitting = true;
    this.orderError = '';
    this.todoService.createShopOrder({
      customer_name: this.customer.customer_name.trim(),
      phone,
      address: this.customer.address.trim(),
      note: this.customer.note.trim() || undefined,
      items: this.cartItems.map(item => ({ sku: item.product.sku, quantity: item.quantity }))
    }).subscribe({
      next: result => {
        this.isSubmitting = false;
        this.orderResult = result;
        this.cart.clear();
        this.customer = { customer_name: '', phone: '', address: '', note: '' };
      },
      error: err => {
        this.isSubmitting = false;
        this.orderError = err?.error?.message || 'Your order could not be placed. Please try again.';
        if (err?.status === 409) this.loadProducts(); // สต็อกเปลี่ยน: ดึงจำนวนล่าสุดมาแสดง
      }
    });
  }

  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    this.closeCheckout();
    this.closeCart();
  }

  // ---------- Login / Back office ----------

  // พนักงาน (admin / manager / pos / backend) ที่ login อยู่ = เข้าหลังร้าน / ยังไม่ login = ไปหน้า login แล้วกลับมาหน้าร้าน
  // เล่นแอนิเมชันออกจากหน้า (Move_dashboard) ก่อนเปลี่ยนหน้า เหมือนหน้าอื่นในระบบ
  enterBackOffice(): void {
    if (this.isLeaving) return;
    this.isLeaving = true;
    const user = this.auth.user;
    setTimeout(() => {
      if (this.auth.isLoggedIn() && canUseBackOffice(user?.role)) {
        void this.router.navigate([homeRouteFor(user?.role)], { state: this.auth.navigationState() });
      } else {
        void this.router.navigate(['/login'], { queryParams: { from: 'shop' } });
      }
    }, ANIMATION_MS);
  }

  private showToast(message: string): void {
    this.toast = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = ''), 2500);
  }

  private buildCategories(products: ShopProduct[]): ShopCategory[] {
    const counts = new Map<string, number>();
    for (const p of products) {
      if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [
      { label: ALL, count: products.length },
      ...[...counts].sort(([a], [b]) => a.localeCompare(b, 'th')).map(([label, count]) => ({ label, count }))
    ];
  }
}
