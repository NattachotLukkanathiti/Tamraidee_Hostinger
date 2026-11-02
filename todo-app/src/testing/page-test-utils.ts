// ตัวช่วยสำหรับ unit test ของหน้าต่าง ๆ (ใช้เฉพาะใน *.spec.ts ไม่รวมอยู่ใน bundle ของแอป)
import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TodoService } from '../app/services/todo.service';

// TodoService ปลอม: ทุก method ตอบ [] เป็นค่าเริ่มต้น (override ต่อ test ได้ด้วย .and.returnValue)
export function createTodoServiceMock(): jasmine.SpyObj<TodoService> {
  const names = Object.getOwnPropertyNames(TodoService.prototype).filter((name) => name !== 'constructor');
  const mock = jasmine.createSpyObj<TodoService>('TodoService', names as (keyof TodoService)[]);
  for (const name of names) {
    (mock as unknown as Record<string, jasmine.Spy>)[name].and.returnValue(of([]));
  }
  return mock;
}

// Supabase client ปลอม: ไม่เปิด websocket / ไม่ยิงเครือข่ายจริงระหว่าง test
export function createFakeSupabase() {
  const channel = { on: () => channel, subscribe: () => channel, unsubscribe: () => undefined };
  const bucket = {
    upload: () => Promise.resolve({ data: { path: 'uploaded/file.png' }, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/uploaded/file.png' } })
  };
  return {
    channel: () => channel,
    removeChannel: () => Promise.resolve('ok'),
    storage: { from: () => bucket }
  };
}

export interface PageHarness<T> {
  fixture: ComponentFixture<T>;
  component: T;
  router: Router;
  todo: jasmine.SpyObj<TodoService>;
}

// สร้างหน้าพร้อม history.state ที่กำหนด (เหมือนถูกส่งมาจากหน้าก่อนหน้า) โดยยังไม่รัน ngOnInit
export function setUpPage<T>(
  component: Type<T>,
  state: Record<string, unknown> = { username: 'somchai', email: 'somchai@test.com', role: 'admin', profile: 'p.png' },
  extraProviders: unknown[] = []
): PageHarness<T> {
  mockHistoryState(state);
  const todo = createTodoServiceMock();

  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: TodoService, useValue: todo },
      ...(extraProviders as never[])
    ]
  });
  const router = TestBed.inject(Router);
  spyOn(router, 'navigate').and.resolveTo(true);

  const fixture = TestBed.createComponent(component);
  const instance = fixture.componentInstance as Record<string, unknown>;
  if ('supabase' in instance) {
    // client จริงตั้ง timer รีเฟรช token ไว้ตอนสร้าง ต้องหยุดก่อนแทนด้วยตัวปลอม ไม่งั้น timer ค้างข้าม test
    void (instance['supabase'] as { auth?: { stopAutoRefresh?: () => Promise<void> } }).auth?.stopAutoRefresh?.();
    instance['supabase'] = createFakeSupabase();
  }
  return { fixture, component: fixture.componentInstance, router, todo };
}

// ชื่อ method ที่เป็น Animation* ของ class (ปุ่มเมนูที่เล่น animation แล้วเปลี่ยนหน้า)
// resetsNotification: true = เฉพาะ method ที่ปิดแถบแจ้งเตือน (form_noti), false = เฉพาะที่ไม่ปิด, ไม่ระบุ = ทั้งหมด
export function animationMethods(componentClass: Type<unknown>, resetsNotification?: boolean): string[] {
  const proto = componentClass.prototype;
  return Object.getOwnPropertyNames(proto).filter((name) => {
    // อ่านผ่าน descriptor เพื่อไม่ไปเรียก getter ของ component
    const method = Object.getOwnPropertyDescriptor(proto, name)?.value;
    if (!/^Animation/.test(name) || typeof method !== 'function') return false;
    return resetsNotification === undefined || method.toString().includes('form_noti') === resetsNotification;
  });
}

// จำลอง history.state (เหมือนถูกส่งมาจากหน้าก่อนหน้า) ด้วย spy แทนการเรียก history.replaceState จริง
// เพราะ Chrome จำกัดจำนวนครั้งของ replaceState และจะเมินคำสั่งเงียบ ๆ เมื่อ test เรียกถี่เกินไป
export function mockHistoryState(state: unknown) {
  spyOnProperty(window.history, 'state', 'get').and.returnValue(state);
}

// รอให้ promise ที่ค้างอยู่ทำงานเสร็จ (แทน fixture.whenStable ที่รอ timer อื่นของหน้าด้วย)
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// รอจนเงื่อนไขเป็นจริง (ใช้กับงาน async ของ browser เช่น FileReader)
export async function waitFor(condition: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('waitFor: เงื่อนไขไม่เป็นจริงภายในเวลาที่กำหนด');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
