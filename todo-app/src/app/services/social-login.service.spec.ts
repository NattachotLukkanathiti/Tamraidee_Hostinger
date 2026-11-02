import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthProvider, FacebookAuthProvider, GoogleAuthProvider, UserCredential } from 'firebase/auth';
import { AuthService, SessionUser } from './auth.service';
import { FIREBASE_POPUP_SIGN_IN, FIREBASE_REAUTH_POPUP, SocialLoginService, SocialProvider } from './social-login.service';
import { TodoService } from './todo.service';

const SERVER_USER: SessionUser = { id: 3, username: 'Somchai', title: 'somchai@test.com', role: 'admin', profile: 'p.png' };

describe('SocialLoginService', () => {
  let service: SocialLoginService;
  let todoService: jasmine.SpyObj<TodoService>;
  let router: Router;
  let popup: jasmine.Spy<(provider: AuthProvider) => Promise<UserCredential>>;

  const setUp = (user: SessionUser = SERVER_USER) => {
    todoService.socialLogin.and.returnValue(of({ token: 'jwt-token', user }));
    service = TestBed.inject(SocialLoginService);
  };

  beforeEach(() => {
    localStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['socialLogin', 'logAudit']);
    todoService.logAudit.and.returnValue(of({}));
    popup = jasmine.createSpy('popup').and.resolveTo({ user: { getIdToken: () => Promise.resolve('firebase-id-token') } } as unknown as UserCredential);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TodoService, useValue: todoService },
        { provide: FIREBASE_POPUP_SIGN_IN, useValue: popup }
      ]
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => localStorage.clear());

  it('login สำเร็จ: ส่ง ID token ให้ Backend, เก็บ session และบันทึก audit', async () => {
    setUp();

    await service.signIn('google');

    expect(todoService.socialLogin).toHaveBeenCalledWith('firebase-id-token');
    const auth = TestBed.inject(AuthService);
    expect(auth.token).toBe('jwt-token');
    expect(localStorage.getItem('isSocialLogin')).toBe('true');
    expect(localStorage.getItem('socialProvider')).toBe('google');
    expect(todoService.logAudit).toHaveBeenCalledWith(
      jasmine.objectContaining({ activity: 'Social Login', email: 'somchai@test.com', role: 'admin' })
    );
  });

  it('พาไปหน้าแรกตาม role พร้อมข้อมูลผู้ใช้', async () => {
    setUp();

    await service.signIn('google');

    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
      state: { username: 'Somchai', email: 'somchai@test.com', profile: 'p.png', role: 'admin', stan: true }
    });
  });

  it('ผู้ใช้ใหม่ที่ยังไม่มี role ไปหน้ารอยืนยันพนักงาน', async () => {
    setUp({ ...SERVER_USER, role: null });

    await service.signIn('facebook');

    expect(router.navigate).toHaveBeenCalledWith(['/confirmemployee'], jasmine.anything());
  });

  const providers: [SocialProvider, string][] = [
    ['google', GoogleAuthProvider.PROVIDER_ID],
    ['facebook', FacebookAuthProvider.PROVIDER_ID],
    ['github', 'github.com']
  ];

  for (const [kind, providerId] of providers) {
    it(`เปิด popup ของ ${kind}`, async () => {
      setUp();

      await service.signIn(kind);

      expect(popup.calls.mostRecent().args[0].providerId).toBe(providerId);
    });
  }

  it('ผู้ใช้ปิด popup / ล้มเหลว: ไม่เรียก Backend และไม่เก็บ session', async () => {
    setUp();
    popup.and.rejectWith(new Error('auth/popup-closed-by-user'));

    await expectAsync(service.signIn('google')).toBeRejectedWithError('auth/popup-closed-by-user');

    expect(todoService.socialLogin).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBeFalse();
  });

  it('Backend ปฏิเสธ token: ส่ง error ต่อและไม่ไปหน้าอื่น', async () => {
    setUp();
    todoService.socialLogin.and.returnValue(throwError(() => new Error('401')));

    await expectAsync(service.signIn('google')).toBeRejectedWithError('401');

    expect(router.navigate).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isLoggedIn()).toBeFalse();
  });

  it('บันทึก audit ไม่สำเร็จ ไม่ขัดขวางการเข้าสู่ระบบ', async () => {
    setUp();
    todoService.logAudit.and.returnValue(throwError(() => new Error('audit down')));
    const logged = spyOn(console, 'error');

    await service.signIn('google');

    expect(logged).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });

  it('re-authenticate โดยไม่มีผู้ใช้ Firebase ค้างอยู่: ไม่เปิด popup และคืน null', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    const reauth = TestBed.inject(FIREBASE_REAUTH_POPUP);

    await expectAsync(reauth(new GoogleAuthProvider())).toBeResolvedTo(null);
  });

  it('ค่าเริ่มต้นของ popup เป็นฟังก์ชันที่เปิด Firebase popup', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });

    expect(typeof TestBed.inject(FIREBASE_POPUP_SIGN_IN)).toBe('function');
  });
});
