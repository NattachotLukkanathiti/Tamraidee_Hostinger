import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, homeRouteFor } from './auth.service';

// กันเข้าหน้าโดยไม่ได้ login และตรวจ role จาก route data: { roles: [...] }
export const authGuard: CanActivateFn = (route, state) => {
  // ตอน prerender ฝั่ง server ไม่มี localStorage ให้ผ่านไปก่อน แล้วค่อยตรวจจริงใน browser
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return true;

  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user;

  if (!auth.isLoggedIn() || !user) {
    return router.createUrlTree(['/login']);
  }

  const roles = route.data?.['roles'] as string[] | undefined;
  const role = (user.role || '').toLowerCase();
  if (roles && !roles.includes(role)) {
    return router.createUrlTree([homeRouteFor(role)]);
  }

  // เข้าหน้าตรง ๆ หรือรีเฟรช: เติมข้อมูลผู้ใช้ลง navigation state ให้หน้าที่ยังอ่านจาก history.state ทำงานได้
  // เก็บ state เดิมที่ส่งมาด้วย (เช่น receiptData จากหน้า POS) ไม่เขียนทับ
  const navState = router.getCurrentNavigation()?.extras.state;
  if (!navState?.['username']) {
    // ยกเลิก navigation นี้แล้วเริ่มใหม่พร้อม state (ไม่ต้องรอผล)
    void router.navigateByUrl(state.url, { state: { ...auth.navigationState(), ...navState } });
    return false;
  }

  return true;
};
