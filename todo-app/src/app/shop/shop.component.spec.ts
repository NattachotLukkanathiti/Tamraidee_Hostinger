import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ApplicationRef } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ShopProduct, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';
import { ANIMATION_MS, LOW_STOCK, ShopComponent } from './shop.component';
import { ShopNavbarComponent } from './shop-navbar/shop-navbar.component';
import { ShopOrdersComponent } from './shop-orders/shop-orders.component';
import { ShopPaymentComponent } from './shop-payment/shop-payment.component';
import { shopOrder } from '../../testing/shop-order-fixtures';

const PRODUCTS: ShopProduct[] = [
  { sku: 'A1', product_name: 'Apple', category: 'Fruit', brand: 'FarmA', price: '25.50', quantity: 20, picture: 'a.png' },
  { sku: 'B1', product_name: 'Banana', category: 'Fruit', brand: null, price: 10, quantity: LOW_STOCK, picture: null },
  { sku: 'C1', product_name: 'Cola', category: 'Drink', brand: 'Fizz', price: 15, quantity: 0, picture: null },
  { sku: 'D1', product_name: 'Durian', category: null, brand: null, price: 300, quantity: null, picture: null }
];

const ORDER = shopOrder();

describe('ShopComponent', () => {
  let fixture: ComponentFixture<ShopComponent>;
  let component: ShopComponent;
  let todoService: jasmine.SpyObj<TodoService>;
  let router: Router;
  let cart: ShopCartService;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const setUp = (sku: string | null = null) => {
    params = new BehaviorSubject(convertToParamMap(sku ? { sku } : {}));
    TestBed.configureTestingModule({
      imports: [ShopComponent],
      providers: [
        provideRouter([]),
        { provide: TodoService, useValue: todoService },
        { provide: ActivatedRoute, useValue: { paramMap: params } }
      ]
    });
    router = TestBed.inject(Router);
    cart = TestBed.inject(ShopCartService);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ShopComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  // สั่งซื้อต้อง login (ออเดอร์ผูกกับบัญชี)
  const loginCustomer = () =>
    TestBed.inject(AuthService).setSession('t', { id: 2, username: 'somchai', title: 'c@test.com', role: 'customer' });

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const cards = () => el().querySelectorAll<HTMLButtonElement>('.card-open');
  const fillCustomer = (phone = '081-234-5678') => {
    component.customer = { customer_name: ' สมชาย ', phone, address: ' กรุงเทพฯ ', note: '' };
  };

  beforeEach(() => {
    localStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['getShopProducts', 'createShopOrder', 'logAudit', 'getShopCart', 'saveShopCart', 'getShopBestSellers', 'getMyShopOrders', 'uploadShopSlip', 'cancelShopOrder']);
    todoService.getShopProducts.and.returnValue(of(PRODUCTS));
    todoService.getShopBestSellers.and.returnValue(of({ skus: [] }));
    todoService.getShopCart.and.returnValue(of({ items: [] }));
    todoService.saveShopCart.and.callFake(items => of({ items }));
    todoService.getMyShopOrders.and.returnValue(of({ orders: [], promptpay_id: '0811112222' }));
  });

  afterEach(() => localStorage.clear());

  // ---------- รายการสินค้า ----------

  it('แถบประกาศแบบหน้าอื่น: Learn more เลื่อนไปรายการสินค้า', () => {
    setUp();
    const target = el().querySelector<HTMLElement>('#all-products')!;
    spyOn(target, 'scrollIntoView');

    expect(el().querySelector('.tab_con .tab')?.textContent).toContain('Introducing Tamraidee');
    el().querySelector<HTMLButtonElement>('.tab .lern')!.click();

    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('Learn more จากหน้ารายละเอียด: กลับไปหน้ารวมก่อน', () => {
    setUp('A1');

    component.scrollToProducts();

    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  describe('สินค้าขายดี', () => {
    const bestCards = () => el().querySelectorAll<HTMLButtonElement>('.best-card');

    const tiles = () => el().querySelectorAll<HTMLElement>('.tile');

    it('3 อันดับแรกเป็นแผ่นใหญ่ (แผ่นแรกเต็มกว้าง แผ่นที่ 3 พื้นมืด) ข้าม SKU ที่ไม่มีในร้าน', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['C1', 'GONE', 'A1', 'B1', 'D1'] }));
      setUp();

      expect(component.featuredProducts.map(p => p.sku)).toEqual(['C1', 'A1', 'B1']);
      expect(tiles()).toHaveSize(3);
      expect(tiles()[0].classList).toContain('tile-hero');
      expect(tiles()[2].classList).toContain('tile-dark');
      expect(tiles()[0].textContent).toContain('#1 Best Seller');
      expect(tiles()[1].textContent).toContain('FarmA · Fruit');
      expect(tiles()[2].textContent).toContain('Fruit');
    });

    it('อันดับที่เหลือไปอยู่ในแถบเลื่อน และนับอันดับต่อจากแผ่นใหญ่', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['A1', 'B1', 'C1', 'D1'] }));
      setUp();

      expect(bestCards()).toHaveSize(1);
      expect(bestCards()[0].textContent).toContain('#4 Best Seller');
      bestCards()[0].click();
      expect(router.navigate).toHaveBeenCalledWith(['/shop', 'D1']);
    });

    it('มีไม่เกิน 3 อันดับ: ไม่แสดงแถบเลื่อน', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['A1'] }));
      setUp();

      expect(tiles()).toHaveSize(1);
      expect(el().querySelector('.best-sellers')).toBeNull();
    });

    it('Learn more ไปหน้ารายละเอียด / Buy ใส่ตะกร้าแล้วเปิดหน้าชำระเงิน / ของหมดแสดงสถานะแทนปุ่ม Buy', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['A1', 'C1'] }));
      setUp();
      loginCustomer();

      tiles()[0].querySelector<HTMLButtonElement>('.btn-primary')!.click();
      expect(router.navigate).toHaveBeenCalledWith(['/shop', 'A1']);

      tiles()[0].querySelector<HTMLButtonElement>('.btn-outline')!.click();
      expect(cart.quantityOf('A1')).toBe(1);
      expect(component.checkoutOpen).toBeTrue();

      expect(tiles()[1].querySelector('.btn-outline')).toBeNull();
      expect(tiles()[1].textContent).toContain('Out of stock');
    });

    it('ไม่มีข้อมูลยี่ห้อ / หมวด: ใช้คำโปรยกลาง และไม่แสดงในหน้ารายละเอียด', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['D1'] }));
      setUp('D1');

      expect(component.tagline(PRODUCTS[3])).toBe('Available now');
      expect(tiles()).toHaveSize(0);
    });

    it('ซ่อนเมื่อค้นหา / เลือกหมวด / ยังไม่มียอดขาย', () => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['A1'] }));
      setUp();
      expect(component.showShowcase).toBeTrue();

      component.searchTerm = 'app';
      expect(component.showBestSellers).toBeFalse();
      component.searchTerm = '';
      component.selectedCategory = 'Fruit';
      expect(component.showBestSellers).toBeFalse();
    });

    it('ไม่มียอดขายเลย: แผ่นใหญ่แสดงสินค้าแนะนำ (มีของ มีรูปก่อน) ป้าย Featured และไม่มีแถบเลื่อน', () => {
      setUp();

      expect(component.featuredProducts.map(p => p.sku)).toEqual(['A1', 'B1']); // C1, D1 ของหมด
      expect(tiles()).toHaveSize(2);
      expect(tiles()[0].textContent).toContain('Featured');
      expect(tiles()[0].textContent).not.toContain('Best Seller');
      expect(el().querySelector('.best-sellers')).toBeNull();
    });

    it('โหลดไม่ได้: ไม่แสดงแถบ แต่รายการสินค้ายังใช้ได้', () => {
      todoService.getShopBestSellers.and.returnValue(throwError(() => new Error('down')));
      spyOn(console, 'error');
      setUp();

      expect(el().querySelector('.best-sellers')).toBeNull();
      expect(tiles()[0].textContent).toContain('Featured');
      expect(cards()).toHaveSize(4);
      expect(console.error).toHaveBeenCalled();
    });

    it('ปุ่มลูกศรเลื่อนแถบ และปิดปุ่มเมื่อสุดทาง', fakeAsync(() => {
      todoService.getShopBestSellers.and.returnValue(of({ skus: ['A1', 'B1', 'C1', 'D1'] }));
      setUp();
      tick();
      const track = { scrollLeft: 0, clientWidth: 500, scrollWidth: 1200, scrollBy: jasmine.createSpy('scrollBy') };

      component.scrollBestSellers(track as unknown as HTMLElement, 1);
      expect(track.scrollBy).toHaveBeenCalledWith(jasmine.objectContaining({ left: 400 }));
      component.scrollBestSellers(track as unknown as HTMLElement, -1);
      expect(track.scrollBy).toHaveBeenCalledWith(jasmine.objectContaining({ left: -400 }));

      component.updateBestArrows(track as unknown as HTMLElement);
      expect(component.bestAtStart).toBeTrue();
      expect(component.bestAtEnd).toBeFalse();

      track.scrollLeft = 700;
      component.updateBestArrows(track as unknown as HTMLElement);
      expect(component.bestAtStart).toBeFalse();
      expect(component.bestAtEnd).toBeTrue();
      discardPeriodicTasks();
    }));
  });

  it('แสดงสินค้าทุกชิ้นพร้อมราคาและสถานะสต็อก', () => {
    setUp();

    expect(cards()).toHaveSize(4);
    expect(text()).toContain('฿25.50');
    expect(text()).toContain('In stock');
    expect(text()).toContain(`Only ${LOW_STOCK} left`);
    expect(text()).toContain('Out of stock');
  });

  it('สร้างหมวดหมู่พร้อมจำนวน (ไม่นับสินค้าที่ไม่มีหมวด) และกรองตามหมวดที่เลือก', () => {
    setUp();

    expect(component.categories).toEqual([
      { label: component.allLabel, count: 4 },
      { label: 'Drink', count: 1 },
      { label: 'Fruit', count: 2 }
    ]);

    component.selectCategory('Fruit');
    expect(component.filteredProducts.map(p => p.sku)).toEqual(['A1', 'B1']);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('เมนูประเภทใน navbar: ได้รายการหมวด เลือกแล้วกรองและเลื่อนไปที่รายการสินค้า', () => {
    setUp();
    const target = el().querySelector<HTMLElement>('#all-products')!;
    spyOn(target, 'scrollIntoView');
    const navbar = fixture.debugElement.query(By.directive(ShopNavbarComponent)).componentInstance as ShopNavbarComponent;

    expect(navbar.categories()).toEqual(component.categories);
    expect(navbar.selectedCategory()).toBe(component.allLabel);

    navbar.categorySelect.emit('Fruit');
    expect(target.scrollIntoView).not.toHaveBeenCalled(); // รอหน้าวาดใหม่ก่อน
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    expect(component.selectedCategory).toBe('Fruit');
    expect(navbar.selectedCategory()).toBe('Fruit');
    expect(target.scrollIntoView).toHaveBeenCalled();
  });

  it('เมนูประเภทจากหน้ารายละเอียด: กลับหน้ารวมครั้งเดียว ไม่เลื่อนซ้ำ', () => {
    setUp('A1');
    spyOn(component, 'scrollToProducts');

    component.pickCategory('Drink');
    TestBed.inject(ApplicationRef).tick();

    expect(component.selectedCategory).toBe('Drink');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/shop']);
    expect(component.scrollToProducts).not.toHaveBeenCalled();
  });

  it('ค้นหาได้จากชื่อ แบรนด์ หรือรหัสสินค้า และแจ้งเมื่อไม่พบ', () => {
    setUp();

    component.searchTerm = 'fizz';
    expect(component.filteredProducts.map(p => p.sku)).toEqual(['C1']);
    component.searchTerm = ' a1 ';
    expect(component.filteredProducts.map(p => p.sku)).toEqual(['A1']);

    component.searchTerm = 'nothing like this';
    fixture.detectChanges();
    expect(text()).toContain('No products match your search.');
  });

  it('เรียงตามราคาได้ทั้งน้อยไปมากและมากไปน้อย', () => {
    setUp();

    component.sortBy = 'price-asc';
    expect(component.filteredProducts.map(p => p.sku)).toEqual(['B1', 'C1', 'A1', 'D1']);
    component.sortBy = 'price-desc';
    expect(component.filteredProducts.map(p => p.sku)).toEqual(['D1', 'A1', 'C1', 'B1']);
  });

  it('กดการ์ดสินค้าแล้วไปหน้ารายละเอียด /shop/:sku', () => {
    setUp();

    cards()[1].click();

    expect(router.navigate).toHaveBeenCalledWith(['/shop', 'B1']);
  });

  it('กดโลโก้: ล้างตัวกรองและกลับหน้ารวม', () => {
    setUp('A1');
    component.selectedCategory = 'Fruit';
    component.searchTerm = 'x';

    el().querySelector<HTMLButtonElement>('.headercompany')!.click();

    expect(component.selectedCategory).toBe(component.allLabel);
    expect(component.searchTerm).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  // ---------- รายละเอียดสินค้า ----------

  it('หน้ารายละเอียด: แสดงข้อมูลสินค้าและสินค้าหมวดเดียวกัน', () => {
    setUp('A1');

    expect(component.selectedProduct?.product_name).toBe('Apple');
    expect(text()).toContain('FarmA');
    expect(text()).toContain('More in this category');
    expect(component.relatedProducts.map(p => p.sku)).toEqual(['B1']);
  });

  it('หน้ารายละเอียด: ค้นหาหรือเลือกหมวดแล้วกลับไปหน้ารวม', () => {
    setUp('A1');

    component.onSearchChange();
    component.selectCategory('Drink');

    expect(router.navigate).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  it('เลือกจำนวนได้ระหว่าง 1 ถึงจำนวนที่ยังใส่ตะกร้าได้ และคำนวณราคารวม', () => {
    setUp('B1');

    component.changeQuantity(-1);
    expect(component.quantity).toBe(1);
    for (let i = 0; i < 10; i++) component.changeQuantity(1);
    expect(component.quantity).toBe(LOW_STOCK);

    fixture.detectChanges();
    expect(text()).toContain('฿50.00');
  });

  it('สินค้าหมด: ไม่มีตัวเลือกจำนวนและปุ่มซื้อ', () => {
    setUp('C1');

    expect(el().querySelector('.quantity')).toBeNull();
    expect(text()).toContain('temporarily out of stock');
    expect(component.relatedProducts).toEqual([]);
  });

  it('เปลี่ยนสินค้าที่ดูแล้วรีเซ็ตจำนวนกลับเป็น 1', () => {
    setUp('A1');
    component.changeQuantity(3);

    params.next(convertToParamMap({ sku: 'B1' }));

    expect(component.selectedSku).toBe('B1');
    expect(component.quantity).toBe(1);
  });

  it('ไม่พบรหัสสินค้า: แจ้งเตือนและกลับไปหน้ารวมได้', () => {
    setUp('NOPE');

    expect(text()).toContain('Product "NOPE" was not found.');
    expect(component.relatedProducts).toEqual([]);
    component.changeQuantity(1);
    expect(component.quantity).toBe(1);

    component.backToList();
    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  it('โหลดไม่สำเร็จ: แสดงข้อความและกดลองใหม่ได้', () => {
    todoService.getShopProducts.and.returnValue(throwError(() => new Error('down')));
    spyOn(console, 'error');
    setUp();

    expect(component.loadError).toBeTrue();
    expect(text()).toContain("We couldn't load the products.");

    todoService.getShopProducts.and.returnValue(of(PRODUCTS));
    el().querySelector<HTMLButtonElement>('.state .btn-primary')!.click();
    fixture.detectChanges();

    expect(component.loadError).toBeFalse();
    expect(cards()).toHaveSize(4);
  });

  it('สินค้าไม่มีชื่อหรือไม่มีราคา แสดงค่าแทนได้', () => {
    setUp();

    expect(component.initial({ ...PRODUCTS[0], product_name: '' })).toBe('?');
    expect(component.formatPrice('abc')).toBe('฿0.00');
    expect(component.stock(PRODUCTS[3])).toBe(0);
  });

  // ---------- ตะกร้า ----------

  it('หน้าแรกไม่มีปุ่มใส่ตะกร้าบนการ์ด / ใส่ตะกร้าแล้วตัวเลขขึ้นที่ไอคอนมุมขวาบน และใส่เกินสต็อกไม่ได้', fakeAsync(() => {
    setUp();
    expect(el().querySelector('.card button:not(.card-open)')).toBeNull();

    for (let i = 0; i < LOW_STOCK; i++) component.addToCart(PRODUCTS[1]);
    fixture.detectChanges();

    expect(cart.quantityOf('B1')).toBe(LOW_STOCK);
    expect(el().querySelector('.cart-count')?.textContent).toContain(String(LOW_STOCK));
    component.toggleCart();
    fixture.detectChanges();
    expect(el().querySelectorAll('.cart-line')).toHaveSize(1);
    expect(component.cartTotal).toBe(10 * LOW_STOCK);
    expect(component.available(PRODUCTS[1])).toBe(0);

    expect(component.addToCart(PRODUCTS[1])).toBeFalse();
    expect(component.toast).toContain('all available stock');
    tick(2500);
    expect(component.toast).toBe('');
    discardPeriodicTasks(); // นาฬิกาใน navbar
  }));

  it('หน้ารายละเอียด: เพิ่มลงตะกร้าตามจำนวนที่เลือก แล้วเลือกเพิ่มได้ไม่เกินที่เหลือ', () => {
    setUp('B1');
    component.changeQuantity(2);

    el().querySelector<HTMLButtonElement>('.buy-actions .btn-outline')!.click();
    fixture.detectChanges();

    expect(cart.quantityOf('B1')).toBe(3);
    expect(component.toast).toContain('Banana');
    expect(component.quantity).toBe(1);
    for (let i = 0; i < 10; i++) component.changeQuantity(1);
    expect(component.quantity).toBe(LOW_STOCK - 3);
  });

  it('หน้ารายละเอียด: ใส่ครบสต็อกแล้วแสดงปุ่มไปชำระเงินแทน', () => {
    setUp('B1');
    loginCustomer();
    cart.add('B1', LOW_STOCK, LOW_STOCK);
    fixture.detectChanges();

    expect(text()).toContain('already have all available stock');
    el().querySelector<HTMLButtonElement>('.detail-info .btn-primary')!.click();

    expect(component.checkoutOpen).toBeTrue();
  });

  it('ปรับจำนวน / ลบสินค้าในตะกร้า และไม่แสดงสินค้าที่ไม่มีในร้านแล้ว', () => {
    setUp();
    cart.setQuantity('GONE', 2);
    component.addToCart(PRODUCTS[0], 2);
    const [item] = component.cartItems;

    expect(component.cartItems).toHaveSize(1);
    component.updateCartQuantity(item, 1);
    expect(cart.quantityOf('A1')).toBe(3);
    component.updateCartQuantity({ ...item, quantity: 3 }, -3);
    expect(cart.quantityOf('A1')).toBe(0);
  });

  it('เปิดตะกร้าจากไอคอนบน navbar และปิดด้วยแอนิเมชัน (กด Esc ได้)', fakeAsync(() => {
    setUp();

    el().querySelector<HTMLButtonElement>('.cart-button')!.click();
    fixture.detectChanges();
    expect(component.cartOpen).toBeTrue();
    expect(el().querySelector('.cart-panel')).not.toBeNull();
    expect(text()).toContain('Your cart is empty.');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el().querySelector('.cart-panel')?.classList).toContain('closing');
    component.closeCart(); // กดซ้ำระหว่างกำลังปิดไม่มีผล
    tick(ANIMATION_MS);
    expect(component.cartOpen).toBeFalse();

    component.toggleCart();
    component.toggleCart();
    tick(ANIMATION_MS);
    expect(component.cartOpen).toBeFalse();
    discardPeriodicTasks();
  }));

  it('กดดูสินค้าจากในตะกร้า: ปิดตะกร้าแล้วไปหน้ารายละเอียด', fakeAsync(() => {
    setUp();
    component.addToCart(PRODUCTS[0]);
    component.toggleCart();
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.cart-thumb')!.click();
    tick(ANIMATION_MS);

    expect(component.cartOpen).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/shop', 'A1']);
    discardPeriodicTasks();
  }));

  // ---------- สั่งซื้อ ----------

  it('ตะกร้าว่างเปิดหน้าสั่งซื้อไม่ได้', () => {
    setUp();

    component.openCheckout();

    expect(component.checkoutOpen).toBeFalse();
  });

  it('ซื้อเลย: ใส่ตะกร้าแล้วเปิดหน้าสั่งซื้อทันที (กดซ้ำไม่เพิ่มจำนวน)', () => {
    setUp('A1');
    loginCustomer();
    component.changeQuantity(1);

    component.buyNow(PRODUCTS[0]);
    component.buyNow(PRODUCTS[0]);
    fixture.detectChanges();

    expect(cart.quantityOf('A1')).toBe(2);
    expect(component.checkoutOpen).toBeTrue();
    expect(el().querySelector('dialog')?.textContent).toContain('Apple × 2');
  });

  it('สั่งซื้อ: ตรวจชื่อ ที่อยู่ และเบอร์โทรก่อนส่ง', () => {
    setUp();
    loginCustomer();
    component.addToCart(PRODUCTS[0]);
    component.openCheckout();

    component.submitOrder();
    expect(component.orderError).toContain('name and delivery address');

    fillCustomer('12345');
    component.submitOrder();
    expect(component.orderError).toContain('phone number');
    expect(todoService.createShopOrder).not.toHaveBeenCalled();
  });

  it('สั่งซื้อสำเร็จ: ส่งข้อมูลที่ตัดช่องว่างแล้ว ล้างตะกร้า แล้วไปหน้าชำระเงินด้วย QR พร้อมเพย์', () => {
    todoService.createShopOrder.and.returnValue(of({ success: true, order: ORDER, promptpay_id: '0811112222' }));
    setUp();
    loginCustomer();
    component.addToCart(PRODUCTS[0], 2);
    component.openCheckout();
    fillCustomer();

    component.submitOrder();
    fixture.detectChanges();

    expect(todoService.createShopOrder).toHaveBeenCalledWith({
      customer_name: 'สมชาย',
      phone: '0812345678',
      address: 'กรุงเทพฯ',
      note: undefined,
      items: [{ sku: 'A1', quantity: 2 }]
    });
    expect(cart.count).toBe(0);
    expect(el().querySelector('#checkout-title')?.textContent).toContain('Pay with PromptPay');
    const payment = fixture.debugElement.query(By.directive(ShopPaymentComponent)).componentInstance as ShopPaymentComponent;
    expect(payment.order()).toEqual(ORDER);
    expect(payment.promptpayId()).toBe('0811112222');
    expect(text()).toContain('Pay later from My Orders');

    // แนบสลิปแล้ว: แจ้งว่ารอตรวจ และไปดู My Orders ได้
    payment.paid.emit({ ...ORDER, status: 'Verifying' });
    fixture.detectChanges();
    expect(el().querySelector('#checkout-title')?.textContent).toContain('Payment slip sent');
    expect(text()).toContain('WEB-000007');

    el().querySelector<HTMLButtonElement>('.success .btn-outline')!.click();
    fixture.detectChanges();
    expect(component.checkoutOpen).toBeFalse();
    expect(component.ordersOpen).toBeTrue();
    expect(el().querySelector('app-shop-orders')).not.toBeNull();
  });

  it('ยังไม่ login: กดสั่งซื้อแล้วพาไป login ก่อน (ตะกร้ายังอยู่)', fakeAsync(() => {
    setUp();
    component.addToCart(PRODUCTS[0]);

    component.openCheckout();
    expect(component.checkoutOpen).toBeFalse();
    expect(component.toast).toContain('log in');

    tick(ANIMATION_MS);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { from: 'shop' } });
    expect(cart.count).toBe(1);
    discardPeriodicTasks();
  }));

  it('login แล้ว: เติมชื่อจากบัญชีให้ / ปิดหน้าชำระเงินได้แม้ยังไม่จ่าย', () => {
    setUp();
    loginCustomer();
    component.addToCart(PRODUCTS[0]);
    component.openCheckout();
    expect(component.customer.customer_name).toBe('somchai');

    component.orderResult = { success: true, order: ORDER, promptpay_id: '0811112222' };
    component.closeCheckout();
    expect(component.checkoutOpen).toBeFalse();
    expect(component.orderResult).toBeNull();
  });

  it('My Orders จากเมนูโปรไฟล์: ปิดตะกร้าแล้วเปิดแผงคำสั่งซื้อ และปิดได้', () => {
    setUp();
    loginCustomer();
    component.cartOpen = true;
    const navbar = fixture.debugElement.query(By.directive(ShopNavbarComponent)).componentInstance as ShopNavbarComponent;

    navbar.ordersOpen.emit();
    fixture.detectChanges();
    expect(el().querySelector('app-shop-orders')).not.toBeNull();

    const orders = fixture.debugElement.query(By.directive(ShopOrdersComponent)).componentInstance as ShopOrdersComponent;
    orders.closed.emit();
    fixture.detectChanges();
    expect(el().querySelector('app-shop-orders')).toBeNull();
  });

  it('สั่งซื้อไม่สำเร็จเพราะของไม่พอ: แสดงข้อความจากระบบและโหลดสต็อกใหม่', () => {
    todoService.createShopOrder.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'สินค้า Apple คงเหลือไม่พอ' } }))
    );
    setUp();
    loginCustomer();
    component.addToCart(PRODUCTS[0]);
    component.openCheckout();
    fillCustomer();

    component.submitOrder();

    expect(component.orderError).toBe('สินค้า Apple คงเหลือไม่พอ');
    expect(component.isSubmitting).toBeFalse();
    expect(todoService.getShopProducts).toHaveBeenCalledTimes(2);
    expect(cart.count).toBe(1);
  });

  it('สั่งซื้อไม่สำเร็จด้วยเหตุอื่น: แสดงข้อความมาตรฐาน', () => {
    todoService.createShopOrder.and.returnValue(throwError(() => ({ status: 500 })));
    setUp();
    loginCustomer();
    component.addToCart(PRODUCTS[0]);
    component.openCheckout();
    fillCustomer();
    component.customer.note = ' ส่งช่วงเย็น ';

    component.submitOrder();

    expect(todoService.createShopOrder.calls.mostRecent().args[0].note).toBe('ส่งช่วงเย็น');
    expect(component.orderError).toContain('could not be placed');
    expect(todoService.getShopProducts).toHaveBeenCalledTimes(1);
  });

  it('ระหว่างกำลังส่งคำสั่งซื้อ ปิดหน้าต่างไม่ได้', () => {
    setUp();
    component.checkoutOpen = true;
    component.isSubmitting = true;

    component.closeCheckout();

    expect(component.checkoutOpen).toBeTrue();
  });

  // ---------- Login / เข้าหลังร้าน (เฉพาะพนักงาน) ----------

  it('ยังไม่ login: ปุ่ม Login เล่นแอนิเมชันออกแล้วไปหน้า login (กลับมาหน้าร้านเมื่อเสร็จ)', fakeAsync(() => {
    setUp();

    el().querySelector<HTMLButtonElement>('.login-button')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.shop')?.classList).toContain('fade-out');
    component.enterBackOffice(); // กดซ้ำไม่เปลี่ยนหน้าซ้ำ
    tick(ANIMATION_MS);

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], { queryParams: { from: 'shop' } });
    discardPeriodicTasks();
  }));

  it('login เป็นพนักงาน pos: เข้าหลังร้านที่หน้าแรกของ pos', fakeAsync(() => {
    setUp();
    TestBed.inject(AuthService).setSession('t', { id: 1, username: 'pos1', title: 'p@test.com', role: 'pos' });

    component.enterBackOffice();
    tick(ANIMATION_MS);

    expect(router.navigate).toHaveBeenCalledWith(['/pos'], jasmine.anything());
    discardPeriodicTasks();
  }));

  it('login เป็นลูกค้า (ไม่ใช่พนักงาน): ไม่มีปุ่มเข้าหลังร้าน และไม่พาไปหลังร้าน', fakeAsync(() => {
    setUp();
    TestBed.inject(AuthService).setSession('t', { id: 2, username: 'cus', title: 'c@test.com', role: 'customer' });
    fixture.detectChanges();

    expect(el().querySelector('.back-office')).toBeNull();
    expect(el().querySelector('.avatar-button')).not.toBeNull();
    component.enterBackOffice();
    tick(ANIMATION_MS);

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { from: 'shop' } });
    discardPeriodicTasks();
  }));

  it('แอดมินที่ login อยู่: เข้าหน้าแรกของหลังร้านพร้อมข้อมูลผู้ใช้', fakeAsync(() => {
    setUp();
    TestBed.inject(AuthService).setSession('t', { id: 1, username: 'boss', title: 'b@test.com', role: 'admin' });

    component.enterBackOffice();
    tick(ANIMATION_MS);

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
      state: jasmine.objectContaining({ username: 'boss', role: 'admin' })
    });
    discardPeriodicTasks();
  }));
});
