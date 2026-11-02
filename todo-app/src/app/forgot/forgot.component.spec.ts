import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { ForgotComponent } from './forgot.component';

const API = environment.apiBase;

describe('ForgotComponent', () => {
  let fixture: ComponentFixture<ForgotComponent>;
  let component: ForgotComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ForgotComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(ForgotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('ไม่กรอกอีเมล: แจ้งเตือนและไม่เรียก Backend', () => {
    component.title = '   ';
    component.onSubmit();

    expect(component.showpopupnoti).toBeTrue();
    http.expectNone(`${API}/api/check-email`);
  });

  it('อีเมลมีในระบบ: ส่ง OTP แล้วไปหน้ายืนยัน /step พร้อมจำอีเมลไว้', () => {
    component.title = 'somchai@test.com';
    component.onSubmit();

    http.expectOne(`${API}/api/check-email`).flush({ exists: true });
    const otpRequest = http.expectOne(`${API}/api/request-otp`);
    expect(otpRequest.request.body).toEqual({ title: 'somchai@test.com' });
    otpRequest.flush({ success: true });

    expect(component.isLoading).toBeFalse();
    expect(JSON.parse(sessionStorage.getItem('tempUserData') ?? '{}')).toEqual({ title: 'somchai@test.com' });
    expect(router.navigate).toHaveBeenCalledWith(['/step'], {
      state: { userData: { title: 'somchai@test.com' } }
    });
  });

  it('ไม่พบอีเมลในระบบ: แจ้งเตือนและไม่ส่ง OTP', () => {
    component.title = 'nobody@test.com';
    component.onSubmit();

    http.expectOne(`${API}/api/check-email`).flush({ exists: false });

    expect(component.isLoading).toBeFalse();
    expect(component.popup).toBe('ไม่พบอีเมลนี้ในระบบ');
    http.expectNone(`${API}/api/request-otp`);
  });

  it('ตรวจอีเมลไม่สำเร็จ: แสดงข้อความจาก Backend หรือข้อความมาตรฐาน', () => {
    component.title = 'a@test.com';
    component.onSubmit();
    http.expectOne(`${API}/api/check-email`).flush({ message: 'ขัดข้อง' }, { status: 500, statusText: 'Error' });
    expect(component.popup).toBe('ขัดข้อง');

    component.onSubmit();
    http.expectOne(`${API}/api/check-email`).flush(null, { status: 500, statusText: 'Error' });
    expect(component.popup).toBe('เกิดข้อผิดพลาดในการตรวจสอบอีเมล');
  });

  it('ส่ง OTP ไม่สำเร็จ: แสดงข้อความและหยุดโหลด', () => {
    component.title = 'a@test.com';
    component.onSubmit();
    http.expectOne(`${API}/api/check-email`).flush({ exists: true });
    http.expectOne(`${API}/api/request-otp`).flush({ message: 'ส่งไม่ได้' }, { status: 429, statusText: 'Too Many Requests' });

    expect(component.isLoading).toBeFalse();
    expect(component.popup).toBe('ส่งไม่ได้');
    expect(router.navigate).not.toHaveBeenCalled();

    component.onSubmit();
    http.expectOne(`${API}/api/check-email`).flush({ exists: true });
    http.expectOne(`${API}/api/request-otp`).flush(null, { status: 500, statusText: 'Error' });
    expect(component.popup).toBe('เกิดข้อผิดพลาดในการส่ง OTP');
  });

  it('ปิด popup ได้', () => {
    component.openpopup('hello');
    expect(component.showpopup).toBeTrue();

    component.closepopup();

    expect(component.showpopup).toBeFalse();
    expect(component.showpopupnoti).toBeFalse();
  });
});
