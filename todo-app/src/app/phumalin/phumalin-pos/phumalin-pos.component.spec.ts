import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PhumalinPosComponent } from './phumalin-pos.component';
import { pmItem, setUpPhumalin } from '../phumalin-test-utils';

describe('PhumalinPosComponent', () => {
  const ITEMS = [
    pmItem({ id: 1, name: 'Cabbage', quantity: 2, category: 'vegetable', picture: 'https://cdn.test/cabbage.jpg' }),
    pmItem({ id: 2, name: 'Pork', quantity: 1.5, category: 'meat' }),
    pmItem({ id: 3, name: 'Rice', quantity: 0, category: 'dry', unit: 'bag' })
  ];

  const open = () => {
    const page = setUpPhumalin(PhumalinPosComponent);
    page.api.getItems.and.callFake((store) => of(store === 'upper' ? ITEMS : [pmItem({ id: 9, store: 'lower', name: 'Chili' })]));
    return { ...page, ...page.create() };
  };
  const card = (el: HTMLElement, name: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('.product-card')).find((b) => b.textContent?.includes(name))!;

  it('แสดงสินค้า / หมวดหมู่ 4 หมวด + All / ไม่มีราคา / ของหมดก็กดเพิ่มได้', () => {
    const { el, api } = open();
    expect(api.getItems).toHaveBeenCalledWith('upper');
    expect(el.querySelectorAll('.product-card').length).toBe(3);
    const cats = Array.from(el.querySelectorAll('.category-card__title')).map((c) => c.textContent?.trim());
    expect(cats).toEqual(['ทั้งหมด', 'ผัก', 'เนื้อสัตว์', 'ของแห้ง', 'บรรจุภัณฑ์']);
    expect(el.textContent).not.toContain('$');
    expect(card(el, 'Rice').disabled).toBeFalse();
    expect(card(el, 'Cabbage').querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/cabbage.jpg');
    expect(card(el, 'Pork').querySelector('img')?.getAttribute('src')).toBe('phumalin/meat.svg');
  });

  it('จิ้มสินค้าเพิ่มทีละ 1 (ไม่จำกัดด้วยคงเหลือ) แสดงยอดหลังเพิ่ม และกรองตามหมวดได้', () => {
    const { el, fixture, component } = open();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click();
    card(el, 'Rice').click();
    fixture.detectChanges();
    expect(component.getCartQuantity(1)).toBe(3);
    expect(component.getCartQuantity(3)).toBe(1);
    expect(el.querySelectorAll('.cart-row').length).toBe(2);
    expect(component.totalAfter(component.cartItems[0])).toBe(5);

    component.setQuantity(component.cartItems[1], '2.5');
    expect(component.getCartQuantity(3)).toBe(2.5);

    component.selectCategory(component.categories[2]);
    fixture.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(1);
  });

  it('ยืนยันเพิ่มสินค้า: ส่งไป API restock (ไม่ใช่ withdraw) แสดงรหัส แล้วล้างรายการ', fakeAsync(() => {
    const { el, fixture, component, api } = open();
    api.restock.and.returnValue(of({ success: true, order_code: 'UP-IN-123456', items: [] }));
    card(el, 'Cabbage').click();
    component.note = ' market ';
    component.openConfirm();
    fixture.detectChanges();
    expect(el.textContent).toContain('ยืนยันเพิ่มสินค้า');
    (el.querySelector('.btn-confirm') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.restock).toHaveBeenCalledWith('upper', [{ id: 1, quantity: 1 }], 'market');
    expect(api.withdraw).not.toHaveBeenCalled();
    expect(el.textContent).toContain('UP-IN-123456');
    expect(component.cartItems.length).toBe(0);
    tick(1500 + 300);
    expect(component.showConfirm).toBeFalse();
  }));

  it('เพิ่มไม่สำเร็จ: แสดงข้อความจาก API และรายการยังอยู่', () => {
    const { el, fixture, component, api } = open();
    api.restock.and.returnValue(throwError(() => ({ error: { message: 'มีสินค้าบางรายการถูกลบไปแล้ว กรุณาโหลดใหม่' } })));
    card(el, 'Cabbage').click();
    component.openConfirm();
    component.confirmRestock();
    fixture.detectChanges();
    expect(el.querySelector('.pm-error')?.textContent).toContain('ถูกลบไปแล้ว');
    expect(component.cartItems.length).toBe(1);
  });

  it('สลับเป็นร้านล่าง: โหลดของร้านล่างและล้างรายการที่เลือกไว้', () => {
    const { el, fixture, component, state } = open();
    card(el, 'Cabbage').click();
    state.setStore('lower');
    fixture.detectChanges();
    expect(component.cartItems.length).toBe(0);
    expect(el.querySelectorAll('.product-card').length).toBe(1);
    expect(el.textContent).toContain('Chili');
  });
});
