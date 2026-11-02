import { Route } from '@angular/router';
import { OtpComponent } from './otp/otp.component';
import { authGuard } from './services/auth.guard';
import { routes } from './app.routes';

const find = (path: string): Route => {
  const route = routes.find((r) => r.path === path);
  if (!route) throw new Error(`ไม่พบ route ${path}`);
  return route;
};

describe('app routes', () => {
  const protectedRoutes: [string, string[] | undefined][] = [
    ['dashboard', ['admin', 'manager']],
    ['inventory', ['admin', 'manager', 'backend']],
    ['sale', ['admin', 'manager', 'pos']],
    ['history', ['admin', 'manager', 'backend']],
    ['employee', ['admin', 'manager']],
    ['suppliers', ['admin', 'manager']],
    ['pos', ['admin', 'manager', 'pos']],
    ['audit', ['admin', 'manager']],
    ['notification', undefined],
    ['profile', undefined],
    ['helpp', undefined],
    ['edit', undefined],
    ['setting', undefined],
    ['receipt', undefined]
  ];

  for (const [path, roles] of protectedRoutes) {
    it(`/${path} ต้อง login${roles ? ` และ role ${roles.join('/')}` : ''}`, () => {
      const route = find(path);

      expect(route.canActivate).toEqual([authGuard]);
      expect(route.data?.['roles']).toEqual(roles);
    });
  }

  for (const path of ['', 'login', 'register', 'forgot', 'otp', 'step', 'reset', 'privacy-policy', 'delete-data']) {
    it(`/${path} เปิดได้โดยไม่ต้อง login`, () => {
      expect(find(path).canActivate).toBeUndefined();
    });
  }

  it('/step ใช้หน้ากรอก OTP ตัวเดียวกับ /otp ในโหมดลืมรหัสผ่าน', () => {
    expect(find('step').component).toBe(OtpComponent);
    expect(find('step').data).toEqual({ mode: 'forget' });
    expect(find('otp').component).toBe(OtpComponent);
    expect(find('otp').data).toBeUndefined();
  });
});
