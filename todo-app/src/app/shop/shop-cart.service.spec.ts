import { TestBed } from '@angular/core/testing';
import { ShopCartService } from './shop-cart.service';

describe('ShopCartService', () => {
  const create = () => {
    TestBed.resetTestingModule();
    return TestBed.inject(ShopCartService);
  };

  beforeEach(() => localStorage.clear());
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
});
