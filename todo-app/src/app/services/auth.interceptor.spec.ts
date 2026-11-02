import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { API_BASE, AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('แนบ Bearer token ให้ request ที่ยิงไป API', () => {
    auth.setSession('jwt-token', { id: 1, username: 'u', title: 'u@test.com' });

    http.get(`${API_BASE}/api/inventory`).subscribe();

    const req = controller.expectOne(`${API_BASE}/api/inventory`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });

  it('ไม่แนบ token เมื่อยังไม่ได้ login', () => {
    http.get(`${API_BASE}/api/inventory`).subscribe();

    const req = controller.expectOne(`${API_BASE}/api/inventory`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('ไม่ส่ง token ไปให้เว็บอื่น', () => {
    auth.setSession('jwt-token', { id: 1, username: 'u', title: 'u@test.com' });

    http.get('https://example.com/data').subscribe();

    const req = controller.expectOne('https://example.com/data');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('ได้ 401 แล้วล้าง session และพากลับหน้า login พร้อมส่ง error ต่อ', () => {
    auth.setSession('expired-token', { id: 1, username: 'u', title: 'u@test.com' });
    let status = 0;

    http.get(`${API_BASE}/api/inventory`).subscribe({ error: (err) => (status = err.status) });
    controller.expectOne(`${API_BASE}/api/inventory`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(auth.isLoggedIn()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('error อื่นที่ไม่ใช่ 401 ไม่ทำให้หลุดจากระบบ', () => {
    auth.setSession('jwt-token', { id: 1, username: 'u', title: 'u@test.com' });
    let status = 0;

    http.get(`${API_BASE}/api/inventory`).subscribe({ error: (err) => (status = err.status) });
    controller.expectOne(`${API_BASE}/api/inventory`).flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(auth.isLoggedIn()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
