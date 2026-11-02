import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { mockHistoryState } from '../../testing/page-test-utils';
import { ResetComponent } from './reset.component';

const VALID_PASSWORD = 'NewPass@123';

describe('ResetComponent', () => {
  let fixture: ComponentFixture<ResetComponent>;
  let component: ResetComponent;
  let http: HttpTestingController;
  let router: Router;

  const create = (state: object | null) => {
    mockHistoryState(state);
    TestBed.configureTestingModule({
      imports: [ResetComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ResetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  afterEach(() => http.verify());

  describe('เข้าหน้าพร้อม reset token จากหน้ายืนยัน OTP', () => {
    beforeEach(() => create({ userData: { title: 'somchai@test.com' }, resetToken: 'reset-token' }));

    it('จำอีเมลและ token ไว้ ไม่แสดงข้อผิดพลาด', () => {
      expect(component.title).toBe('somchai@test.com');
      expect(component.resetToken).toBe('reset-token');
      expect(component.showpopupnoti).toBeFalse();
    });

    it('รหัสผ่านไม่ตรงตามเงื่อนไข: แจ้งเตือนและไม่เรียก Backend', () => {
      component.password = 'weak';
      component.confirmPassword = 'weak';

      component.addTodo();

      expect(component.showpopupnoti).toBeTrue();
      expect(component.isLoading).toBeFalse();
      http.expectNone(`${environment.apiBase}/api/reset-password`);
    });

    it('รหัสผ่านสองช่องไม่ตรงกัน: แจ้งเตือนและไม่เรียก Backend', () => {
      component.password = VALID_PASSWORD;
      component.confirmPassword = 'Different@123';

      component.addTodo();

      expect(component.popup).toBe('รหัสผ่านไม่ตรงกัน');
      http.expectNone(`${environment.apiBase}/api/reset-password`);
    });

    it('เปลี่ยนรหัสสำเร็จ: ส่ง reset token ไปด้วย แล้วไปหน้า login เมื่อกด OK', () => {
      component.password = VALID_PASSWORD;
      component.confirmPassword = VALID_PASSWORD;

      component.addTodo();

      const req = http.expectOne(`${environment.apiBase}/api/reset-password`);
      expect(req.request.body).toEqual({ title: 'somchai@test.com', password: VALID_PASSWORD, resetToken: 'reset-token' });
      req.flush({ success: true });

      expect(component.popup).toBe('Reset Password Completed');
      expect(component.isLoading).toBeFalse();

      component.closepopup();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('Backend ปฏิเสธ (เช่น token หมดอายุ): แสดงข้อความจาก Backend หรือข้อความมาตรฐาน', () => {
      component.password = VALID_PASSWORD;
      component.confirmPassword = VALID_PASSWORD;

      component.addTodo();
      http.expectOne(`${environment.apiBase}/api/reset-password`)
        .flush({ message: 'สิทธิ์หมดอายุ' }, { status: 403, statusText: 'Forbidden' });
      expect(component.popup).toBe('สิทธิ์หมดอายุ');

      component.addTodo();
      http.expectOne(`${environment.apiBase}/api/reset-password`).flush(null, { status: 500, statusText: 'Error' });
      expect(component.popup).toContain('ไม่สามารถเปลี่ยนรหัสผ่านได้');
    });

    it('ปิด popup ที่ไม่ใช่การเปลี่ยนรหัสสำเร็จ ไม่เปลี่ยนหน้า', () => {
      component.openpopupnoti('error');
      component.closepopup();

      expect(component.showpopupnoti).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('สลับการแสดงรหัสผ่านได้', () => {
      component.togglePasswordVisibility();
      component.toggleConfirmPassword();

      expect(component.showPassword).toBeTrue();
      expect(component.showConfirmPassword).toBeTrue();
    });
  });

  describe('เข้าหน้าโดยไม่ผ่านการยืนยัน OTP', () => {
    it('ไม่มี reset token: แจ้งเตือนแล้วส่งกลับหน้า /forgot', fakeAsync(() => {
      create({ userData: { title: 'somchai@test.com' } });

      expect(component.showpopupnoti).toBeTrue();
      expect(component.resetToken).toBe('');

      tick(2000);
      expect(router.navigate).toHaveBeenCalledWith(['/forgot']);
    }));

    it('ไม่มี state เลย: แจ้งเตือนเช่นกัน', fakeAsync(() => {
      create(null);

      expect(component.showpopupnoti).toBeTrue();
      tick(2000);
      component.ngOnDestroy();
    }));
  });
});
