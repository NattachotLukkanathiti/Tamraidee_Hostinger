import { of, throwError } from 'rxjs';
import { PhumalinInventoryComponent } from './phumalin-inventory.component';
import { pmItem, pmMove, setUpPhumalin } from '../phumalin-test-utils';

describe('PhumalinInventoryComponent', () => {
  const ITEMS = [
    pmItem({ id: 1, name: 'Cabbage', quantity: 5 }),
    pmItem({ id: 2, name: 'Pork', category: 'meat', quantity: 0, note: 'order more' })
  ];

  const open = () => {
    const page = setUpPhumalin(PhumalinInventoryComponent);
    page.api.getItems.and.returnValue(of(ITEMS));
    page.api.getMovements.and.returnValue(of([pmMove({ item_id: 2, item_name: 'Pork', quantity: 1 })]));
    return { ...page, ...page.create() };
  };

  it('แสดงตาราง ชื่อ / หมวด / หน่วย / คงเหลือ / หมายเหตุ (หัวตารางภาษาไทย) และกรองได้', () => {
    const { el, fixture, component } = open();
    expect(Array.from(el.querySelectorAll('.table .sku')).map((h) => h.textContent?.trim())).toEqual(['ชื่อ', 'หมวดหมู่', 'หน่วย', 'คงเหลือ', 'หมายเหตุ']);
    expect(el.querySelectorAll('.table_detail').length).toBe(2);
    expect(el.textContent).toContain('เนื้อสัตว์');
    expect(el.textContent).toContain('order more');

    component.selectedStockFilter = 'out';
    component.applyFilters();
    fixture.detectChanges();
    expect(el.querySelectorAll('.table_detail').length).toBe(1);

    component.selectedStockFilter = 'all';
    component.search = 'cab';
    component.applyFilters();
    fixture.detectChanges();
    expect(el.querySelector('.table_detail')?.textContent).toContain('Cabbage');
  });

  it('เพิ่มวัตถุดิบ: ข้อมูลไม่ครบไม่ส่ง / ครบแล้วส่งชื่อ หน่วย หมวด คงเหลือ หมายเหตุ ไปร้านที่เลือก', () => {
    const { component, api, state } = open();
    api.addItem.and.returnValue(of({ success: true, data: ITEMS[0] }));
    state.setStore('lower');
    component.button_imports();
    component.saveNewItem();
    expect(api.addItem).not.toHaveBeenCalled();
    expect(component.formError).toContain('กรอกข้อมูล');

    component.newItem = { name: 'Garlic', unit: 'kg', category: 'vegetable', quantity: 1, note: '', picture: 'javascript:alert(1)' };
    component.saveNewItem();
    expect(api.addItem).not.toHaveBeenCalled();
    expect(component.formError).toContain('ลิงก์รูปภาพ');

    component.newItem = { name: ' Garlic ', unit: 'kg', category: 'vegetable', quantity: 2.5, note: ' shelf ', picture: ' https://cdn.test/garlic.jpg ' };
    component.saveNewItem();
    expect(api.addItem).toHaveBeenCalledWith('lower', {
      name: 'Garlic', unit: 'kg', category: 'vegetable', quantity: 2.5, note: 'shelf', picture: 'https://cdn.test/garlic.jpg'
    });
    expect(component.showpopup).toBeTrue();
  });

  it('Add Quantity: เติมจำนวนให้วัตถุดิบที่เลือก / API error แสดงในฟอร์ม', () => {
    const { component, api } = open();
    api.stockIn.and.returnValue(of({ success: true, data: ITEMS[1] }));
    component.button_adds();
    component.addQty = { itemId: 2, quantity: 3, note: '' };
    component.saveAddQuantity();
    expect(api.stockIn).toHaveBeenCalledWith('upper', 2, 3, '');

    api.stockIn.and.returnValue(throwError(() => ({ error: { message: 'ไม่พบสินค้านี้' } })));
    component.button_adds();
    component.addQty = { itemId: 2, quantity: 1, note: '' };
    component.saveAddQuantity();
    expect(component.formError).toBe('ไม่พบสินค้านี้');
  });

  it('แก้ไขต้องกดยืนยันก่อน / ลบต้องกดยืนยันก่อน', () => {
    const { component, api } = open();
    api.updateItem.and.returnValue(of({ success: true, data: ITEMS[0] }));
    api.deleteItem.and.returnValue(of({ success: true }));

    component.button_editt(ITEMS[0]);
    component.editItem.quantity = 4;
    component.editt();
    expect(component.showpopupedit).toBeTrue();
    expect(api.updateItem).not.toHaveBeenCalled();
    component.saveEdit();
    expect(api.updateItem).toHaveBeenCalledWith('upper', 1, jasmine.objectContaining({ quantity: 4, name: 'Cabbage' }));

    component.button_delete(ITEMS[1]);
    expect(api.deleteItem).not.toHaveBeenCalled();
    component.confirmdelete();
    expect(api.deleteItem).toHaveBeenCalledWith('upper', 2);
  });

  it('รูปในตาราง: มีลิงก์รูปใช้ลิงก์นั้น ไม่มีใช้ไอคอนหมวด / ฟอร์มเพิ่มมีช่อง Image URL พร้อมรูปตัวอย่าง', () => {
    const page = setUpPhumalin(PhumalinInventoryComponent);
    page.api.getItems.and.returnValue(of([pmItem({ id: 1, picture: 'https://cdn.test/a.jpg' }), pmItem({ id: 2, name: 'Pork', category: 'meat' })]));
    const { el, fixture, component } = page.create();
    const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('.profile_employee')).map((img) => img.getAttribute('src'));
    expect(imgs).toEqual(['https://cdn.test/a.jpg', 'phumalin/meat.svg']);

    component.button_imports();
    component.newItem.picture = 'https://cdn.test/new.jpg';
    fixture.detectChanges();
    expect(el.querySelector('label[for="pm-new-picture"]')?.textContent).toContain('ลิงก์รูปภาพ');
    expect(el.querySelector('.add_image img')?.getAttribute('src')).toBe('https://cdn.test/new.jpg');
  });

  it('กดที่แถว: แสดงประวัติของวัตถุดิบนั้น', () => {
    const { el, fixture, component } = open();
    component.showHistory(ITEMS[1]);
    fixture.detectChanges();
    expect(component.historyRows.length).toBe(1);
    expect(el.textContent).toContain('เบิก');
    expect(el.textContent).toContain('-1 kg');
  });
});
