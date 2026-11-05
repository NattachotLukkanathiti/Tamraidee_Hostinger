import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService, SessionUser } from './auth.service';
import { authGuard } from './auth.guard';

const route = (roles?: string[]) => ({ data: roles ? { roles } : {} }) as unknown as ActivatedRouteSnapshot;
const state = { url: '/dashboard' } as RouterStateSnapshot;

const user = (role: string | null): SessionUser => ({ id: 1, username: 'u', title: 'u@test.com', role });

describe('authGuard', () => {
  let auth: AuthService;
  let router: Router;

  const run = () => TestBed.runInInjectionContext(() => authGuard(route(currentRoles), state));
  let currentRoles: string[] | undefined;

  // จำลองว่า navigation ปัจจุบันมี state ที่มีชื่อผู้ใช้แล้วหรือยัง
  const withNavigationState = (navState?: Record<string, unknown>) =>
    spyOn(router, 'getCurrentNavigation').and.returnValue({ extras: { state: navState } } as never);

  beforeEach(() => {
    localStorage.clear();
    currentRoles = undefined;
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => localStorage.clear());

  it('ยังไม่ login -> ส่งไปหน้า login', () => {
    const result = run() as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login');
  });

  it('login แล้วแต่ role ไม่มีสิทธิ์ -> ส่งกลับหน้าแรกของ role นั้น', () => {
    auth.setSession('jwt', user('pos'));
    currentRoles = ['admin', 'manager'];

    expect(router.serializeUrl(run() as UrlTree)).toBe('/pos');
  });

  it('role มีสิทธิ์ และมี navigation state อยู่แล้ว -> ผ่าน', () => {
    auth.setSession('jwt', user('admin'));
    currentRoles = ['admin'];
    withNavigationState({ username: 'u' });

    expect(run()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('route ที่ไม่จำกัด role -> ผ่านสำหรับทุกคนที่ login', () => {
    auth.setSession('jwt', user(null));
    withNavigationState({ username: 'u' });

    expect(run()).toBeTrue();
  });

  it('เข้าหน้าตรง ๆ / รีเฟรช (ไม่มี state) -> เติม state จาก session แล้วนำทางใหม่', () => {
    auth.setSession('jwt', user('admin'));
    withNavigationState(undefined);

    expect(run()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', {
      state: jasmine.objectContaining({ username: 'u', email: 'u@test.com', role: 'admin' })
    });
  });

  it('มี state อื่นแต่ไม่มีชื่อผู้ใช้ (เช่น POS ส่งข้อมูลใบเสร็จ) -> เติมข้อมูลผู้ใช้โดยไม่ทำ state เดิมหาย', () => {
    auth.setSession('jwt', user('pos'));
    currentRoles = ['pos'];
    const receiptData = { orderCode: '#123456' };
    withNavigationState({ receiptData, userData: { username: 'u' } });

    expect(run()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', {
      state: jasmine.objectContaining({ username: 'u', role: 'pos', receiptData, userData: { username: 'u' } })
    });
  });

  it('ตอน prerender บน server ปล่อยผ่านไปตรวจจริงใน browser', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PLATFORM_ID, useValue: 'server' }]
    });

    expect(TestBed.runInInjectionContext(() => authGuard(route(['admin']), state))).toBeTrue();
  });
});
