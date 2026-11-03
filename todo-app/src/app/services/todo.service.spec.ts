import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TodoService } from './todo.service';

type Case = [name: string, call: (service: TodoService) => Observable<unknown>, method: string, path: string];

const CASES: Case[] = [
  ['logAudit', (s) => s.logAudit({}), 'POST', '/audit'],
  ['getAudit', (s) => s.getAudit(), 'GET', '/audit'],
  ['getShopCart', (s) => s.getShopCart(), 'GET', '/shop/cart'],
  ['saveShopCart', (s) => s.saveShopCart([]), 'PUT', '/shop/cart'],
  ['getTodos', (s) => s.getTodos(), 'GET', '/todos'],
  ['addTodo', (s) => s.addTodo('u', 't', 'p', 'p'), 'POST', '/todos'],
  ['login', (s) => s.login('t', 'p'), 'POST', '/login'],
  ['verifyOtp', (s) => s.verifyOtp('t', '123456'), 'POST', '/verify-otp'],
  ['sendOtp', (s) => s.sendOtp('t'), 'POST', '/request-otp'],
  ['getMonth', (s) => s.getMonth(), 'GET', '/months'],
  ['resetPassword', (s) => s.resetPassword('t', 'p', 'token'), 'PUT', '/reset-password'],
  ['checkEmail', (s) => s.checkEmail('t'), 'POST', '/check-email'],
  ['verifyPassword', (s) => s.verifyPassword('u', { password: 'p' }), 'POST', '/verify-password'],
  ['socialLogin', (s) => s.socialLogin('id-token'), 'POST', '/auth/social'],
  ['getSaleOrders', (s) => s.getSaleOrders(), 'GET', '/sale_order'],
  ['getInventory', (s) => s.getInventory(), 'GET', '/inventory'],
  ['getHistory', (s) => s.getHistory(), 'GET', '/history'],
  ['getEmployee', (s) => s.getEmployee(), 'GET', '/employee'],
  ['getTodoss', (s) => s.getTodoss(), 'GET', '/todos'],
  ['getSuppliers', (s) => s.getSuppliers(), 'GET', '/suppliers'],
  ['addInventory', (s) => s.addInventory({}), 'POST', '/inventory'],
  ['deleteInventory', (s) => s.deleteInventory('SKU-1'), 'DELETE', '/inventory/SKU-1'],
  ['updateInventory', (s) => s.updateInventory('SKU-1', {}), 'PUT', '/inventory/SKU-1'],
  ['updateEmployee', (s) => s.updateEmployee('u', {}), 'PUT', '/employee/u'],
  ['getSummary', (s) => s.getSummary(), 'GET', '/summary'],
  ['getProducts', (s) => s.getProducts(), 'GET', '/inventory'],
  ['getNotifications', (s) => s.getNotifications(), 'GET', '/notification'],
  ['addNotification', (s) => s.addNotification('t', 'd', 'info', '1m'), 'POST', '/notification'],
  ['updateProfile', (s) => s.updateProfile(1, {}), 'PUT', '/todos/1'],
  ['addSupplier', (s) => s.addSupplier({}), 'POST', '/suppliers'],
  ['addHistory', (s) => s.addHistory({}), 'POST', '/history'],
  ['updateSupplier', (s) => s.updateSupplier(1, {}), 'PUT', '/suppliers/1'],
  ['checkout', (s) => s.checkout({ order_code: '#1', items: [{ sku: 'A', quantity: 1 }], discount: 0 }), 'POST', '/checkout'],
  ['cancelSaleOrders', (s) => s.cancelSaleOrders([1, 2]), 'POST', '/sale_order/cancel'],
  ['saveSalesOrder', (s) => s.saveSalesOrder({}), 'POST', '/sale_order'],
  ['updateInventoryStock', (s) => s.updateInventoryStock('SKU-1', {}), 'PUT', '/inventory/SKU-1'],
  ['updateSaleOrderStatus', (s) => s.updateSaleOrderStatus(1, 'Canceled'), 'PUT', '/sale_order/1'],
  ['addRequestHistory', (s) => s.addRequestHistory({}), 'POST', '/request_history'],
  ['getRequestHistory', (s) => s.getRequestHistory(), 'GET', '/request_history'],
  ['updateRequestStatus', (s) => s.updateRequestStatus(1, { status: 'Approved' }), 'PUT', '/request_history/1'],
  ['updateHistoryStatusBySku', (s) => s.updateHistoryStatusBySku('SKU-1', 'Approved'), 'PUT', '/history/status/SKU-1'],
  ['getNotificationStatus', (s) => s.getNotificationStatus('u'), 'GET', '/notification_status/u'],
  ['markNotificationAsRead', (s) => s.markNotificationAsRead(1, 'u'), 'POST', '/notification_status'],
  ['getChatHistory', (s) => s.getChatHistory(10, 20), 'GET', '/chat?limit=10&offset=20'],
  ['sendChatMessage', (s) => s.sendChatMessage('u', 'hello', undefined, 3), 'POST', '/chat'],
  ['getTypingStatus', (s) => s.getTypingStatus('u'), 'GET', '/chat/typing/u'],
  ['markChatAsRead', (s) => s.markChatAsRead('u'), 'PUT', '/chat/read'],
  ['deleteEmployee', (s) => s.deleteEmployee(1), 'DELETE', '/employee/1'],
  ['getSettings', (s) => s.getSettings(), 'GET', '/settings'],
  ['saveSettings', (s) => s.saveSettings({}), 'POST', '/settings'],
  ['checkUserRole', (s) => s.checkUserRole('a@b.com'), 'GET', '/users/role/a@b.com'],
  ['createNotification', (s) => s.createNotification({}), 'POST', '/notification']
];

