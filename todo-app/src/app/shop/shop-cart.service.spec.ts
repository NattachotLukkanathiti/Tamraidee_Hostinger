import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ShopCartItem, TodoService } from '../services/todo.service';
import { ShopCartService } from './shop-cart.service';

describe('ShopCartService', () => {
  // เซิร์ฟเวอร์จำลอง: เก็บตะกร้าแยกตามบัญชีที่ login อยู่ (เหมือน Backend ที่ยึดผู้ใช้จาก token)
  let server: Map<number, ShopCartItem[]>;
  let todoService: jasmine.SpyObj<TodoService>;

  const userId = () => TestBed.inject(AuthService).user!.id;
  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: TodoService, useValue: todoService }] });
    return TestBed.inject(ShopCartService);
  };
  const loginAs = (id: number) =>
    TestBed.inject(AuthService).setSession('t', { id, username: `u${id}`, title: `u${id}@test.com` });

  beforeEach(() => {
    localStorage.clear();
    server = new Map();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['getShopCart', 'saveShopCart']);
    todoService.getShopCart.and.callFake(() => of({ items: server.get(userId()) ?? [] }));
    todoService.saveShopCart.and.callFake(items => {
      server.set(userId(), items);
      return of({ items });
    });
  });
  afterEach(() => localStorage.clear());

  it('เพิ่มสินค้าได้ไม่เกินสต็อก และคืนจำนวนที่เพิ่มได้จริง', () => {
    const cart = create();

    expect(cart.add('A', 3, 5)).toBe(3);
    expect(cart.add('A', 3, 5)).toBe(2);
    expect(cart.add('A', 1, 5)).toBe(0);
    expect(cart.add('B', 1, 0)).toBe(0);

    expect(cart.lines).toEqual([{ sku: 'A', quantity: 5 }]);
    expect(cart.count).toBe(5);
  });

  it('แก้จำนวน ลบ และล้างตะกร้า', () => {
    const cart = create();
    cart.setQuantity('A', 2);
    cart.setQuantity('B', 1);
    cart.setQuantity('A', 4);

    expect(cart.lines).toEqual([{ sku: 'A', quantity: 4 }, { sku: 'B', quantity: 1 }]);
    cart.remove('A');
    expect(cart.lines).toEqual([{ sku: 'B', quantity: 1 }]);
    cart.clear();
    expect(cart.count).toBe(0);
  });

  it('จำตะกร้าไว้ใน localStorage และข้ามข้อมูลที่เสีย', () => {
    create().add('A', 2, 10);
    expect(create().lines).toEqual([{ sku: 'A', quantity: 2 }]);

    localStorage.setItem('shopCart', JSON.stringify([{ sku: 'A', quantity: 1 }, { sku: 1 }, { sku: 'B', quantity: -1 }]));
    expect(create().lines).toEqual([{ sku: 'A', quantity: 1 }]);

    localStorage.setItem('shopCart', '{oops');
    expect(create().lines).toEqual([]);
    localStorage.setItem('shopCart', '{"sku":"A"}');
    expect(create().lines).toEqual([]);
  });

  it('localStorage ใช้ไม่ได้ ตะกร้ายังทำงานได้', () => {
    spyOn(localStorage, 'setItem').and.throwError('quota');
    const cart = create();

    cart.setQuantity('A', 1);

    expect(cart.count).toBe(1);
  });

  it('ยังไม่ login: ไม่เรียกเซิร์ฟเวอร์', fakeAsync(() => {
    create().add('A', 1, 10);
    tick(1000);

    expect(todoService.getShopCart).not.toHaveBeenCalled();
    expect(todoService.saveShopCart).not.toHaveBeenCalled();
  }));

  it('แยกตะกร้าตามบัญชี: สลับบัญชีแล้วไม่เห็นของคนอื่น และกลับมาเจอตะกร้าเดิม', fakeAsync(() => {
    const cart = create();
    const auth = TestBed.inject(AuthService);

    loginAs(1);
    expect(cart.lines).toEqual([]);
    cart.add('A', 2, 10);
    tick(400);

    loginAs(2);
    expect(cart.count).toBe(0);
    cart.add('B', 1, 10);
    tick(400);

    auth.clearSession();
    expect(cart.lines).toEqual([]);

    loginAs(1);
    expect(cart.lines).toEqual([{ sku: 'A', quantity: 2 }]);
    cart.clear();
    tick(400);
    expect(server.get(1)).toEqual([]);

    loginAs(2);
    expect(cart.lines).toEqual([{ sku: 'B', quantity: 1 }]);
  }));

  it('login เครื่องอื่น: ดึงตะกร้าของบัญชีจากเซิร์ฟเวอร์', () => {
    server.set(7, [{ sku: 'X', quantity: 3 }, { sku: 'bad', quantity: 0 }]);
    loginAs(7);
    const cart = create();

    expect(cart.lines).toEqual([{ sku: 'X', quantity: 3 }]);
    expect(JSON.parse(localStorage.getItem('shopCart:7')!)).toEqual([{ sku: 'X', quantity: 3 }]);
  });

  it('ของที่ใส่ไว้ก่อน login ถูกรวมเข้าตะกร้าของบัญชี แล้วตะกร้า guest ว่าง', fakeAsync(() => {
    server.set(1, [{ sku: 'A', quantity: 98 }]);
    const cart = create();
    cart.add('A', 5, 10);
    cart.add('G', 1, 10);

    loginAs(1);

    expect(cart.lines).toEqual([{ sku: 'A', quantity: 99 }, { sku: 'G', quantity: 1 }]);
    expect(localStorage.getItem('shopCart')).toBeNull();
    tick(400);
    expect(server.get(1)).toEqual([{ sku: 'A', quantity: 99 }, { sku: 'G', quantity: 1 }]);
  }));

  it('แก้ตะกร้าถี่ ๆ ส่งไปเซิร์ฟเวอร์ครั้งเดียว', fakeAsync(() => {
    loginAs(1);
    const cart = create();

    cart.add('A', 1, 10);
    cart.add('A', 1, 10);
    cart.add('A', 1, 10);
    tick(400);

    expect(todoService.saveShopCart).toHaveBeenCalledOnceWith([{ sku: 'A', quantity: 3 }]);
  }));

  it('ดึงตะกร้าจากเซิร์ฟเวอร์ไม่ได้: ใช้สำเนาในเครื่องต่อไป', () => {
    localStorage.setItem('shopCart:1', JSON.stringify([{ sku: 'L', quantity: 2 }]));
    todoService.getShopCart.and.returnValue(throwError(() => new Error('down')));
    spyOn(console, 'error');
    loginAs(1);

    expect(create().lines).toEqual([{ sku: 'L', quantity: 2 }]);
    expect(console.error).toHaveBeenCalled();
  });

  it('ส่งตะกร้าไม่สำเร็จ: แจ้งใน console แต่ตะกร้าในหน้ายังอยู่', fakeAsync(() => {
    todoService.saveShopCart.and.returnValue(throwError(() => new Error('down')));
    spyOn(console, 'error');
    loginAs(1);
    const cart = create();

    cart.add('A', 1, 10);
    tick(400);

    expect(console.error).toHaveBeenCalled();
    expect(cart.count).toBe(1);
  }));

  it('แก้ตะกร้าระหว่างรอเซิร์ฟเวอร์: ใช้ของที่เพิ่งแก้ แล้วส่งขึ้นไปหลังโหลดเสร็จ', fakeAsync(() => {
    const response = new Subject<{ items: ShopCartItem[] }>();
    todoService.getShopCart.and.returnValue(response as Observable<{ items: ShopCartItem[] }>);
    loginAs(1);
    const cart = create();

    cart.add('NEW', 1, 10);
    tick(400);
    expect(todoService.saveShopCart).not.toHaveBeenCalled();

    response.next({ items: [{ sku: 'OLD', quantity: 1 }] });
    tick(400);

    expect(cart.lines).toEqual([{ sku: 'NEW', quantity: 1 }]);
    expect(todoService.saveShopCart).toHaveBeenCalledOnceWith([{ sku: 'NEW', quantity: 1 }]);
  }));

  it('สลับบัญชีก่อนเซิร์ฟเวอร์ตอบ: ไม่เอาตะกร้าของบัญชีเก่ามาใส่', () => {
    const response = new Subject<{ items: ShopCartItem[] }>();
    todoService.getShopCart.and.returnValues(response, of({ items: [] }));
    loginAs(1);
    const cart = create();
    expect(cart.count).toBe(0);

    loginAs(2);
    expect(cart.count).toBe(0);
    response.next({ items: [{ sku: 'ONE', quantity: 1 }] });

    expect(cart.lines).toEqual([]);
  });
});
