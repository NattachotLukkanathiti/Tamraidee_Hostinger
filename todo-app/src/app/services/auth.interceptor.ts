import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_BASE, AuthService } from './auth.service';

// แนบ JWT ให้ทุก request ที่ยิงไป API และพากลับหน้า Login เมื่อ token หมดอายุ
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token;

  if (!token || !req.url.startsWith(API_BASE)) {
    return next(req);
  }

  const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.clearSession();
        // ไม่ต้องรอผลการเปลี่ยนหน้า แค่ส่ง error ต่อให้ผู้เรียก
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