describe('TodoService', () => {
  let service: TodoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TodoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const [name, call, method, path] of CASES) {
    it(`${name} ส่ง ${method} ไปที่ /api${path}`, () => {
      let response: unknown;
      call(service).subscribe((body) => (response = body));

      const req = http.expectOne(`${environment.apiBase}/api${path}`);
      expect(req.request.method).toBe(method);

      req.flush({ ok: true });
      expect(response).toEqual({ ok: true });
    });
  }

  it('แนบ header ngrok-skip-browser-warning ให้ request ที่ใช้ header กลาง', () => {
    service.getInventory().subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/inventory`);
    expect(req.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    req.flush([]);
  });

  it('checkout ส่ง order ทั้งใบใน body เดียว', () => {
    const order = { order_code: '#9', items: [{ sku: 'A', quantity: 2 }], discount: 5, picture: 'p.png' };
    service.checkout(order).subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/checkout`);
    expect(req.request.body).toEqual(order);
    req.flush({});
  });

  it('cancelSaleOrders ส่งรายการ id ที่ต้องการยกเลิก', () => {
    service.cancelSaleOrders([4, 5]).subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/sale_order/cancel`);
    expect(req.request.body).toEqual({ ids: [4, 5] });
    req.flush({});
  });

  it('verifyPassword ส่ง username พร้อม credential ที่เลือก', () => {
    service.verifyPassword('u', { firebaseToken: 'fb' }).subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/verify-password`);
    expect(req.request.body).toEqual({ username: 'u', firebaseToken: 'fb' });
    req.flush({ valid: true });
  });

  it('resetPassword ส่ง reset token ไปด้วย', () => {
    service.resetPassword('a@b.com', 'New@1234', 'tok').subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/reset-password`);
    expect(req.request.body).toEqual({ title: 'a@b.com', password: 'New@1234', resetToken: 'tok' });
    req.flush({});
  });

  it('sendTypingStatus รับ response แบบ text', () => {
    service.sendTypingStatus('u', false).subscribe();
    const req = http.expectOne(`${environment.apiBase}/api/chat/typing`);
    expect(req.request.responseType).toBe('text');
    req.flush('OK');
  });
});
