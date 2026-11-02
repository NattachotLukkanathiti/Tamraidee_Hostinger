import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { animationMethods, setUpPage, waitFor } from '../../testing/page-test-utils';
import { InventoryComponent } from './inventory.component';

describe('InventoryComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลดสินค้า', () => {
      const { fixture, component, todo } = setUpPage(InventoryComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(todo.getInventory).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(InventoryComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.play_Return).toBeFalse();
      expect(component.stan).toBeFalse();
      fixture.destroy();
    });

    it('state Move_return: เล่น animation ตอนกลับเข้าหน้า', () => {
      const { fixture, component } = setUpPage(InventoryComponent, { username: 'somchai', email: 's@test.com', Move_return: true });

      fixture.detectChanges();

      expect(component.play_Return).toBeTrue();
      expect(component.form_noti).toBeFalse();
      fixture.destroy();
    });

    it('ไม่มี session: แจ้งเตือนและไม่โหลดสินค้า', () => {
      const { fixture, component, todo } = setUpPage(InventoryComponent, {});

      fixture.detectChanges();

      expect(component.showpopupnoti).toBeTrue();
      expect(todo.getInventory).not.toHaveBeenCalled();
      fixture.destroy();
    });

    it('มาจากการแจ้งเตือนสต็อกต่ำ: กรองเฉพาะสินค้าใกล้หมดหลังโหลดเสร็จ', () => {
      const { fixture, component, todo } = setUpPage(InventoryComponent, {
        username: 'somchai',
        email: 's@test.com',
        filterStatus: 'Low in Stock'
      });
      todo.getInventory.and.returnValue(of([{ sku: 'A', category: 'Fruit', brand: 'B', quantity: 1, updated_at: '2026-01-01' }]));
      const filter = spyOn(component, 'filterByStockStatus');

      fixture.detectChanges();

      expect(component.selectedStockFilter).toBe('low');
      expect(filter).toHaveBeenCalled();
      fixture.destroy();
    });
  });

  describe('โหลดสินค้า', () => {
    it('เรียงล่าสุดก่อน และสรุปหมวดหมู่/ยี่ห้อที่ไม่ซ้ำ', () => {
      const { component, todo } = setUpPage(InventoryComponent);
      todo.getInventory.and.returnValue(of([
        { sku: 'OLD', category: 'Fruit', brand: 'B1', updated_at: '2026-01-01' },
        { sku: 'NEW', category: 'Fruit', brand: 'B2', updated_at: '2026-03-01' },
        { sku: 'MID', category: 'Drink', brand: '', updated_at: '2026-02-01' }
      ]));

      component.loadInventory();

      expect(component.Inventory.map((p: { sku: string }) => p.sku)).toEqual(['NEW', 'MID', 'OLD']);
      expect(component.categories).toEqual(['Fruit', 'Drink']);
      expect(component.brands).toEqual(['B2', 'B1']);
      expect(component.isLoading).toBeFalse();
    });

    it('โหลดไม่สำเร็จ: บันทึก error โดยไม่พัง', () => {
      const { component, todo } = setUpPage(InventoryComponent);
      todo.getInventory.and.returnValue(throwError(() => new Error('down')));
      const logged = spyOn(console, 'error');

      component.loadInventory();

      expect(logged).toHaveBeenCalled();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(InventoryComponent, true)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(InventoryComponent);
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  describe('เลือกรูปสินค้า', () => {
    it('เก็บไฟล์และชื่อไฟล์ แล้วสร้างรูปตัวอย่าง', async () => {
      const { component } = setUpPage(InventoryComponent);
      const file = new File(['fake-image'], 'apple.png', { type: 'image/png' });

      component.onFileSelected({ target: { files: [file] } });
      await waitFor(() => !!component.imagePreview);

      expect(component.selectedFile).toBe(file);
      expect(component.selectedFileName).toBe('apple.png');
      expect(component.imagePreview).toContain('data:image/png');
    });

    it('ยกเลิกการเลือกไฟล์: ไม่เปลี่ยนค่าเดิม', () => {
      const { component } = setUpPage(InventoryComponent);

      component.onFileSelected({ target: { files: [] } });

      expect(component.selectedFile).toBeNull();
    });
  });

  describe('พิมพ์ SKU', () => {
    const setUp = () => {
      const harness = setUpPage(InventoryComponent);
      harness.component.filteredInventory = [{ sku: 'SKU-APPLE', product_name: 'Apple', picture: 'a.png' }];
      return harness;
    };

    it('พบสินค้า (ไม่สนตัวพิมพ์): ดึงข้อมูลมาแสดงพร้อมรูป', () => {
      const { component } = setUp();

      component.onSkuChange('  sku-apple ');

      expect(component.selectedProduct.product_name).toBe('Apple');
      expect(component.imagePreview).toBe('a.png');
    });

    it('ไม่พบสินค้า: เก็บ SKU ที่พิมพ์ไว้และล้างรูป', () => {
      const { component } = setUp();

      component.onSkuChange('SKU-NOPE');

      expect(component.selectedProduct).toEqual({ sku: 'SKU-NOPE' });
      expect(component.imagePreview).toBeNull();
    });

    it('พิมพ์ไม่ถึง 5 ตัวอักษร: ยังไม่ค้นหา', () => {
      const { component } = setUp();

      component.onSkuChange('SKU');

      expect(component.selectedProduct).toEqual({ sku: 'SKU' });
    });

    it('ช่องว่าง: ไม่ทำอะไร', () => {
      const { component } = setUp();
      component.selectedProduct = { keep: true };

      component.onSkuChange('');

      expect(component.selectedProduct).toEqual({ keep: true });
    });
  });

  describe('สถานะ supplier', () => {
    it('คืนสถานะของ supplier ตามชื่อ หรือค่าว่างถ้าไม่พบ/ไม่ระบุ', () => {
      const { component } = setUpPage(InventoryComponent);
      component.suppliers = [{ supplier_name: 'ACME', status: 'Active' }];

      expect(component.getSupplierStatus('ACME')).toBe('Active');
      expect(component.getSupplierStatus('Other')).toBe('');
      expect(component.getSupplierStatus('')).toBe('');
    });
  });
});
