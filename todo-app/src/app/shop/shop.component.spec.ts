import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ShopProduct, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';
import { ANIMATION_MS, LOW_STOCK, ShopComponent } from './shop.component';

const PRODUCTS: ShopProduct[] = [
  { sku: 'A1', product_name: 'Apple', category: 'Fruit', brand: 'FarmA', price: '25.50', quantity: 20, picture: 'a.png' },
  { sku: 'B1', product_name: 'Banana', category: 'Fruit', brand: null, price: 10, quantity: LOW_STOCK, picture: null },
  { sku: 'C1', product_name: 'Cola', category: 'Drink', brand: 'Fizz', price: 15, quantity: 0, picture: null },
  { sku: 'D1', product_name: 'Durian', category: null, brand: null, price: 300, quantity: null, picture: null }
];

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

  const el = () => fixture.nativeElement as HTMLElement;
  const text = () => el().textContent ?? '';
  const cards = () => el().querySelectorAll<HTMLButtonElement>('.card-open');
  const fillCustomer = (phone = '081-234-5678') => {
    component.customer = { customer_name: ' สมชาย ', phone, address: ' กรุงเทพฯ ', note: '' };
  };

  beforeEach(() => {
    localStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['getShopProducts', 'createShopOrder', 'logAudit', 'getShopCart', 'saveShopCart']);
    todoService.getShopProducts.and.returnValue(of(PRODUCTS));
    todoService.getShopCart.and.returnValue(of({ items: [] }));
    todoService.saveShopCart.and.callFake(items => of({ items }));
  });

  afterEach(() => localStorage.clear());

  // ---------- รายการสินค้า ----------

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
    component.addToCart(PRODUCTS[0]);
    component.openCheckout();

    component.submitOrder();
    expect(component.orderError).toContain('name and delivery address');

    fillCustomer('12345');
    component.submitOrder();
    expect(component.orderError).toContain('phone number');
    expect(todoService.createShopOrder).not.toHaveBeenCalled();
  });

  it('สั่งซื้อสำเร็จ: ส่งข้อมูลที่ตัดช่องว่างแล้ว ล้างตะกร้า และแสดงเลขคำสั่งซื้อ', () => {
    todoService.createShopOrder.and.returnValue(of({ success: true, order_code: 'WEB-000007', total: 51 }));
    setUp();
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
    expect(text()).toContain('WEB-000007');

    el().querySelector<HTMLButtonElement>('.success .btn-primary')!.click();
    expect(component.checkoutOpen).toBeFalse();
  });

  it('สั่งซื้อไม่สำเร็จเพราะของไม่พอ: แสดงข้อความจากระบบและโหลดสต็อกใหม่', () => {
    todoService.createShopOrder.and.returnValue(
      throwError(() => ({ status: 409, error: { message: 'สินค้า Apple คงเหลือไม่พอ' } }))
    );
    setUp();
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
