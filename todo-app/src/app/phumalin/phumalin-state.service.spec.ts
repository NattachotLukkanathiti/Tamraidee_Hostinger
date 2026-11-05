import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { PhumalinState } from './phumalin-state.service';

describe('PhumalinState', () => {
  const make = (role: string) => {
    localStorage.removeItem('phumalin_store');
    TestBed.configureTestingModule({
      providers: [PhumalinState, { provide: AuthService, useValue: { user: { username: 'u', role } } }]
    });
    return TestBed.inject(PhumalinState);
  };

  it('admin เห็นครบ 3 หน้า เริ่มที่ Pos และร้านบน', () => {
    const state = make('admin');
    expect(state.views.map((v) => v.id)).toEqual(['pos', 'dashboard', 'inventory']);
    expect(state.views.map((v) => v.label)).toEqual(['เพิ่มสินค้า', 'แดชบอร์ด', 'คลังสินค้า']);
    expect(state.view()).toBe('pos');
    expect(state.store()).toBe('upper');
  });

  it('สิทธิ์ตามหน้าเดิม: pos เห็นแค่ Pos, backend เห็นแค่ Inventory', () => {
    expect(make('pos').views.map((v) => v.id)).toEqual(['pos']);
    TestBed.resetTestingModule();
    const backend = make('backend');
    expect(backend.views.map((v) => v.id)).toEqual(['inventory']);
    expect(backend.view()).toBe('inventory');
  });

  it('สลับร้านแล้วจำไว้ใน localStorage', () => {
    const state = make('admin');
    state.setStore('lower');
    expect(state.store()).toBe('lower');
    expect(localStorage.getItem('phumalin_store')).toBe('lower');
  });

  it('เปลี่ยนหน้าย่อยหลังเล่นอนิเมชันออก 300ms / หน้าที่ไม่มีสิทธิ์ไปไม่ได้', fakeAsync(() => {
    const state = make('manager');
    state.go('inventory');
    expect(state.leaving()).toBeTrue();
    expect(state.view()).toBe('pos');
    tick(300);
    expect(state.view()).toBe('inventory');
    expect(state.leaving()).toBeFalse();

    TestBed.resetTestingModule();
    const pos = make('pos');
    pos.go('dashboard');
    tick(300);
    expect(pos.view()).toBe('pos');
  }));
});
