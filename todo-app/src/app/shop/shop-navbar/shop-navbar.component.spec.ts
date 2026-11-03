import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
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
    expect(el().querySelector('.menu-back-office')).toBeNull();
    expect(el().querySelector('.menu-online-orders')).toBeNull(); // ตรวจสลิปได้เฉพาะพนักงาน
  });

  it('เมนูบัญชี -> My Orders: ปิดเมนูแล้วส่ง event เปิดแผงคำสั่งซื้อ', fakeAsync(() => {
    loginAs('customer');
    const opened = jasmine.createSpy('ordersOpen');
    component.ordersOpen.subscribe(opened);
    fixture.detectChanges();

    component.toggleAccount();
    fixture.detectChanges();
    el().querySelector<HTMLButtonElement>('.menu-orders')!.click();

    expect(opened).toHaveBeenCalled();
    tick(300);
    expect(component.accountOpen).toBeFalse();
    discardPeriodicTasks();
  }));

  it('pos: เมนูบัญชีมี Online Orders ไปหน้าตรวจสลิปพร้อมข้อมูลผู้ใช้ (backend ไม่มี)', () => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    loginAs('pos');
    fixture.detectChanges();
    component.toggleAccount();
    fixture.detectChanges();

    el().querySelector<HTMLButtonElement>('.menu-online-orders')!.click();

    expect(navigate).toHaveBeenCalledWith(['/online-orders'], { state: jasmine.objectContaining({ role: 'pos' }) });
    expect(component.accountOpen).toBeFalse();

    loginAs('backend');
    expect(component.canReviewOrders).toBeFalse();
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

    el().querySelector<HTMLButtonElement>('.menu-back-office')!.click();

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

  describe('เมนูประเภทสินค้า (ปุ่มเปลี่ยนหน้าแบบหลังร้าน)', () => {
    const items = () => el().querySelectorAll<HTMLButtonElement>('.con_ber .h');
    const openMenu = () => {
      el().querySelector<HTMLButtonElement>('.hamburger')!.click();
      fixture.detectChanges();
    };

    beforeEach(() => {
      fixture.componentRef.setInput('categories', [
        { label: 'All products', count: 4 },
        { label: 'Fruit', count: 2 }
      ]);
      fixture.componentRef.setInput('selectedCategory', 'Fruit');
      fixture.detectChanges();
    });

    it('แถบกลาง navbar แบบ Dashboard: แสดงเท่าที่พอดีแถวเดียว ที่ล้นซ่อนไว้ในปุ่ม More', () => {
      const links = () => el().querySelectorAll<HTMLButtonElement>('.nav-links .he');
      expect(Array.from(links(), b => b.textContent?.trim())).toEqual(['All products', 'Fruit']);
      expect(el().querySelector('.he.more')).toBeNull(); // ยังไม่วัด = พอดีทั้งหมด

      // จำลองแถบกว้าง 150px: All products (100) พอดี แต่ Fruit (60) ต้องเผื่อที่ให้ More (40) จึงไม่พอ
      const nav = el().querySelector<HTMLElement>('.con_nav')!;
      Object.defineProperty(nav, 'clientWidth', { value: 150, configurable: true });
      Object.defineProperty(links()[0], 'offsetWidth', { value: 100 });
      Object.defineProperty(links()[1], 'offsetWidth', { value: 60 });
      el().querySelector<HTMLElement>('.nav-links')!.style.columnGap = '0px';
      component.fitLinks();
      fixture.detectChanges();
      Object.defineProperty(el().querySelector('.he.more')!, 'offsetWidth', { value: 40 });
      component.fitLinks();
      fixture.detectChanges();

      expect(component.fitCount()).toBe(1);
      expect(links()[1].classList).toContain('overflowed');
      expect(links()[1].getAttribute('tabindex')).toBe('-1');
      const more = el().querySelector<HTMLButtonElement>('.he.more')!;
      expect(more.classList).toContain('active'); // ประเภทที่เลือก (Fruit) อยู่ในส่วนที่ซ่อน

      Object.defineProperty(nav, 'clientWidth', { value: 400 }); // จอกว้างขึ้นจนพอดีทั้งหมด
      component.fitLinks();
      fixture.detectChanges();
      expect(el().querySelector('.he.more')).toBeNull();
      component.fitCount.set(1);
      fixture.detectChanges();

      el().querySelector<HTMLButtonElement>('.he.more')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.he.more')?.getAttribute('aria-expanded')).toBe('true');
      expect(items().length).toBe(2);
    });

    it('กดลิงก์ประเภทบนแถบกลาง: ส่ง event ประเภทนั้น', () => {
      const picked = jasmine.createSpy('categorySelect');
      component.categorySelect.subscribe(picked);

      el().querySelector<HTMLButtonElement>('.nav-links .he')!.click();

      expect(picked).toHaveBeenCalledWith('All products');
    });

    it('กดปุ่มแล้วแสดงทุกประเภทพร้อมจำนวน และไฮไลต์ประเภทที่เลือกอยู่', () => {
      expect(el().querySelector('.con_ber')).toBeNull();

      openMenu();

      expect(el().querySelector('.hamburger')?.getAttribute('aria-expanded')).toBe('true');
      expect(Array.from(items(), b => b.textContent?.replace(/\s+/g, ' ').trim())).toEqual(['All products 4', 'Fruit 2']);
      expect(items()[1].classList).toContain('active');
      expect(items()[1].getAttribute('aria-current')).toBe('page');
      expect(items()[0].classList).not.toContain('active');
    });

    it('เลือกประเภท: ส่ง event แล้วปิดเมนูด้วยแอนิเมชัน fade_out', fakeAsync(() => {
      const picked = jasmine.createSpy('categorySelect');
      component.categorySelect.subscribe(picked);
      openMenu();

      items()[0].click();
      fixture.detectChanges();

      expect(picked).toHaveBeenCalledWith('All products');
      expect(el().querySelector('.con_ber')?.classList).toContain('closing');
      tick(300);
      fixture.detectChanges();
      expect(el().querySelector('.con_ber')).toBeNull();
      discardPeriodicTasks();
    }));

    it('ปิดได้ด้วยปุ่มเดิม พื้นหลัง และ Esc / เปิดเมนูบัญชีแล้วเมนูประเภทปิด', fakeAsync(() => {
      openMenu();
      el().querySelector<HTMLButtonElement>('.hamburger')!.click();
      tick(300);
      expect(component.menuOpen).toBeFalse();

      openMenu();
      el().querySelector<HTMLButtonElement>('.menu-backdrop')!.click();
      tick(300);
      expect(component.menuOpen).toBeFalse();

      openMenu();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      tick(300);
      expect(component.menuOpen).toBeFalse();

      loginAs('user');
      openMenu();
      component.toggleAccount();
      tick(300);
      expect(component.menuOpen).toBeFalse();
      expect(component.accountOpen).toBeTrue();

      component.toggleMenu(); // เปิดเมนูประเภท ก็ปิดเมนูบัญชี
      tick(300);
      expect(component.accountOpen).toBeFalse();
      expect(component.menuOpen).toBeTrue();
      discardPeriodicTasks();
    }));
  });

  it('นาฬิกาเดินทุกวินาที', fakeAsync(() => {
    fixture.detectChanges();
    const before = component.currentTime.getTime();

    tick(1000);

    expect(component.currentTime.getTime()).toBeGreaterThanOrEqual(before);
    fixture.destroy();
  }));
});
