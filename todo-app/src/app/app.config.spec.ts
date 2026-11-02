import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { appConfig } from './app.config';
import { API_BASE, AuthService } from './services/auth.service';

describe('appConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
  });

  afterEach(() => localStorage.clear());

  it('ลงทะเบียน interceptor: request ไป API แนบ token ของผู้ใช้ที่ login อยู่', () => {
    TestBed.inject(AuthService).setSession('jwt-token', { id: 1, username: 'u', title: 'u@test.com' });

    TestBed.inject(HttpClient).get(`${API_BASE}/api/inventory`).subscribe();

    const req = TestBed.inject(HttpTestingController).expectOne(`${API_BASE}/api/inventory`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    req.flush([]);
  });
});
