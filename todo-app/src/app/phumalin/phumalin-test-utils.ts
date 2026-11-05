/// PHUMALIN: ตัวช่วยสำหรับ unit test ของหน้า phumalin (ใช้เฉพาะใน *.spec.ts)
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { PhumalinService } from './phumalin.service';
import { PhumalinState } from './phumalin-state.service';
import { PhumalinItem, PhumalinMovement } from './phumalin.models';

export const pmItem = (patch: Partial<PhumalinItem> = {}): PhumalinItem => ({
  id: 1, store: 'upper', name: 'Cabbage', unit: 'kg', category: 'vegetable', quantity: 5, note: null,
  updated_at: '2026-11-06T03:00:00Z', ...patch
});

export const pmMove = (patch: Partial<PhumalinMovement> = {}): PhumalinMovement => ({
  id: 1, store: 'upper', item_id: 1, item_name: 'Cabbage', unit: 'kg', category: 'vegetable', type: 'out',
  quantity: 1, balance: 4, order_code: 'UP-000001', note: null, created_by: 'admin1', created_at: new Date().toISOString(), ...patch
});

export function createPhumalinApiMock(): jasmine.SpyObj<PhumalinService> {
  const api = jasmine.createSpyObj<PhumalinService>('PhumalinService',
    ['getItems', 'addItem', 'updateItem', 'deleteItem', 'stockIn', 'restock', 'withdraw', 'getMovements']);
  api.getItems.and.returnValue(of([]));
  api.getMovements.and.returnValue(of([]));
  return api;
}

export function setUpPhumalin<T>(component: Type<T>, role = 'admin') {
  try { localStorage.removeItem('phumalin_store'); } catch { /* ignore */ }
  const api = createPhumalinApiMock();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      PhumalinState,
      { provide: PhumalinService, useValue: api },
      { provide: AuthService, useValue: { user: { id: 1, username: 'admin1', title: 'a@test.com', role } } }
    ]
  });
  const state = TestBed.inject(PhumalinState);
  const create = (): { fixture: ComponentFixture<T>; component: T; el: HTMLElement } => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  };
  return { api, state, create };
}
