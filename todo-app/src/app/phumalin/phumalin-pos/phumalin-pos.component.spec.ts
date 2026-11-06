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
    // บรรจุภัณฑ์ไม่มีสินค้า -> ไม่แสดง
    expect(cats).toEqual(['ทั้งหมด', 'ผัก', 'เนื้อสัตว์', 'ของแห้ง']);
    expect(el.textContent).not.toContain('$');
    expect(card(el, 'Rice').disabled).toBeFalse();
    expect(card(el, 'Cabbage').querySelector('img')?.getAttribute('src')).toBe('https://cdn.test/cabbage.jpg');
    expect(card(el, 'Pork').querySelector('img')?.getAttribute('src')).toBe('phumalin/meat.svg');
    // รูปของหมวด = รูปสินค้าในหมวดนั้น (ผักมีรูป Cabbage) / หมวดที่ไม่มีรูปสินค้าใช้ไอคอน
    const catImg = (label: string) => Array.from(el.querySelectorAll('.category-card'))
      .find((c) => c.querySelector('.category-card__title')?.textContent?.trim() === label)?.querySelector('img')?.getAttribute('src');
    expect(catImg('ผัก')).toBe('https://cdn.test/cabbage.jpg');
    expect(catImg('ทั้งหมด')).toBe('https://cdn.test/cabbage.jpg');
    expect(catImg('เนื้อสัตว์')).toBe('phumalin/meat.svg');
  });

  it('จิ้มสินค้าเพิ่มทีละ 1 (ไม่จำกัดด้วยคงเหลือ) แสดงยอดหลังเพิ่ม และกรองตามหมวดได้', () => {
    const { el, fixture, component, api } = open();
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

    // หมวดที่เลือกไว้ไม่มีสินค้าแล้ว -> กลับไปทั้งหมด
    component.selectCategory(component.categories.find((c) => c.id === 'dry')!);
    api.getItems.and.returnValue(of([pmItem({ id: 1, name: 'Cabbage' })]));
    component.load();
    expect(component.selectedCategory).toBe('all');
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
    component.confirmSave();
    fixture.detectChanges();
    expect(el.querySelector('.pm-error')?.textContent).toContain('ถูกลบไปแล้ว');
    expect(component.cartItems.length).toBe(1);
  });

  it('สลับเป็นร้านล่าง: โหลดของร้านล่างและล้างรายการที่เลือกไว้ / เหลือเฉพาะหมวดที่ร้านล่างมีสินค้า', () => {
    const { el, fixture, component, state } = open();
    card(el, 'Cabbage').click();
    state.setStore('lower');
    fixture.detectChanges();
    expect(Array.from(el.querySelectorAll('.category-card__title')).map((c) => c.textContent?.trim())).toEqual(['ทั้งหมด', 'ผัก']);
    expect(component.cartItems.length).toBe(0);
    expect(el.querySelectorAll('.product-card').length).toBe(1);
    expect(el.textContent).toContain('Chili');
  });

  it('มือถือ: ไอคอนตะกร้าแสดงจำนวนรายการ กดแล้วเปิดรายการ / กดปิดหรือ Esc ปิด', () => {
    const { el, fixture } = open();
    const btn = el.querySelector<HTMLButtonElement>('.pm-cart-btn')!;
    expect(btn.querySelector('.pm-cart-btn__badge')).toBeNull();
    card(el, 'Cabbage').click();
    card(el, 'Pork').click();
    fixture.detectChanges();
    expect(btn.querySelector('.pm-cart-btn__badge')?.textContent?.trim()).toBe('2');

    btn.click();
    fixture.detectChanges();
    expect(el.querySelector('.right-side')?.classList).toContain('pm-cart-open');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.classList).toContain('pm-cart-btn--hidden');
    expect(document.body.classList).toContain('pm-cart-lock'); // หน้าข้างหลังไม่เลื่อน

    el.querySelector<HTMLButtonElement>('.pm-cart-close')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.right-side')?.classList).not.toContain('pm-cart-open');
    expect(document.body.classList).not.toContain('pm-cart-lock');

    btn.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.right-side')?.classList).not.toContain('pm-cart-open');
  });

  it('โหมดลด: ปุ่มสลับข้างช่องค้นหา / จิ้มไม่เกินคงเหลือ / ของหมดจิ้มไม่ได้ / ยืนยันแล้วเรียก withdraw', fakeAsync(() => {
    const { el, fixture, component, api } = open();
    api.withdraw.and.returnValue(of({ success: true, order_code: 'UP-123456', items: [] }));
    const modeBtn = (label: string) => Array.from(el.querySelectorAll<HTMLButtonElement>('.pm-mode__btn')).find((b) => b.textContent?.includes(label))!;
    expect(modeBtn('เพิ่ม').getAttribute('aria-checked')).toBe('true');

    modeBtn('ลด').click();
    fixture.detectChanges();
    expect(component.mode).toBe('remove');
    expect(card(el, 'Rice').disabled).toBeTrue(); // คงเหลือ 0
    expect(el.textContent).toContain('ยืนยันลดสินค้า');

    card(el, 'Pork').click();
    card(el, 'Pork').click(); // คงเหลือ 1.5 -> ไม่เกิน 1.5
    fixture.detectChanges();
    expect(component.getCartQuantity(2)).toBe(1.5);
    expect(component.totalAfter(component.cartItems[0])).toBe(0);
    expect(el.textContent).toContain('หลังลด');

    component.openConfirm();
    component.confirmSave();
    expect(api.withdraw).toHaveBeenCalledWith('upper', [{ id: 2, quantity: 1.5 }], '');
    expect(api.restock).not.toHaveBeenCalled();
    tick(1800);
  }));

  it('สลับเป็นโหมดลด: รายการที่เลือกไว้ไม่เกินคงเหลือ และของหมดถูกตัดออก / สลับกลับเพิ่มได้ปกติ', () => {
    const { el, component } = open();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click();
    card(el, 'Cabbage').click(); // 3 แต่คงเหลือ 2
    card(el, 'Rice').click();    // คงเหลือ 0
    component.setMode('remove');
    expect(component.cartItems.map((e) => [e.item.name, e.quantity])).toEqual([['Cabbage', 2]]);

    component.setMode('add');
    card(el, 'Rice').click();
    expect(component.getCartQuantity(3)).toBe(1);
    expect(component.totalAfter(component.cartItems[0])).toBe(4); // 2 + 2
  });

  it('โหมดลด: ของไม่พอ (เครื่องอื่นลดไปก่อน) แสดงข้อความจาก API', () => {
    const { el, fixture, component, api } = open();
    api.withdraw.and.returnValue(throwError(() => ({ error: { message: 'Cabbage ไม่พอ เหลือ 0 kg' } })));
    component.setMode('remove');
    card(el, 'Cabbage').click();
    component.openConfirm();
    component.confirmSave();
    fixture.detectChanges();
    expect(el.querySelector('.pm-error')?.textContent).toContain('ไม่พอ');
  });
});
