import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SocialLoginService } from '../services/social-login.service';
import { TodoService } from '../services/todo.service';
import { RegisterComponent } from './register.component';

const VALID_PASSWORD = 'Passw0rd!';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  let todoService: jasmine.SpyObj<TodoService>;
  let social: jasmine.SpyObj<SocialLoginService>;
  let router: Router;

  const fillForm = (overrides: Partial<Record<'title' | 'username' | 'password' | 'confirmPassword', string>> = {}) => {
    component.title = 'somchai@test.com';
    component.username = 'somchai';
    component.password = VALID_PASSWORD;
    component.confirmPassword = VALID_PASSWORD;
    Object.assign(component, overrides);
  };

  beforeEach(() => {
    sessionStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['checkEmail', 'sendOtp']);
    social = jasmine.createSpyObj<SocialLoginService>('SocialLoginService', ['signIn']);

    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: TodoService, useValue: todoService },
        { provide: SocialLoginService, useValue: social }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => sessionStorage.clear());

  const invalidForms: [string, Parameters<typeof fillForm>[0], string][] = [
    ['ไม่กรอกชื่อผู้ใช้', { username: ' ' }, 'Please enter both'],
    ['อีเมลรูปแบบไม่ถูกต้อง', { title: 'not-an-email' }, 'valid email'],
    ['รหัสผ่านไม่ตรงเงื่อนไข', { password: 'weak', confirmPassword: 'weak' }, 'รหัสผ่านต้องมีความยาว'],
    ['รหัสผ่านสองช่องไม่ตรงกัน', { confirmPassword: 'Different@123' }, 'do not match']
  ];

  for (const [name, overrides, message] of invalidForms) {
    it(`${name}: แจ้งเตือนและไม่เรียก Backend`, () => {
      fillForm(overrides);

      component.addTodo();

      expect(component.popup).toContain(message);
      expect(component.showpopupnoti).toBeTrue();
      expect(component.isLoading).toBeFalse();
      expect(todoService.checkEmail).not.toHaveBeenCalled();
    });
  }

  it('อีเมลถูกใช้แล้ว: แจ้งเตือนและไม่ส่ง OTP', () => {
    todoService.checkEmail.and.returnValue(of({ exists: true }));
    fillForm();

    component.addTodo();

    expect(component.popup).toContain('already in use');
    expect(component.loading).toBeFalse();
    expect(todoService.sendOtp).not.toHaveBeenCalled();
  });

  it('ตรวจอีเมลไม่สำเร็จ: แจ้งเตือน', () => {
    todoService.checkEmail.and.returnValue(throwError(() => new Error('down')));
    fillForm();

    component.addTodo();

    expect(component.popup).toContain('Unable to verify email');
    expect(component.isLoading).toBeFalse();
  });

  it('ข้อมูลถูกต้อง: ส่ง OTP แล้วไปหน้า /otp พร้อมเก็บข้อมูลไว้รอยืนยัน', () => {
    todoService.checkEmail.and.returnValue(of({ exists: false }));
    todoService.sendOtp.and.returnValue(of({}));
    fillForm();

    component.addTodo();

    expect(todoService.sendOtp).toHaveBeenCalledWith('somchai@test.com');
    const expected = { username: 'somchai', title: 'somchai@test.com', password: VALID_PASSWORD };
    expect(JSON.parse(sessionStorage.getItem('tempUserData') ?? '{}')).toEqual(expected);
    expect(router.navigate).toHaveBeenCalledWith(['/otp'], { state: { userData: expected } });
    expect(component.loading).toBeFalse();
  });

  it('ส่ง OTP ไม่สำเร็จ: แสดงข้อความจาก Backend หรือข้อความมาตรฐาน', () => {
    todoService.checkEmail.and.returnValue(of({ exists: false }));
    fillForm();

    todoService.sendOtp.and.returnValue(throwError(() => ({ error: { message: 'ขอ OTP บ่อยเกินไป' } })));
    component.addTodo();
    expect(component.popup).toBe('ขอ OTP บ่อยเกินไป');

    todoService.sendOtp.and.returnValue(throwError(() => ({})));
    component.addTodo();
    expect(component.popup).toContain('Unable to send OTP');
    expect(component.loading).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('social login สำเร็จ: เรียก service ตาม provider แล้วหยุดโหลด', async () => {
    social.signIn.and.resolveTo();

    component.socialSignIn('facebook');
    expect(component.isLoading).toBeTrue();
    await fixture.whenStable();

    expect(social.signIn).toHaveBeenCalledWith('facebook');
    expect(component.isLoading).toBeFalse();
  });

  it('social login ล้มเหลว: แจ้งเตือนและหยุดโหลด', async () => {
    social.signIn.and.rejectWith(new Error('popup closed'));
    spyOn(console, 'error');

    component.socialSignIn('google');
    await fixture.whenStable();

    expect(component.popup).toContain('Login failed');
    expect(component.isLoading).toBeFalse();
  });

  it('social login ถูกปฏิเสธโดย Backend: แสดงข้อความจาก Backend', async () => {
    social.signIn.and.rejectWith({ status: 403, error: { message: 'อีเมลนี้มีบัญชีอยู่แล้ว' } });
    spyOn(console, 'error');

    component.socialSignIn('facebook');
    await fixture.whenStable();

    expect(component.popup).toBe('อีเมลนี้มีบัญชีอยู่แล้ว');
  });

  it('ปุ่ม Google / Facebook / GitHub เรียก social login ตาม provider ที่กด', () => {
    social.signIn.and.resolveTo();

    component.signInWithGoogle();
    component.signInWithFacebook();
    component.signInWithGitHub();

    expect(social.signIn.calls.allArgs()).toEqual([['google'], ['facebook'], ['github']]);
  });

  it('popup และปุ่มสลับการแสดงรหัสผ่าน', () => {
    component.openpopup('ok');
    expect(component.showpopup).toBeTrue();
    component.closepopup();
    expect(component.showpopup).toBeFalse();

    component.togglePasswordVisibility();
    component.toggleConfirmPassword();
    expect(component.showPassword).toBeTrue();
    expect(component.showConfirmPassword).toBeTrue();
  });
});
