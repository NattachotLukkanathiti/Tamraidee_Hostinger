import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { mockHistoryState } from '../../testing/page-test-utils';
import { OtpComponent } from './otp.component';

const PENDING_USER = { username: 'somchai', title: 'somchai@test.com', password: 'Passw0rd!' };
const API = environment.apiBase;

describe('OtpComponent', () => {
  let fixture: ComponentFixture<OtpComponent>;
  let component: OtpComponent;
  let http: HttpTestingController;
  let router: Router;

  const create = (mode?: 'forget', savedUser: object | null = PENDING_USER) => {
    sessionStorage.clear();
    if (savedUser) sessionStorage.setItem('tempUserData', JSON.stringify(savedUser));

    TestBed.configureTestingModule({
      imports: [OtpComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: mode ? { mode } : {} } } }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    http = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(OtpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const fillOtp = (code = '123456') => (component.otpDigits = [...code]);

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  describe('โหมดสมัครสมาชิก', () => {
    beforeEach(() => create());

    it('แสดงหัวข้อ ข้อความ และช่องกรอก OTP 6 ช่องที่มี label ครบ', () => {
      const root: HTMLElement = fixture.nativeElement;

      expect(root.querySelector('.header')?.textContent).toContain('Email OTP Verification');
      expect(root.querySelector('.subheader')?.textContent).toContain('somchai@test.com');
      expect(root.querySelectorAll('input')).toHaveSize(6);
      for (let n = 1; n <= 6; n++) {
        expect(root.querySelector(`label[for="otp-digit-${n}"]`)).withContext(`label ${n}`).not.toBeNull();
        expect(root.querySelector(`input#otp-digit-${n}`)).withContext(`input ${n}`).not.toBeNull();
      }
      expect(root.querySelector('.button')?.textContent).toContain('Verify & Proceed');
      expect(root.querySelector('.ferni')).toBeNull();
    });

    it('ยืนยัน OTP ถูก: สมัครสำเร็จ แสดง popup แล้วไปหน้า login เมื่อกด OK', () => {
      fillOtp();
      component.submitRegister();

      const req = http.expectOne(`${API}/todos`);
      expect(req.request.body).toEqual({ ...PENDING_USER, otp: '123456', isReset: false });
      req.flush({ success: true });

      expect(component.isLoading).toBeFalse();
      expect(component.showpopup).toBeTrue();
      expect(component.popup).toBe('Your register Completed');
      expect(sessionStorage.getItem('tempUserData')).toBeNull();

      component.closepopup();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(component.showpopup).toBeFalse();
    });

    it('กรอก OTP ไม่ครบ: แจ้งเตือนและไม่ส่งข้อมูล', () => {
      fillOtp('12');
      component.submitRegister();

      expect(component.errorMessage).toContain('6');
      expect(component.showpopupnoti).toBeTrue();
      http.expectNone(`${API}/todos`);
    });

    it('OTP ผิด: แสดงข้อความจาก Backend', () => {
      fillOtp();
      component.submitRegister();
      http.expectOne(`${API}/todos`).flush({ message: 'รหัส OTP ไม่ถูกต้อง' }, { status: 400, statusText: 'Bad Request' });

      expect(component.isLoading).toBeFalse();
      expect(component.popup).toBe('รหัส OTP ไม่ถูกต้อง');
      expect(component.showpopupnoti).toBeTrue();
    });

    it('Backend ไม่ตอบข้อความ: ใช้ข้อความมาตรฐาน', () => {
      fillOtp();
      component.submitRegister();
      http.expectOne(`${API}/todos`).flush(null, { status: 500, statusText: 'Server Error' });

      expect(component.errorMessage).toContain('เกิดข้อผิดพลาด');
    });

    it('closepopup ที่ยังไม่สมัครสำเร็จ ไม่เปลี่ยนหน้า', () => {
      component.openpopupnoti('error');
      component.closepopup();

      expect(component.showpopupnoti).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('onDigitInput รับเฉพาะตัวเลขและเลื่อนโฟกัสไปช่องถัดไป', () => {
      const [first, second] = Array.from<HTMLInputElement>(fixture.nativeElement.querySelectorAll('input'));
      spyOn(second, 'focus');
      first.value = 'a7';

      component.onDigitInput({ target: first } as unknown as Event, 0, second);

      expect(first.value).toBe('7');
      expect(component.otpDigits[0]).toBe('7');
      expect(second.focus).toHaveBeenCalled();
    });

    it('onDigitInput ที่ไม่ใช่ตัวเลข ไม่เลื่อนโฟกัส (และช่องสุดท้ายไม่มีช่องถัดไป)', () => {
      const [first, second] = Array.from<HTMLInputElement>(fixture.nativeElement.querySelectorAll('input'));
      spyOn(second, 'focus');
      first.value = 'x';

      component.onDigitInput({ target: first } as unknown as Event, 0, second);
      component.onDigitInput({ target: first } as unknown as Event, 5, null);

      expect(component.otpDigits[0]).toBe('');
      expect(second.focus).not.toHaveBeenCalled();
    });

    it('Backspace ในช่องว่างถอยไปช่องก่อนหน้า แต่ช่องที่มีค่าอยู่ไม่ถอย', () => {
      const [first, second] = Array.from<HTMLInputElement>(fixture.nativeElement.querySelectorAll('input'));
      spyOn(first, 'focus');

      component.otpDigits[1] = '5';
      component.onKeyDown({ key: 'Backspace' } as KeyboardEvent, 1, first);
      expect(first.focus).not.toHaveBeenCalled();

      component.otpDigits[1] = '';
      component.onKeyDown({ key: 'Enter' } as KeyboardEvent, 1, first);
      expect(first.focus).not.toHaveBeenCalled();

      component.onKeyDown({ key: 'Backspace' } as KeyboardEvent, 1, first);
      component.onKeyDown({ key: 'Backspace' } as KeyboardEvent, 0, null);
      expect(first.focus).toHaveBeenCalledTimes(1);
      expect(second).toBeTruthy();
    });

    it('ยังขอรหัสใหม่ไม่ได้ในช่วง 5 วินาทีแรก', () => {
      expect(component.canResend).toBeFalse();

      component.resendOtp();

      http.expectNone(`${API}/api/request-otp`);
    });

    it('ขอรหัสใหม่สำเร็จ: ล้างช่องกรอกและเริ่มนับเวลาใหม่', () => {
      component.timeLeft = 200;
      fillOtp();
      expect(component.canResend).toBeTrue();

      component.resendOtp();
      const req = http.expectOne(`${API}/api/request-otp`);
      expect(req.request.body).toEqual({ title: 'somchai@test.com' });
      req.flush({ success: true });

      expect(component.isLoading).toBeFalse();
      expect(component.popup).toBe('OTP sent to your email');
      expect(component.otpDigits.join('')).toBe('');
      expect(component.timeLeft).toBe(300);
    });

    it('ขอรหัสใหม่ไม่สำเร็จ: แจ้งเตือนและหยุดโหลด', () => {
      component.timeLeft = 200;

      component.resendOtp();
      http.expectOne(`${API}/api/request-otp`).flush({}, { status: 500, statusText: 'Error' });

      expect(component.isLoading).toBeFalse();
      expect(component.showpopupnoti).toBeTrue();
    });
  });

  describe('โหมดลืมรหัสผ่าน (/step)', () => {
    beforeEach(() => create('forget', { title: 'somchai@test.com' }));

    it('แสดงหัวข้อ 2 Step Verification และพื้นหลังตกแต่ง', () => {
      const root: HTMLElement = fixture.nativeElement;

      expect(component.isReset).toBeTrue();
      expect(root.querySelector('.header')?.textContent).toContain('2 Step Verification');
      expect(root.querySelector('.subheader')?.textContent).toContain('to confirm your account');
      expect(root.querySelector('.button')?.textContent).toContain('Submit');
      expect(root.querySelector('.ferni')).not.toBeNull();
    });

    it('ยืนยัน OTP ถูก: ส่ง isReset และพาไปหน้าตั้งรหัสใหม่พร้อม reset token', () => {
      fillOtp();
      component.submitRegister();

      const req = http.expectOne(`${API}/todos`);
      expect(req.request.body.isReset).toBeTrue();
      req.flush({ success: true, resetToken: 'reset-token' });

      expect(router.navigate).toHaveBeenCalledWith(['/reset'], {
        state: { userData: { title: 'somchai@test.com' }, resetToken: 'reset-token' }
      });
      expect(component.showpopup).toBeFalse();
      expect(sessionStorage.getItem('tempUserData')).toBeNull();
    });
  });

  describe('ที่มาของข้อมูลผู้ใช้', () => {
    it('ไม่มีใน sessionStorage แต่มีใน history.state: ใช้ค่านั้นและจดลง sessionStorage', () => {
      mockHistoryState({ userData: PENDING_USER });

      create(undefined, null);

      expect(component.userData.title).toBe('somchai@test.com');
      expect(sessionStorage.getItem('tempUserData')).toContain('somchai@test.com');
    });

    it('ไม่มีข้อมูลเลย: แจ้งเตือนแล้วกลับไปหน้าสมัครสมาชิก', () => {
      spyOn(window, 'alert');

      create(undefined, null);

      expect(window.alert).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/register']);
    });

    it('ใช้งานได้แม้ไม่มี ActivatedRoute (mount แยก) โดยถือเป็นโหมดสมัครสมาชิก', () => {
      sessionStorage.setItem('tempUserData', JSON.stringify(PENDING_USER));
      TestBed.configureTestingModule({
        imports: [OtpComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
      });

      const standalone = TestBed.createComponent(OtpComponent).componentInstance;

      expect(standalone.isReset).toBeFalse();
    });
  });

  describe('ตัวนับเวลา', () => {
    beforeEach(() => create());

    it('timerText แสดง mm:ss', () => {
      component.timeLeft = 65;
      expect(component.timerText).toBe('01:05');
      component.timeLeft = 300;
      expect(component.timerText).toBe('05:00');
    });

    it('นับถอยหลังทุกวินาทีและหยุดที่ 0', fakeAsync(() => {
      component.timeLeft = 2;
      component.startTimer();

      tick(1000);
      expect(component.timeLeft).toBe(1);
      tick(2000);
      expect(component.timeLeft).toBe(0);
      tick(5000);
      expect(component.timeLeft).toBe(0);

      component.ngOnDestroy();
    }));
  });
});
