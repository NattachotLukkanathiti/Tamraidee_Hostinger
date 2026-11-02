import { of, throwError } from 'rxjs';
import { setUpPage } from '../../testing/page-test-utils';
import { AuditComponent } from './audit.component';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe('AuditComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลด audit log', () => {
      const { fixture, component, todo } = setUpPage(AuditComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(todo.getAudit).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(AuditComponent, { username: 'somchai', email: 's@test.com', form_noti: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      expect(component.out).toBeFalse();
      fixture.destroy();
    });

    const returnStates: [string, boolean][] = [
      ['Move_return', false],
      ['Move_returns3', false],
      ['Move_return4', true],
      ['Move_return44', false],
      ['Move_return6', false]
    ];

    for (const [name, playReturn] of returnStates) {
      it(`กลับมาจากหน้าอื่นด้วย ${name}: ปิด animation ออก และ play_Return = ${playReturn}`, () => {
        const { fixture, component } = setUpPage(AuditComponent, { username: 'somchai', email: 's@test.com', [name]: true });

        fixture.detectChanges();

        expect(component.out).toBeFalse();
        expect(component.play_Return).toBe(playReturn);
        fixture.destroy();
      });
    }

    it('ไม่มี session: แจ้งเตือน', () => {
      const { fixture, component } = setUpPage(AuditComponent, {});

      fixture.detectChanges();

      expect(component.showpopupnoti).toBeTrue();
      fixture.destroy();
    });
  });

  describe('โหลด audit log', () => {
    it('สำเร็จ: เก็บรายการ และคำนวณหน้า', () => {
      const { component, todo } = setUpPage(AuditComponent);
      todo.getAudit.and.returnValue(of([{ activity: 'Login' }, { activity: 'Logout' }]));

      component.loadAudit();

      expect(component.auditLogs).toHaveSize(2);
      expect(component.filteredAuditLogs).toHaveSize(2);
      expect(component.loader).toBeFalse();
    });

    it('ไม่สำเร็จ: หยุดโหลดและบันทึก error', () => {
      const { component, todo } = setUpPage(AuditComponent);
      todo.getAudit.and.returnValue(throwError(() => new Error('down')));
      const logged = spyOn(console, 'error');

      component.loadAudit();

      expect(logged).toHaveBeenCalled();
      expect(component.loader).toBeFalse();
    });
  });

  describe('กรองตามกิจกรรมและช่วงวันที่', () => {
    const logs = [
      { activity: 'Login', date: daysAgo(0) },
      { activity: 'Create Order: #1', date: daysAgo(3) },
      { activity: 'Add Supplier', date: daysAgo(10) },
      { activity: 'Edit Product', date: daysAgo(20) },
      { activity: 'Update Stock', date: daysAgo(40) },
      { activity: 'Delete Employee', date: daysAgo(5) },
      { activity: 'Cancel Order: #2', date: daysAgo(15) },
      { activity: undefined, date: daysAgo(1) }
    ];

    let component: AuditComponent;
    beforeEach(() => {
      component = setUpPage(AuditComponent).component;
    });

    const filteredActivities = (activity: string, range = 'all') => {
      component.auditLogs = logs;
      component.selectedActivity = activity;
      component.selectedDateRange = range;
      component.filterAudit();
      return component.filteredAuditLogs.map((log) => log.activity);
    };

    it('all: แสดงทุกรายการ', () => {
      expect(filteredActivities('all')).toHaveSize(8);
    });

    it('create: ตรงกับ create หรือ add', () => {
      expect(filteredActivities('create')).toEqual(['Create Order: #1', 'Add Supplier']);
    });

    it('edit: ตรงกับ edit หรือ update', () => {
      expect(filteredActivities('edit')).toEqual(['Edit Product', 'Update Stock']);
    });

    it('delete: ตรงกับ delete หรือ cancel', () => {
      expect(filteredActivities('delete')).toEqual(['Delete Employee', 'Cancel Order: #2']);
    });

    it('กิจกรรมอื่น: ค้นหาด้วยคำนั้นโดยตรง', () => {
      expect(filteredActivities('login')).toEqual(['Login']);
    });

    it('ช่วง 7 วัน และ 30 วัน', () => {
      expect(filteredActivities('all', '7')).toEqual(['Login', 'Create Order: #1', 'Delete Employee', undefined]);
      expect(filteredActivities('all', '30')).toHaveSize(7);
    });

    it('กรองกิจกรรมร่วมกับช่วงวันที่', () => {
      expect(filteredActivities('create', '7')).toEqual(['Create Order: #1']);
    });
  });

  describe('แบ่งหน้า', () => {
    it('changePage แสดงเฉพาะรายการของหน้านั้น และไม่เปลี่ยนเมื่อเกินขอบเขต', () => {
      const { component } = setUpPage(AuditComponent);
      component.itemsPerPage = 2;
      component.filteredAuditLogs = [1, 2, 3, 4, 5].map((n) => ({ activity: `a${n}` }));
      component.totalPages = 3;

      component.changePage(2);
      expect(component.currentPage).toBe(2);
      expect(component.paginatedAuditLogs.map((l) => l.activity)).toEqual(['a3', 'a4']);

      component.changePage(0);
      component.changePage(4);
      expect(component.currentPage).toBe(2);
    });

    it('visiblePages แสดงทีละ 3 หน้า', () => {
      const { component } = setUpPage(AuditComponent);
      component.totalPages = 7;

      component.currentPage = 2;
      expect(component.visiblePages).toEqual([1, 2, 3]);
      component.currentPage = 7;
      expect(component.visiblePages).toEqual([7]);
    });
  });

  it('logout: บันทึก audit แล้วกลับหน้า login แม้บันทึกไม่สำเร็จ', () => {
    const { component, todo, router } = setUpPage(AuditComponent);
    component.username = 'somchai';
    spyOn(console, 'error');

    component.logout();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    todo.logAudit.and.returnValue(throwError(() => new Error('down')));
    component.logout();
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});
