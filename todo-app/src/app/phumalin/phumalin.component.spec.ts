import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { PhumalinState } from './phumalin-state.service';
import { of } from 'rxjs';
import { PhumalinComponent } from './phumalin.component';
import { PhumalinService } from './phumalin.service';
import { createPhumalinApiMock } from './phumalin-test-utils';

describe('PhumalinComponent', () => {
  const open = () => {
    localStorage.removeItem('phumalin_store');
    const api = createPhumalinApiMock();
    api.getItems.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [PhumalinComponent],
      providers: [
        { provide: PhumalinService, useValue: api }
      ]
    });
    const fixture = TestBed.createComponent(PhumalinComponent);
    fixture.detectChanges();
    return fixture;
  };
  const openWithState = () => {
    const fixture = open();
    return { fixture, el: fixture.nativeElement as HTMLElement, state: fixture.debugElement.injector.get(PhumalinState) };
  };

  it('ไม่ต้อง login: เปิดมาเจอหน้าเพิ่มสินค้าพร้อมปุ่มร้านบน / ร้านล่าง', () => {
    const el = open().nativeElement as HTMLElement;
    expect(el.querySelector('app-phumalin-pos')).not.toBeNull();
    expect(Array.from(el.querySelectorAll('.pm-store')).map((b) => b.textContent?.trim())).toEqual(['ร้านบน', 'ร้านล่าง']);
  });

  it('เมนูบนเป็นภาษาไทย / ซ่อนเวลา แจ้งเตือน โปรไฟล์ ของ navbar กลางเฉพาะตอนอยู่หน้านี้', () => {
    const el = open().nativeElement as HTMLElement;
    expect(Array.from(el.querySelectorAll('.con_nav .he')).map((b) => b.textContent?.trim())).toEqual(['เพิ่มสินค้า', 'แดชบอร์ด', 'คลังสินค้า']);
    expect(document.body.classList).toContain('phumalin-page');
    TestBed.resetTestingModule();
    expect(document.body.classList).not.toContain('phumalin-page');
  });


  it('เปลี่ยนหน้าแบบหน้าเดิม: Pos ออกด้วย fade-out-right รอ 300ms / Inventory ออกด้วย fade-out2 / Dashboard -> Pos ใช้ fade-out-left และ Pos เข้าด้วย Return', fakeAsync(() => {
    const { fixture, el, state } = openWithState();
    expect(el.querySelector('.shell')?.classList).not.toContain('Return'); // เปิดหน้าครั้งแรก

    state.go('inventory');
    fixture.detectChanges();
    expect(el.querySelector('.container_all')?.classList).toContain('fade-out-right');
    expect(el.querySelector('app-phumalin-pos')).not.toBeNull();
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('app-phumalin-inventory')).not.toBeNull();
    expect(el.querySelector('.container')?.classList).not.toContain('Return');

    state.go('dashboard');
    fixture.detectChanges();
    expect(el.querySelector('.Animation_out')?.classList).toContain('fade-out2');
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('.consale')?.classList).toContain('Return'); // มาจาก Inventory

    state.go('pos');
    fixture.detectChanges();
    expect(el.querySelector('.consale')?.classList).toContain('fade-out-left');
    tick(300);
    fixture.detectChanges();
    expect(el.querySelector('.shell')?.classList).toContain('Return');
  }));

  it('เลื่อนขึ้นบนสุดตอนเปิดหน้า / เปลี่ยนหน้าย่อย / สลับร้าน', fakeAsync(() => {
    const scroll = spyOn(window, 'scrollTo');
    const { fixture, state } = openWithState();
    const render = () => { fixture.detectChanges(); TestBed.inject(ApplicationRef).tick(); };
    render();
    expect(scroll).toHaveBeenCalled();
    expect(scroll.calls.mostRecent().args[0] as unknown).toEqual({ top: 0, behavior: 'smooth' });

    scroll.calls.reset();
    state.go('inventory');
    tick(300);
    render();
    expect(scroll).toHaveBeenCalled();

    scroll.calls.reset();
    state.setStore('lower');
    render();
    expect(scroll).toHaveBeenCalled();

    scroll.calls.reset();
    render();
    expect(scroll).not.toHaveBeenCalled(); // ไม่ได้เปลี่ยนอะไร ไม่เลื่อน
  }));
});
