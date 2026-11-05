import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { PhumalinService } from './phumalin.service';

describe('PhumalinService', () => {
  const base = `${environment.apiBase}/api/phumalin`;
  let api: PhumalinService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PhumalinService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('เรียก API แยกตามร้าน', () => {
    api.getItems('upper').subscribe();
    http.expectOne(`${base}/upper/items`).flush([]);

    api.addItem('lower', { name: 'A', unit: 'kg', category: 'meat', quantity: 1, note: '', picture: '' }).subscribe();
    expect(http.expectOne(`${base}/lower/items`).request.method).toBe('POST');

    api.updateItem('upper', 3, { name: 'A', unit: 'kg', category: 'meat', quantity: 1, note: '', picture: '' }).subscribe();
    expect(http.expectOne(`${base}/upper/items/3`).request.method).toBe('PUT');

    api.deleteItem('upper', 3).subscribe();
    expect(http.expectOne(`${base}/upper/items/3`).request.method).toBe('DELETE');

    api.stockIn('lower', 4, 2.5, 'x').subscribe();
    expect(http.expectOne(`${base}/lower/items/4/stock-in`).request.body).toEqual({ quantity: 2.5, note: 'x' });

    api.restock('lower', [{ id: 2, quantity: 3 }], 'market').subscribe();
    expect(http.expectOne(`${base}/lower/restock`).request.body).toEqual({ items: [{ id: 2, quantity: 3 }], note: 'market' });

    api.withdraw('upper', [{ id: 1, quantity: 2 }], 'lunch').subscribe();
    expect(http.expectOne(`${base}/upper/withdraw`).request.body).toEqual({ items: [{ id: 1, quantity: 2 }], note: 'lunch' });

    api.getMovements('upper', 50).subscribe();
    http.expectOne(`${base}/upper/movements?limit=50`).flush([]);
  });
});
