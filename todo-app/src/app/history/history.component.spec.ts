import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UserCredential } from 'firebase/auth';
import { animationMethods, flushPromises, setUpPage } from '../../testing/page-test-utils';
import { FIREBASE_REAUTH_POPUP } from '../services/social-login.service';
import { HistoryComponent } from './history.component';

const request = (overrides: Record<string, unknown> = {}) => ({
  id: 9,
  sku: 'SKU-A',
  status: 'Approved',
  confirm_password: 'Passw0rd!',
  admin_note: 'ตรวจนับแล้ว',
  requested_quantity: 12,
  ...overrides
});

describe('HistoryComponent', () => {
  afterEach(() => localStorage.clear());

  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลดประวัติ', () => {
      const { fixture, component, todo } = setUpPage(HistoryComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(todo.getHistory).toHaveBeenCalled();
      expect(component.isSocialLogin).toBeFalse();
      fixture.destroy();
    });

    it('จำว่าเข้าระบบด้วย social login จาก localStorage', () => {
      localStorage.setItem('isSocialLogin', 'true');
      localStorage.setItem('socialProvider', 'google');
      const { fixture, component } = setUpPage(HistoryComponent);

      fixture.detectChanges();

      expect(component.isSocialLogin).toBeTrue();
      expect(component.socialProvider).toBe('google');
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(HistoryComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      fixture.destroy();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(HistoryComponent, true)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(HistoryComponent);
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }

    for (const name of animationMethods(HistoryComponent, false)) {
      it(`${name} เล่น animation แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(HistoryComponent);

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  describe('ค้นหา', () => {
    const items = [
      { sku: 'SKU-A', product_name: 'Apple', created_by: 'Somchai' },
      { sku: 'SKU-B', product_name: 'Banana', created_by: 'Suda' },
      {}
    ];

    it('ช่องค้นหาว่าง: กลับไปใช้ตัวกรองตามสถานะ/วันที่', () => {
      const { component } = setUpPage(HistoryComponent);
      const filter = spyOn(component, 'filterHistory');
      component.search = ' ';

      component.filterS();

      expect(filter).toHaveBeenCalled();
    });

    it('ค้นหาด้วย SKU ชื่อสินค้า หรือผู้บันทึก (ไม่สนตัวพิมพ์) แล้วกลับไปหน้าแรก', () => {
      const { component } = setUpPage(HistoryComponent);
      component.history = items;
      component.currentPage = 4;

      component.search = 'sku-b';
      component.filterS();
      expect(component.filteredHistory).toEqual([items[1]]);
      expect(component.currentPage).toBe(1);

      component.search = 'APPLE';
      component.filterS();
      expect(component.filteredHistory).toEqual([items[0]]);

      component.search = 'suda';
      component.filterS();
      expect(component.filteredHistory).toEqual([items[1]]);
    });
  });

  describe('รูปโปรไฟล์ผู้ใช้', () => {
    it('คืนรูปของผู้ใช้ หรือรูปเริ่มต้นถ้าไม่มี', () => {
      const { component } = setUpPage(HistoryComponent);
      component.usersList = [{ username: 'somchai', profile: 'p.png' }, { username: 'suda' }];

      expect(component.getUserProfileImage('somchai')).toBe('p.png');
      expect(component.getUserProfileImage('suda')).toBe('image/user_avatar.svg');
      expect(component.getUserProfileImage('nobody')).toBe('image/user_avatar.svg');
      expect(component.getUserProfileImage('')).toBe('image/user_avatar.svg');
    });
  });

  describe('อนุมัติ/ปฏิเสธคำขอปรับสต็อก (confirmAdjustment2)', () => {
    const setUp = (selected = request(), social = false) => {
      const harness = setUpPage(HistoryComponent);
      harness.component.username = 'somchai';
      harness.component.isSocialLogin = social;
      harness.component.selectedProduct = selected;
      harness.todo.verifyPassword.and.returnValue(of({ valid: true }));
      harness.todo.updateRequestStatus.and.returnValue(of({}));
      harness.todo.getInventory.and.returnValue(of([{ sku: 'SKU-A', product_name: 'Apple', quantity: 3 }]));
      harness.todo.updateInventory.and.returnValue(of({}));
      const finalize = spyOn<any>(harness.component, 'finalizeAdjustment');
      return { ...harness, finalize };
    };

    it('ไม่เลือกสถานะ: แจ้งเตือน หยุดโหลด และไม่เรียก Backend', () => {
      const { component, todo } = setUp(request({ status: '' }));

      component.confirmAdjustment2();

      expect(component.popup).toContain('Adjustment Status');
      expect(component.isLoading).toBeFalse();
      expect(todo.verifyPassword).not.toHaveBeenCalled();
    });

    it('ไม่กรอกรหัสผ่าน: แจ้งเตือน หยุดโหลด และไม่เรียก Backend', () => {
      const { component, todo } = setUp(request({ confirm_password: '' }));

      component.confirmAdjustment2();

      expect(component.popup).toContain('Confirm Password');
      expect(component.isLoading).toBeFalse();
      expect(todo.verifyPassword).not.toHaveBeenCalled();
    });

    describe('ยืนยันด้วยรหัสผ่าน', () => {
      it('อนุมัติ: ตรวจรหัสที่ Backend แล้วอัปเดตสถานะ ผู้อนุมัติ และปรับสต็อกตามที่ขอ', () => {
        const { component, todo, finalize } = setUp();

        component.confirmAdjustment2();

        expect(todo.verifyPassword).toHaveBeenCalledOnceWith('somchai', { password: 'Passw0rd!' });
        expect(todo.updateRequestStatus).toHaveBeenCalledOnceWith(9, jasmine.objectContaining({
          status: 'Approved',
          admin_note: 'ตรวจนับแล้ว',
          approved_by: 'somchai',
          approved_date: jasmine.any(String),
          approved_time: jasmine.any(String)
        }));
        expect(todo.updateInventory).toHaveBeenCalledOnceWith('SKU-A', jasmine.objectContaining({ sku: 'SKU-A', quantity: 12 }));
        expect(finalize).toHaveBeenCalledWith('SKU-A', 'Approved');
      });

      it('ปฏิเสธ: อัปเดตสถานะอย่างเดียว ไม่แตะสต็อกและไม่ลงชื่อผู้อนุมัติ', () => {
        const { component, todo, finalize } = setUp(request({ status: 'Rejected' }));

        component.confirmAdjustment2();

        const payload = todo.updateRequestStatus.calls.mostRecent().args[1];
        expect(payload.status).toBe('Rejected');
        expect((payload as Record<string, unknown>)['approved_by']).toBeUndefined();
        expect(todo.updateInventory).not.toHaveBeenCalled();
        expect(finalize).toHaveBeenCalledWith('SKU-A', 'Rejected');
      });

      it('รหัสผ่านไม่ถูกต้อง: แจ้งเตือนและไม่อัปเดตอะไร', () => {
        const { component, todo } = setUp();
        todo.verifyPassword.and.returnValue(of({ valid: false }));

        component.confirmAdjustment2();

        expect(component.popup).toContain('Incorrect password');
        expect(component.loader).toBeFalse();
        expect(todo.updateRequestStatus).not.toHaveBeenCalled();
      });

      it('ตรวจรหัสผ่านไม่สำเร็จ: แสดงข้อความจาก Backend หรือข้อความมาตรฐาน', () => {
        const { component, todo } = setUp();

        todo.verifyPassword.and.returnValue(throwError(() => ({ error: { message: 'ลองบ่อยเกินไป' } })));
        component.confirmAdjustment2();
        expect(component.popup).toBe('ลองบ่อยเกินไป');

        todo.verifyPassword.and.returnValue(throwError(() => ({})));
        component.confirmAdjustment2();
        expect(component.popup).toContain('Unable to verify password');
        expect(component.isLoading).toBeFalse();
      });

      it('อัปเดตสถานะไม่สำเร็จ: แจ้งเตือน', () => {
        const { component, todo } = setUp();
        todo.updateRequestStatus.and.returnValue(throwError(() => new Error('db')));
        spyOn(console, 'error');

        component.confirmAdjustment2();

        expect(component.popup).toContain('error occurred while updating status');
        expect(todo.updateInventory).not.toHaveBeenCalled();
      });

      it('อนุมัติแต่ไม่พบสินค้าในคลัง: แจ้งเตือน', () => {
        const { component, todo } = setUp();
        todo.getInventory.and.returnValue(of([{ sku: 'OTHER', quantity: 1 }]));

        component.confirmAdjustment2();

        expect(component.popup).toBe('Product not found in Inventory.');
        expect(todo.updateInventory).not.toHaveBeenCalled();
      });

      it('อนุมัติแต่ปรับสต็อกไม่สำเร็จ: แจ้งว่าสถานะเปลี่ยนแล้วแต่สต็อกไม่เปลี่ยน', () => {
        const { component, todo, finalize } = setUp();
        todo.updateInventory.and.returnValue(throwError(() => new Error('db')));
        spyOn(console, 'error');

        component.confirmAdjustment2();

        expect(component.popup).toContain('failed to update Inventory');
        expect(finalize).not.toHaveBeenCalled();
      });
    });

    describe('ยืนยันด้วยบัญชี social (re-authenticate)', () => {
      const social = () => {
        const harness = setUp(request({ confirm_password: 'social_verified_success' }), true);
        harness.component.socialReauthToken = 'fresh-firebase-token';
        return harness;
      };

      it('ส่ง Firebase token ให้ Backend ตรวจ ไม่ใช่เชื่อค่าจากหน้าจอ แล้วอนุมัติ', () => {
        const { component, todo, finalize } = social();

        component.confirmAdjustment2();

        expect(todo.verifyPassword).toHaveBeenCalledOnceWith('somchai', { firebaseToken: 'fresh-firebase-token' });
        expect(todo.updateRequestStatus).toHaveBeenCalledOnceWith(9, jasmine.objectContaining({ approved_by: 'somchai' }));
        expect(todo.updateInventory).toHaveBeenCalledOnceWith('SKU-A', jasmine.objectContaining({ quantity: 12 }));
        expect(finalize).toHaveBeenCalledWith('SKU-A', 'Approved');
      });

      it('ปฏิเสธรายการ: ไม่ปรับสต็อก', () => {
        const harness = setUp(request({ confirm_password: 'social_verified_success', status: 'Rejected' }), true);

        harness.component.confirmAdjustment2();

        expect(harness.todo.updateInventory).not.toHaveBeenCalled();
        expect(harness.finalize).toHaveBeenCalledWith('SKU-A', 'Rejected');
      });

      it('token หมดอายุ/ไม่ถูกต้อง: ให้ยืนยันใหม่และไม่อัปเดตอะไร', () => {
        const { component, todo } = social();
        todo.verifyPassword.and.returnValue(of({ valid: false }));

        component.confirmAdjustment2();

        expect(component.popup).toContain('Authentication expired');
        expect(todo.updateRequestStatus).not.toHaveBeenCalled();
      });

      it('ตรวจ token ไม่สำเร็จ: แสดงข้อความจาก Backend หรือข้อความมาตรฐาน', () => {
        const { component, todo } = social();

        todo.verifyPassword.and.returnValue(throwError(() => ({ error: { message: 'ติดต่อ Firebase ไม่ได้' } })));
        component.confirmAdjustment2();
        expect(component.popup).toBe('ติดต่อ Firebase ไม่ได้');

        todo.verifyPassword.and.returnValue(throwError(() => ({})));
        component.confirmAdjustment2();
        expect(component.popup).toContain('Unable to verify identity');
      });

      it('อัปเดตสถานะไม่สำเร็จ: ไม่ปรับสต็อก', () => {
        const { component, todo } = social();
        todo.updateRequestStatus.and.returnValue(throwError(() => new Error('db')));
        spyOn(console, 'error');

        component.confirmAdjustment2();

        expect(todo.updateInventory).not.toHaveBeenCalled();
        expect(component.loader).toBeFalse();
      });

      it('ไม่พบสินค้าในคลัง / ปรับสต็อกไม่สำเร็จ: แจ้งเตือนตามกรณี', () => {
        const { component, todo, finalize } = social();
        spyOn(console, 'error');

        todo.getInventory.and.returnValue(of([]));
        component.confirmAdjustment2();
        expect(component.popup).toBe('Product not found in Inventory.');

        todo.getInventory.and.returnValue(of([{ sku: 'SKU-A', quantity: 3 }]));
        todo.updateInventory.and.returnValue(throwError(() => new Error('db')));
        component.confirmAdjustment2();
        expect(component.popup).toContain('failed to update Inventory');
        expect(finalize).not.toHaveBeenCalled();
      });
    });
  });

  describe('ยืนยันตัวตนซ้ำด้วย Google', () => {
    const credential = (token = 'fresh-token') =>
      ({ user: { getIdToken: jasmine.createSpy('getIdToken').and.resolveTo(token) } }) as unknown as UserCredential;

    it('สำเร็จ: ขอ token ใหม่ จำไว้ และทำเครื่องหมายว่ายืนยันแล้ว', async () => {
      const reauth = jasmine.createSpy('reauth').and.resolveTo(credential());
      const { component } = setUpPage(HistoryComponent, undefined, [{ provide: FIREBASE_REAUTH_POPUP, useValue: reauth }]);
      component.selectedProduct = {};

      component.reAuthenticateWithGoogle();
      expect(component.isLoading).toBeTrue();
      await flushPromises();

      expect(component.socialReauthToken).toBe('fresh-token');
      expect(component.selectedProduct.confirm_password).toBe('social_verified_success');
      expect(component.popup).toBe('Authentication successful');
      expect(component.isLoading).toBeFalse();
    });

    it('ไม่มีผู้ใช้ Firebase ค้างอยู่: ไม่ทำอะไรและหยุดโหลด', async () => {
      const reauth = jasmine.createSpy('reauth').and.resolveTo(null);
      const { component } = setUpPage(HistoryComponent, undefined, [{ provide: FIREBASE_REAUTH_POPUP, useValue: reauth }]);

      component.reAuthenticateWithGoogle();
      await flushPromises();

      expect(component.socialReauthToken).toBe('');
      expect(component.showpopup).toBeFalse();
      expect(component.isLoading).toBeFalse();
    });

    it('ผู้ใช้ปิด popup / ล้มเหลว: แจ้งเตือนและหยุดโหลด', async () => {
      const reauth = jasmine.createSpy('reauth').and.rejectWith(new Error('popup closed'));
      const { component } = setUpPage(HistoryComponent, undefined, [{ provide: FIREBASE_REAUTH_POPUP, useValue: reauth }]);
      spyOn(console, 'error');

      component.reAuthenticateWithGoogle();
      await flushPromises();

      expect(component.popup).toContain('Authentication failed');
      expect(component.isLoading).toBeFalse();
    });
  });
});
