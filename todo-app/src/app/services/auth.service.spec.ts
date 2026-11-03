import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, SessionUser, canUseBackOffice, homeRouteFor } from './auth.service';

const USER: SessionUser = {
  id: 7,
  username: 'admin1',
  title: 'admin@test.com',
  role: 'admin',
  status: 'Active',
  profile: 'me.png',
  dob: '2000-01-01',
  national_id: '1111',
  address: 'Bangkok',
  emergency_contact: '0800000000'
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('เริ่มต้นยังไม่ได้ login', () => {
    expect(service.token).toBeNull();
    expect(service.user).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.navigationState()).toEqual({});
  });

  it('setSession เก็บ token และผู้ใช้ไว้ใช้ต่อได้', () => {
    service.setSession('jwt-token', USER);

    expect(service.token).toBe('jwt-token');
    expect(service.user).toEqual(USER);
    expect(service.isLoggedIn()).toBeTrue();
    expect(localStorage.getItem('isSocialLogin')).toBeNull();
  });

  it('setSession แบบ social login จดจำ provider ไว้ด้วย', () => {
    service.setSession('jwt-token', USER, 'google');

    expect(localStorage.getItem('isSocialLogin')).toBe('true');
    expect(localStorage.getItem('socialProvider')).toBe('google');
  });

  it('clearSession ล้างทั้ง session และค่า social login (กัน flag เก่าค้าง)', () => {
    service.setSession('jwt-token', USER, 'github');
    service.clearSession();

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('isSocialLogin')).toBeNull();
    expect(localStorage.getItem('socialProvider')).toBeNull();
  });

  it('navigationState แปลงข้อมูลผู้ใช้เป็นรูปแบบที่หน้าต่าง ๆ อ่านจาก history.state', () => {
    service.setSession('jwt-token', USER);

    expect(service.navigationState()).toEqual({
      id: 7,
      username: 'admin1',
      email: 'admin@test.com',
      profile: 'me.png',
      role: 'admin',
      status: 'Active',
      dob: '2000-01-01',
      national_id: '1111',
      address: 'Bangkok',
      emergency_contact: '0800000000'
    });
  });

  it('ข้อมูลใน storage เสียหาย ถือว่ายังไม่ login แทนที่จะ error', () => {
    localStorage.setItem('auth_session', '{not json');

    expect(service.token).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('ใช้ storage ไม่ได้ (เช่น private mode) ต้องไม่ error', () => {
    spyOn(Storage.prototype, 'setItem').and.throwError('quota exceeded');

    expect(() => service.setSession('jwt-token', USER)).not.toThrow();
    expect(service.isLoggedIn()).toBeFalse();
  });
});

describe('AuthService บน server (prerender)', () => {
  it('ไม่แตะ localStorage', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const service = TestBed.inject(AuthService);
    const setItem = spyOn(Storage.prototype, 'setItem');

    service.setSession('jwt-token', USER);
    service.clearSession();

    expect(setItem).not.toHaveBeenCalled();
    expect(service.token).toBeNull();
  });
});

describe('homeRouteFor', () => {
  const cases: [string | null | undefined, string][] = [
    [undefined, '/confirmemployee'],
    [null, '/confirmemployee'],
    ['', '/confirmemployee'],
    ['pos', '/pos'],
    ['POS', '/pos'],
    ['backend', '/inventory'],
    ['admin', '/dashboard'],
    ['manager', '/dashboard'],
    ['guest', '/shop'],
    ['customer', '/shop']
  ];

  for (const [role, route] of cases) {
    it(`role "${role}" ไปที่ ${route}`, () => {
      expect(homeRouteFor(role)).toBe(route);
    });
  }
});

describe('canUseBackOffice', () => {
  it('admin / manager / pos / backend เข้าหลังร้านได้ (ไม่สนตัวพิมพ์)', () => {
    for (const role of ['admin', 'Manager', 'POS', 'backend']) {
      expect(canUseBackOffice(role)).withContext(role).toBeTrue();
    }
  });

  it('role อื่นหรือยังไม่มี role ใช้ได้เฉพาะหน้าร้าน', () => {
    for (const role of ['', null, undefined, 'customer']) {
      expect(canUseBackOffice(role)).withContext(String(role)).toBeFalse();
    }
  });
});
