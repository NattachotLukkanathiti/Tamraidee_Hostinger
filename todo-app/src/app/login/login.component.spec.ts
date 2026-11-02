import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SocialLoginService } from '../services/social-login.service';
import { TodoService } from '../services/todo.service';
import { LoginComponent } from './login.component';

const SERVER_USER = {
  id: 5,
  username: 'Somchai',
  title: 'somchai@test.com',
  role: 'backend',
  status: 'Active',
  profile: 'p.png',
  dob: '2000-01-01',
  national_id: '1111',
  address: 'Bangkok',
  emergency_contact: '0800000000'
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let todoService: jasmine.SpyObj<TodoService>;
  let social: jasmine.SpyObj<SocialLoginService>;
  let router: Router;
  let auth: AuthService;

  beforeEach(() => {
    localStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['login', 'logAudit']);
    todoService.logAudit.and.returnValue(of({}));
    social = jasmine.createSpyObj<SocialLoginService>('SocialLoginService', ['signIn']);

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: TodoService, useValue: todoService },
        { provide: SocialLoginService, useValue: social }
      ]
    });
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
    spyOn(router, 'navigate').and.resolveTo(true);
    auth.setSession('old-token', { id: 1, username: 'u', title: 'u@test.com' }, 'google');

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('เปิดหน้า login = ออกจากระบบ: ล้าง session และค่า social login เดิม', () => {
    expect(auth.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('isSocialLogin')).toBeNull();
  });

  it('ยังไม่กรอกอีเมล/รหัสผ่าน ไม่เรียก Backend', () => {
    component.title = 'somchai@test.com';
    component.password = '  ';

    component.login();

    expect(todoService.login).not.toHaveBeenCalled();
  });

  it('login สำเร็จ: เก็บ session, บันทึก audit และไปหน้าแรกตาม role พร้อมข้อมูลผู้ใช้', () => {
    todoService.login.and.returnValue(of({ token: 'jwt-token', user: SERVER_USER }));
    component.title = 'somchai@test.com';
    component.password = 'Passw0rd!';

    component.login();

    expect(todoService.login).toHaveBeenCalledWith('somchai@test.com', 'Passw0rd!');
    expect(auth.token).toBe('jwt-token');
    expect(component.isLoading).toBeFalse();
    expect(todoService.logAudit).toHaveBeenCalledWith(
      jasmine.objectContaining({ activity: 'Login', username: 'Somchai', role: 'backend' })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/inventory'], {
      state: jasmine.objectContaining({
        id: 5,
        username: 'Somchai',
        email: 'somchai@test.com',
        role: 'backend',
        stan: true,
        inhere: true,
        national_id: '1111'
      })
    });
  });

  it('ผู้ใช้ใหม่ที่ยังไม่มี role ไปหน้ารอยืนยันพนักงาน', () => {
    todoService.login.and.returnValue(of({ token: 't', user: { ...SERVER_USER, role: null } }));
    component.title = 'a@test.com';
    component.password = 'Passw0rd!';

    component.login();

    expect(router.navigate).toHaveBeenCalledWith(['/confirmemployee'], jasmine.anything());
  });

  it('บันทึก audit ไม่สำเร็จ ไม่ขัดขวางการเข้าสู่ระบบ', () => {
    todoService.login.and.returnValue(of({ token: 't', user: SERVER_USER }));
    todoService.logAudit.and.returnValue(throwError(() => new Error('audit down')));
    const logged = spyOn(console, 'error');
    component.title = 'a@test.com';
    component.password = 'Passw0rd!';

    component.login();

    expect(logged).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('รหัสผ่านผิด: แจ้งเตือนและไม่เก็บ session', () => {
    todoService.login.and.returnValue(throwError(() => ({ status: 401 })));
    spyOn(console, 'error');
    component.title = 'a@test.com';
    component.password = 'wrong';

    component.login();

    expect(component.isLoading).toBeFalse();
    expect(component.popup).toBe('Username or password incorrect');
    expect(component.showpopupnoti).toBeTrue();
    expect(auth.isLoggedIn()).toBeFalse();
  });

  it('social login สำเร็จ: เรียก service ตาม provider แล้วหยุดโหลด', async () => {
    social.signIn.and.resolveTo();

    component.socialSignIn('github');
    expect(component.isLoading).toBeTrue();
    await fixture.whenStable();

    expect(social.signIn).toHaveBeenCalledWith('github');
    expect(component.isLoading).toBeFalse();
    expect(component.showpopupnoti).toBeFalse();
  });

  it('social login ล้มเหลว: แจ้งเตือนและหยุดโหลด', async () => {
    social.signIn.and.rejectWith(new Error('popup closed'));
    spyOn(console, 'error');

    component.socialSignIn('google');
    await fixture.whenStable();

    expect(component.isLoading).toBeFalse();
    expect(component.showpopupnoti).toBeTrue();
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

  it('popup: เปิด/ปิด และไปหน้า login เมื่อสมัครสำเร็จ', () => {
    component.openpopup('ok');
    expect(component.showpopup).toBeTrue();

    component.registersuccess = true;
    component.closepopup();

    expect(component.showpopup).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(component.registersuccess).toBeFalse();
  });

  it('สลับการแสดงรหัสผ่านได้', () => {
    component.togglePasswordVisibility();

    expect(component.showPassword).toBeTrue();
  });
});
