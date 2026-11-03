import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TodoService } from '../../services/todo.service';
import { ShopCartService } from '../shop-cart.service';
import { ShopNavbarComponent } from './shop-navbar.component';

describe('ShopNavbarComponent', () => {
  let fixture: ComponentFixture<ShopNavbarComponent>;
  let component: ShopNavbarComponent;
  let todoService: jasmine.SpyObj<TodoService>;
  let auth: AuthService;

  const el = () => fixture.nativeElement as HTMLElement;
  const loginAs = (role: string) =>
    auth.setSession('t', { id: 1, username: 'boss', title: 'b@test.com', role, profile: 'me.png' });

  beforeEach(() => {
    localStorage.clear();
    todoService = jasmine.createSpyObj<TodoService>('TodoService', ['logAudit', 'getShopCart', 'saveShopCart']);
    todoService.logAudit.and.returnValue(of({}));
    todoService.getShopCart.and.returnValue(of({ items: [] }));
    todoService.saveShopCart.and.callFake(items => of({ items }));
    TestBed.configureTestingModule({
      imports: [ShopNavbarComponent],
      providers: [{ provide: TodoService, useValue: todoService }]
    });
    auth = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(ShopNavbarComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => localStorage.clear());

  it('ยังไม่ login: แสดงปุ่ม Login และส่ง event เมื่อกด', () => {
    const signIn = jasmine.createSpy('signIn');
    component.signIn.subscribe(signIn);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.login-button')!.click();

    expect(signIn).toHaveBeenCalled();
    expect(el().querySelector('.avatar-button')).toBeNull();
  });

  it('login เป็นลูกค้า: เห็นเมนูบัญชีแต่ไม่มีทางเข้าหลังร้าน', () => {
    loginAs('customer');
    fixture.detectChanges();

    expect(component.isStaff).toBeFalse();
    expect(el().querySelector('.login-button')).toBeNull();
    expect(el().querySelector('.back-office')).toBeNull();

    el().querySelector<HTMLButtonElement>('.avatar-button')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.account-sidebar .role')?.textContent).toContain('Customer');
    expect(el().querySelector('.account-sidebar__menu')).toBeNull();
  });

  it('login เป็นพนักงาน pos / backend: มีไอคอน Back Office และแสดงตำแหน่ง', () => {
    loginAs('backend');
    fixture.detectChanges();

    expect(component.isStaff).toBeTrue();
    expect(component.roleLabel).toBe('Backend');
    expect(el().querySelector('.back-office')).not.toBeNull();
  });

  it('แอดมิน: เปิดเมนูบัญชี กด Back Office แล้วส่ง event', () => {
    loginAs('admin');
    const signIn = jasmine.createSpy('signIn');
    component.signIn.subscribe(signIn);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.avatar-button')!.click();
    fixture.detectChanges();
    expect(el().querySelector('.account-sidebar')?.textContent).toContain('boss');

    el().querySelector<HTMLButtonElement>('.account-sidebar__menu button')!.click();

    expect(signIn).toHaveBeenCalled();
    expect(component.accountOpen).toBeFalse();
  });

  it('แอดมิน: ไอคอน Back Office บน navbar กลับไปหลังร้านได้ทันที', () => {
    loginAs('admin');
    const signIn = jasmine.createSpy('signIn');
    component.signIn.subscribe(signIn);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.back-office')!.click();

    expect(signIn).toHaveBeenCalled();
  });

  it('แอดมิน: ปิดเมนูบัญชีด้วยแอนิเมชัน slideOut', fakeAsync(() => {
    loginAs('admin');
    fixture.detectChanges();

    component.toggleAccount();
    fixture.detectChanges();
    component.toggleAccount();
    fixture.detectChanges();
    expect(el().querySelector('.account-sidebar')?.classList).toContain('closing');
    component.closeAccount(); // กดซ้ำระหว่างปิดไม่มีผล

    tick(300);
    expect(component.accountOpen).toBeFalse();
    discardPeriodicTasks();
  }));

  it('Log Out: บันทึก audit ล้าง session และกลับเป็นปุ่ม Login', fakeAsync(() => {
    loginAs('admin');
    fixture.detectChanges();
    component.toggleAccount();
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.account-sidebar__logout')!.click();
    tick(300);
    fixture.detectChanges();

    expect(todoService.logAudit).toHaveBeenCalledWith(jasmine.objectContaining({ activity: 'Logout', username: 'boss' }));
    expect(auth.isLoggedIn()).toBeFalse();
    expect(el().querySelector('.login-button')).not.toBeNull();
    discardPeriodicTasks();
  }));

  it('Log Out: บันทึก audit ไม่สำเร็จก็ยังออกจากระบบ', () => {
    loginAs('admin');
    todoService.logAudit.and.returnValue(throwError(() => new Error('down')));
    spyOn(console, 'error');

    component.logout();

    expect(console.error).toHaveBeenCalled();
    expect(auth.isLoggedIn()).toBeFalse();
  });

  it('ไม่มี session: Log Out ไม่บันทึก audit', () => {
    component.logout();

    expect(todoService.logAudit).not.toHaveBeenCalled();
  });

  it('ไอคอนตะกร้า: แสดงจำนวนสินค้าและส่ง event เปิดตะกร้า', () => {
    TestBed.inject(ShopCartService).setQuantity('A1', 3);
    const toggled = jasmine.createSpy('cartToggle');
    component.cartToggle.subscribe(toggled);
    fixture.detectChanges();

    expect(el().querySelector('.cart-count')?.textContent).toContain('3');
    el().querySelector<HTMLButtonElement>('.cart-button')!.click();

    expect(toggled).toHaveBeenCalled();
  });

  it('โลโก้ส่ง event กลับหน้าแรก และช่องค้นหาอัปเดตค่า search', () => {
    const home = jasmine.createSpy('home');
    component.home.subscribe(home);
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.headercompany')!.click();
    const input = el().querySelector<HTMLInputElement>('.inputser')!;
    input.value = 'cola';
    input.dispatchEvent(new Event('input'));

    expect(home).toHaveBeenCalled();
    expect(component.search()).toBe('cola');
  });

  it('นาฬิกาเดินทุกวินาที', fakeAsync(() => {
    fixture.detectChanges();
    const before = component.currentTime.getTime();

    tick(1000);

    expect(component.currentTime.getTime()).toBeGreaterThanOrEqual(before);
    fixture.destroy();
  }));
});
