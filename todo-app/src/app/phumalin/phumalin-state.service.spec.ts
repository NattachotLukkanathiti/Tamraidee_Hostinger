import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PhumalinState } from './phumalin-state.service';

describe('PhumalinState', () => {
  const make = () => {
    localStorage.removeItem('phumalin_store');
    TestBed.configureTestingModule({ providers: [PhumalinState] });
    return TestBed.inject(PhumalinState);
  };

  it('ไม่ต้อง login: เห็นครบ 3 หน้า (ชื่อไทย) เริ่มที่เพิ่มสินค้า และร้านบน', () => {
    const state = make();
    expect(state.views.map((v) => v.id)).toEqual(['pos', 'dashboard', 'inventory']);
    expect(state.views.map((v) => v.label)).toEqual(['เพิ่มสินค้า', 'แดชบอร์ด', 'คลังสินค้า']);
    expect(state.view()).toBe('pos');
    expect(state.store()).toBe('upper');
  });

  it('สลับร้านแล้วจำไว้ใน localStorage', () => {
    const state = make();
    state.setStore('lower');
    expect(state.store()).toBe('lower');
    expect(localStorage.getItem('phumalin_store')).toBe('lower');
  });

  it('เปลี่ยนหน้าย่อยหลังเล่นอนิเมชันออก 300ms และจำหน้าก่อนหน้า / ระหว่างรอกดซ้ำไม่ได้', fakeAsync(() => {
    const state = make();
    state.go('inventory');
    expect(state.leaving()).toBeTrue();
    expect(state.leavingTo()).toBe('inventory');
    state.go('dashboard');
    expect(state.leavingTo()).toBe('inventory');
    expect(state.view()).toBe('pos');
    tick(300);
    expect(state.view()).toBe('inventory');
    expect(state.leaving()).toBeFalse();
    expect(state.cameFrom()).toBe('pos');
  }));
});
