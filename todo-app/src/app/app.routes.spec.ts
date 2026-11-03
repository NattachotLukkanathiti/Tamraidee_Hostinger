import { Route } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { OtpComponent } from './otp/otp.component';
import { ShopComponent } from './shop/shop.component';
import { authGuard } from './services/auth.guard';
import { routes } from './app.routes';

const find = (path: string): Route => {
  const route = routes.find((r) => r.path === path);
  if (!route) throw new Error(`ไม่พบ route ${path}`);
  return route;
};

describe('app routes', () => {
  const STAFF = ['admin', 'manager', 'pos', 'backend']; // คนอื่นที่ login อยู่ใช้ได้เฉพาะหน้าร้าน
  const protectedRoutes: [string, string[] | undefined][] = [
    ['dashboard', ['admin', 'manager']],
    ['inventory', ['admin', 'manager', 'backend']],
    ['sale', ['admin', 'manager', 'pos']],
    ['history', ['admin', 'manager', 'backend']],
    ['employee', ['admin', 'manager']],
    ['suppliers', ['admin', 'manager']],
    ['pos', ['admin', 'manager', 'pos']],
    ['audit', ['admin', 'manager']],
    ['notification', STAFF],
    ['profile', STAFF],
    ['helpp', STAFF],
    ['edit', STAFF],
    ['setting', STAFF],
    ['receipt', STAFF],
    ['online-orders', ['admin', 'manager', 'pos']]
  ];

  for (const [path, roles] of protectedRoutes) {
    it(`/${path} ต้อง login${roles ? ` และ role ${roles.join('/')}` : ''}`, () => {
      const route = find(path);

      expect(route.canActivate).toEqual([authGuard]);
      expect(route.data?.['roles']).toEqual(roles);
    });
  }

  for (const path of ['', 'login', 'register', 'forgot', 'otp', 'step', 'reset', 'privacy-policy', 'delete-data', 'shop', 'shop/:sku']) {
    it(`/${path} เปิดได้โดยไม่ต้อง login`, () => {
      expect(find(path).canActivate).toBeUndefined();
    });
  }

  it('หน้าแรก (/) คือหน้าร้าน ส่วนหน้า login อยู่ที่ /login', () => {
    expect(find('').component).toBe(ShopComponent);
    expect(find('shop').component).toBe(ShopComponent);
    expect(find('shop/:sku').component).toBe(ShopComponent);
    expect(find('login').component).toBe(LoginComponent);
  });

  it('/step ใช้หน้ากรอก OTP ตัวเดียวกับ /otp ในโหมดลืมรหัสผ่าน', () => {
    expect(find('step').component).toBe(OtpComponent);
    expect(find('step').data).toEqual({ mode: 'forget' });
    expect(find('otp').component).toBe(OtpComponent);
    expect(find('otp').data).toBeUndefined();
  });
});
