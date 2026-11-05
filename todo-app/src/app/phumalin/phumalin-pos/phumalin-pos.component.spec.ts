import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PhumalinPosComponent } from './phumalin-pos.component';
import { pmItem, setUpPhumalin } from '../phumalin-test-utils';

describe('PhumalinPosComponent', () => {
  const ITEMS = [
    pmItem({ id: 1, name: 'Cabbage', quantity: 2, category: 'vegetable' }),
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

  it('แสดงวัตถุดิบ / หมวดหมู่ 4 หมวด + All / ไม่มีราคา', () => {
    const { el, api } = open();
    expect(api.getItems).toHaveBeenCalledWith('upper');
    expect(el.querySelectorAll('.product-card').length).toBe(3);
    const cats = Array.from(el.querySelectorAll('.category-card__title')).map((c) => c.textContent?.trim());
    expect(cats).toEqual(['All Categories', 'ผัก', 'เนื้อสัตว์', 'ของแห้ง', 'บรรจุภัณฑ์']);
    expect(el.textContent).not.toContain('$');
    expect(card(el, 'Rice').disabled).toBeTrue();
  });

  it('จิ้มวัตถุดิบเพิ่มทีละ 1 ไม่เกินคงเหลือ และกรองตามหมวดได้', () => {
    const { el, fixture, component } = open();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click();
    card(el, 'Pork').click();
    card(el, 'Pork').click();
    fixture.detectChanges();
    expect(component.getCartQuantity(1)).toBe(2);
    expect(component.getCartQuantity(2)).toBe(1.5);
    expect(el.querySelectorAll('.cart-row').length).toBe(2);

    component.selectCategory(component.categories[2]);
    fixture.detectChanges();
    expect(el.querySelectorAll('.product-card').length).toBe(1);
  });

  it('ยืนยันเบิก: ส่งรายการไป API แสดงรหัส แล้วล้างรายการ', fakeAsync(() => {
    const { el, fixture, component, api } = open();
    api.withdraw.and.returnValue(of({ success: true, order_code: 'UP-123456', items: [] }));
    card(el, 'Cabbage').click();
    component.note = ' lunch ';
    component.openConfirm();
    fixture.detectChanges();
    (el.querySelector('.btn-confirm') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.withdraw).toHaveBeenCalledWith('upper', [{ id: 1, quantity: 1 }], 'lunch');
    expect(el.textContent).toContain('UP-123456');
    expect(component.cartItems.length).toBe(0);
    tick(1500 + 300);
    expect(component.showConfirm).toBeFalse();
  }));

  it('เบิกไม่สำเร็จ: แสดงข้อความจาก API และรายการยังอยู่', () => {
    const { el, fixture, component, api } = open();
    api.withdraw.and.returnValue(throwError(() => ({ error: { message: 'Not enough Cabbage: 0 kg left.' } })));
    card(el, 'Cabbage').click();
    component.openConfirm();
    component.confirmWithdraw();
    fixture.detectChanges();
    expect(el.querySelector('.pm-error')?.textContent).toContain('Not enough Cabbage');
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
