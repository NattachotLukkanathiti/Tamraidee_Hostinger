import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ShopProduct, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';
import { LOW_STOCK, ShopComponent } from './shop.component';

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
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['getShopProducts', 'createShopOrder']);
    todoService.getShopProducts.and.returnValue(of(PRODUCTS));
  });

  afterEach(() => localStorage.clear());

  // ---------- รายการสินค้า ----------

  it('แสดงสินค้าทุกชิ้นพร้อมราคาและสถานะสต็อก', () => {
    setUp();

    expect(cards()).toHaveSize(4);
    expect(text()).toContain('฿25.50');
    expect(text()).toContain('มีสินค้า');
    expect(text()).toContain(`เหลือ ${LOW_STOCK} ชิ้น`);
    expect(text()).toContain('สินค้าหมด');
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

    component.searchTerm = 'ไม่มีสินค้านี้';
    fixture.detectChanges();
    expect(text()).toContain('ไม่พบสินค้าที่ตรงกับการค้นหา');
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

    el().querySelector<HTMLButtonElement>('.brand')!.click();

    expect(component.selectedCategory).toBe(component.allLabel);
    expect(component.searchTerm).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/shop']);
  });

  // ---------- รายละเอียดสินค้า ----------

  it('หน้ารายละเอียด: แสดงข้อมูลสินค้าและสินค้าหมวดเดียวกัน', () => {
    setUp('A1');

    expect(component.selectedProduct?.product_name).toBe('Apple');
    expect(text()).toContain('FarmA');
    expect(text()).toContain('สินค้าในหมวดเดียวกัน');
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
    expect(text()).toContain('สินค้าหมดชั่วคราว');
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

    expect(text()).toContain('ไม่พบสินค้ารหัส "NOPE"');
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
    expect(text()).toContain('โหลดข้อมูลสินค้าไม่สำเร็จ');

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

  it('ใส่ตะกร้าจากการ์ด: นับจำนวน แสดงในแผงตะกร้า และใส่เกินสต็อกไม่ได้', fakeAsync(() => {
    setUp();
    const addB1 = () => el().querySelectorAll<HTMLButtonElement>('.add-btn')[1].click();

    for (let i = 0; i < LOW_STOCK; i++) addB1();
    fixture.detectChanges();

    expect(cart.quantityOf('B1')).toBe(LOW_STOCK);
    expect(el().querySelector('.badge')?.textContent).toContain(String(LOW_STOCK));
    expect(el().querySelectorAll('.cart-line')).toHaveSize(1);
    expect(component.cartTotal).toBe(10 * LOW_STOCK);
    expect(el().querySelectorAll<HTMLButtonElement>('.add-btn')[1].disabled).toBeTrue();

    expect(component.addToCart(PRODUCTS[1])).toBeFalse();
    expect(component.toast).toContain('ครบจำนวน');
    tick(2500);
    expect(component.toast).toBe('');
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

    expect(text()).toContain('ครบจำนวนที่มีแล้ว');
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

  it('เปิด/ปิดแผงตะกร้า และปุ่ม Esc ปิดทุกหน้าต่าง', () => {
    setUp();

    el().querySelector<HTMLButtonElement>('.cart-toggle')!.click();
    fixture.detectChanges();
    expect(component.cartOpen).toBeTrue();
    expect(el().querySelector('.cart-panel')?.classList).toContain('open');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.cartOpen).toBeFalse();
  });

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
    expect(component.orderError).toContain('ชื่อและที่อยู่');

    fillCustomer('12345');
    component.submitOrder();
    expect(component.orderError).toContain('เบอร์โทรศัพท์');
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
    expect(component.orderError).toContain('สั่งซื้อไม่สำเร็จ');
    expect(todoService.getShopProducts).toHaveBeenCalledTimes(1);
  });

  it('ระหว่างกำลังส่งคำสั่งซื้อ ปิดหน้าต่างไม่ได้', () => {
    setUp();
    component.checkoutOpen = true;
    component.isSubmitting = true;

    component.closeCheckout();

    expect(component.checkoutOpen).toBeTrue();
  });

  // ---------- ปุ่มเข้าสู่ระบบ ----------

  it('ยังไม่ login: ปุ่มพาไปหน้า /login', () => {
    setUp();

    expect(text()).toContain('เข้าสู่ระบบ');
    el().querySelector<HTMLButtonElement>('.header-actions .btn-outline')!.click();

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('login อยู่แล้ว: ปุ่มพาเข้าหน้าแรกของ role พร้อมข้อมูลผู้ใช้', () => {
    setUp();
    TestBed.inject(AuthService).setSession('t', { id: 1, username: 'pos1', title: 'p@test.com', role: 'pos' });
    fixture.detectChanges();

    expect(text()).toContain('เข้าระบบหลังร้าน');
    component.goToSystem();

    expect(router.navigate).toHaveBeenCalledWith(['/pos'], {
      state: jasmine.objectContaining({ username: 'pos1', role: 'pos' })
    });
  });
});
