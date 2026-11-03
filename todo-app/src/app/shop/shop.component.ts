import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, homeRouteFor } from '../services/auth.service';
import { ShopOrderResult, ShopProduct, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';

export const LOW_STOCK = 5;
const ALL = 'ทั้งหมด';
const PHONE_PATTERN = /^0\d{8,9}$/;

type StockLevel = 'out' | 'low' | 'ok';
export type SortOption = 'name' | 'price-asc' | 'price-desc';

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

// หน้าร้านออนไลน์ (หน้าแรกของเว็บ): ดู/ค้นหาสินค้า ดูรายละเอียดที่ /shop/:sku ใส่ตะกร้า และสั่งซื้อ
@Component({
  selector: 'app-shop',
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.css'
})
export class ShopComponent implements OnInit {
  private readonly todoService = inject(TodoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cart = inject(ShopCartService);

  readonly allLabel = ALL;
  products: ShopProduct[] = [];
  categories: { label: string; count: number }[] = [];
  selectedCategory = ALL;
  searchTerm = '';
  sortBy: SortOption = 'name';
  isLoading = true;
  loadError = false;

  selectedSku: string | null = null;
  quantity = 1;

  cartOpen = false;
  checkoutOpen = false;
  isSubmitting = false;
  orderError = '';
  orderResult: ShopOrderResult | null = null;
  customer = { customer_name: '', phone: '', address: '', note: '' };
  toast = '';
  private toastTimer?: ReturnType<typeof setTimeout>;

  private readonly priceFormat = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.selectedSku = params.get('sku');
      this.quantity = 1;
      window.scrollTo?.({ top: 0 });
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.toastTimer));
    this.loadProducts();
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

  // ---------- รายการสินค้า ----------

  get filteredProducts(): ShopProduct[] {
    const term = this.searchTerm.trim().toLowerCase();
    const list = this.products.filter(p =>
      (this.selectedCategory === ALL || p.category === this.selectedCategory) &&
      (!term || [p.product_name, p.brand, p.sku].some(v => v?.toLowerCase().includes(term)))
    );
    if (this.sortBy === 'name') return list;
    const direction = this.sortBy === 'price-asc' ? 1 : -1;
    return [...list].sort((a, b) => (Number(a.price) - Number(b.price)) * direction);
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

  selectCategory(label: string): void {
    this.selectedCategory = label;
    if (this.selectedSku) this.backToList();
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
    void this.router.navigate(['/shop', product.sku]);
  }

  backToList(): void {
    void this.router.navigate(['/shop']);
  }

  // ---------- สต็อก / ราคา ----------

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
      out: 'สินค้าหมด',
      low: `เหลือ ${qty} ชิ้น`,
      ok: 'มีสินค้า'
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
    return this.priceFormat.format(Number(value) || 0);
  }

  initial(product: ShopProduct): string {
    return (product.product_name || '?').trim().charAt(0).toUpperCase();
  }

  // ---------- ตะกร้า ----------

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
    this.showToast(added > 0 ? `เพิ่ม ${product.product_name} ลงตะกร้าแล้ว` : 'สินค้าในตะกร้าครบจำนวนที่มีในสต็อกแล้ว');
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

  toggleCart(open = !this.cartOpen): void {
    this.cartOpen = open;
  }

  // ---------- สั่งซื้อ ----------

  openCheckout(): void {
    if (this.cartItems.length === 0) return;
    this.orderError = '';
    this.orderResult = null;
    this.cartOpen = false;
    this.checkoutOpen = true;
  }

  closeCheckout(): void {
    if (this.isSubmitting) return;
    this.checkoutOpen = false;
    this.orderResult = null;
  }

  submitOrder(): void {
    const phone = this.customer.phone.replace(/[\s-]/g, '');
    if (!this.customer.customer_name.trim() || !this.customer.address.trim()) {
      this.orderError = 'กรุณากรอกชื่อและที่อยู่สำหรับจัดส่ง';
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      this.orderError = 'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก ขึ้นต้นด้วย 0';
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
        this.orderError = err?.error?.message || 'สั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
        if (err?.status === 409) this.loadProducts(); // สต็อกเปลี่ยน: ดึงจำนวนล่าสุดมาแสดง
      }
    });
  }

  @HostListener('document:keydown.escape')
  closeOverlays(): void {
    this.closeCheckout();
    this.cartOpen = false;
  }

  // ---------- เข้าสู่ระบบหลังร้าน ----------

  get isStaffLoggedIn(): boolean {
    return this.auth.isLoggedIn() && !!this.auth.user;
  }

  goToSystem(): void {
    if (this.isStaffLoggedIn) {
      void this.router.navigate([homeRouteFor(this.auth.user?.role)], { state: this.auth.navigationState() });
    } else {
      void this.router.navigate(['/login']);
    }
  }

  private showToast(message: string): void {
    this.toast = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (this.toast = ''), 2500);
  }

  private buildCategories(products: ShopProduct[]): { label: string; count: number }[] {
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
