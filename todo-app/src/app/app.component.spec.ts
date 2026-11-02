import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;
  let router: Router;
  let currentUrl: string;

  beforeEach(() => {
    currentUrl = '/';
    TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([])] });
    router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.callFake(() => currentUrl);
    component = TestBed.createComponent(AppComponent).componentInstance;
  });

  const hiddenPages = ['/', '/register', '/otp', '/forgot', '/login', '/confirmemployee', '/receipt', '/step', '/reset'];

  for (const page of hiddenPages) {
    it(`หน้า ${page} ไม่แสดง navbar`, () => {
      currentUrl = page;

      expect(component.isLoginPage()).toBeTrue();
    });
  }

  it('ตัด query string ออกก่อนเทียบ (เช่น ?fbclid=...)', () => {
    currentUrl = '/login?fbclid=abc';

    expect(component.isLoginPage()).toBeTrue();
  });

  it('หน้าที่ต้อง login แล้วแสดง navbar', () => {
    for (const page of ['/dashboard', '/inventory', '/pos', '/sale', '/history']) {
      currentUrl = page;
      expect(component.isLoginPage()).withContext(page).toBeFalse();
    }
  });
});
