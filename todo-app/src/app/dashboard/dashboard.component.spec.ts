import { fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { animationMethods, setUpPage } from '../../testing/page-test-utils';
import { DashboardComponent } from './dashboard.component';

// วันพุธที่ 4 พ.ย. 2026 เวลา 12:00 (สัปดาห์นี้คือจันทร์ 2 – อาทิตย์ 8 พ.ย.)
const NOW = new Date(2026, 10, 4, 12, 0, 0);
const at = (month: number, day: number, hour = 12) => new Date(2026, month, day, hour).toISOString();

describe('DashboardComponent', () => {
  describe('เมื่อเปิดหน้า', () => {
    it('อ่านข้อมูลผู้ใช้จาก state และโหลดข้อมูลสรุป', () => {
      const { fixture, component, todo } = setUpPage(DashboardComponent);

      fixture.detectChanges();

      expect(component.username).toBe('somchai');
      expect(todo.getSummary).toHaveBeenCalled();
      expect(todo.getSaleOrders).toHaveBeenCalled();
      fixture.destroy();
    });

    it('กลับมาจากหน้าแจ้งเตือน (form_noti): จำสถานะไว้และไม่เล่น animation', () => {
      const { fixture, component } = setUpPage(DashboardComponent, { username: 'somchai', email: 's@test.com', form_noti: true, stan: true });

      fixture.detectChanges();

      expect(component.form_noti).toBeTrue();
      expect(component.stan).toBeFalse();
      expect(component.play_Return).toBeFalse();
      expect(component.out).toBeFalse();
      fixture.destroy();
    });

    it('เข้ามาจากหน้า login (stan): เล่น animation เข้าหน้า', () => {
      const { fixture, component } = setUpPage(DashboardComponent, { username: 'somchai', email: 's@test.com', stan: true });

      fixture.detectChanges();

      expect(component.stan).toBeTrue();
      expect(component.inhere).toBeTrue();
      fixture.destroy();
    });

    it('กลับมาจากหน้าอื่น (Move_return, Dont_animation)', () => {
      const { fixture, component } = setUpPage(DashboardComponent, {
        username: 'somchai',
        email: 's@test.com',
        Move_return: true,
        Dont_animation: true
      });

      fixture.detectChanges();

      expect(component.play_Return).toBeTrue();
      expect(component.outs).toBeTrue();
      expect(component.inhere).toBeFalse();
      fixture.destroy();
    });

    it('ไม่มี session: แจ้งเตือน', () => {
      const { fixture, component } = setUpPage(DashboardComponent, {});

      fixture.detectChanges();

      expect(component.showpopupnoti).toBeTrue();
      fixture.destroy();
    });
  });

  describe('เมนูนำทาง', () => {
    for (const name of animationMethods(DashboardComponent, true)) {
      it(`${name} ปิดแถบแจ้งเตือน แล้วเปลี่ยนหน้า`, fakeAsync(() => {
        const { component, router } = setUpPage(DashboardComponent);
        component.form_noti = true;

        (component as unknown as Record<string, () => void>)[name]();
        tick(1000);

        expect(component.form_noti).toBeFalse();
        expect(router.navigate).toHaveBeenCalled();
      }));
    }
  });

  describe('รายชื่อผู้ใช้ (loadTodos)', () => {
    const users = [{ email: 'a@test.com' }, { email: 'b@test.com' }];

    it('มีอีเมลของผู้ใช้ปัจจุบัน: เก็บเฉพาะของตัวเอง', () => {
      const { component, todo } = setUpPage(DashboardComponent);
      todo.getTodoss.and.returnValue(of(users));
      component.navigationState = { state: { email: 'b@test.com' } };
      spyOn(console, 'log');

      component.loadTodos();

      expect(component.todos).toEqual([{ email: 'b@test.com' }]);
    });

    it('ไม่มีอีเมล: เก็บทั้งหมด', () => {
      const { component, todo } = setUpPage(DashboardComponent);
      todo.getTodoss.and.returnValue(of(users));
      spyOn(console, 'log');

      component.loadTodos();

      expect(component.todos).toHaveSize(2);
    });

    it('โหลดไม่สำเร็จ: บันทึก error', () => {
      const { component, todo } = setUpPage(DashboardComponent);
      todo.getTodoss.and.returnValue(throwError(() => new Error('down')));
      const logged = spyOn(console, 'error');

      component.loadTodos();

      expect(logged).toHaveBeenCalled();
    });
  });

  describe('ยอดขายรายสัปดาห์และกราฟ (ใช้เวลาจำลอง)', () => {
    beforeEach(() => {
      jasmine.clock().install();
      jasmine.clock().mockDate(NOW);
    });

    afterEach(() => jasmine.clock().uninstall());

    const orders = [
      { status: 'Completed', created_at: at(10, 3, 11), amount: '100' },
      { status: 'completed', created_at: at(10, 3, 11), amount: 50 },
      { status: 'Completed', created_at: at(10, 3, 9), amount: 999 },
      { status: 'Canceled', created_at: at(10, 3, 11), amount: 999 },
      { status: 'Completed', amount: 999 },
      { status: 'Completed', created_at: at(10, 9, 11), amount: 7 },
      { status: 'Completed', created_at: at(9, 30, 15), amount: 20 }
    ];

    describe('สัปดาห์ที่เลือก', () => {
      it('แสดงช่วงวันจันทร์ถึงอาทิตย์ของสัปดาห์นี้ และรวมยอดเฉพาะในสัปดาห์', () => {
        const { component } = setUpPage(DashboardComponent);
        component.allSaleOrders = orders;

        component.updateWeeklySales();

        expect(component.currentWeekRange).toBe('Nov 2 - Nov 8');
        expect(component.weeklySalesData).toEqual({ 'Tue-11': 150 });
      });

      it('changeWeek ย้ายไปสัปดาห์ก่อนหน้า/ถัดไป', () => {
        const { component } = setUpPage(DashboardComponent);
        component.allSaleOrders = orders;

        component.changeWeek(-1);
        expect(component.currentWeekRange).toBe('Oct 26 - Nov 1');
        expect(component.weeklySalesData).toEqual({ 'Fri-15': 20 });

        component.changeWeek(2);
        expect(component.currentWeekRange).toBe('Nov 9 - Nov 15');
        expect(component.weeklySalesData).toEqual({ 'Mon-11': 7 });
      });

      it('วันอาทิตย์ถือเป็นวันสุดท้ายของสัปดาห์ (ไม่ใช่วันแรก)', () => {
        jasmine.clock().mockDate(new Date(2026, 10, 1, 12));
        const { component } = setUpPage(DashboardComponent);
        component.allSaleOrders = [];

        component.updateWeeklySales();

        expect(component.currentWeekRange).toBe('Oct 26 - Nov 1');
      });
    });

    describe('processWeeklySales', () => {
      it('นับเฉพาะออเดอร์ที่สำเร็จ ช่วง 10:00–17:59 รวมยอดตามวันและชั่วโมง', () => {
        const { component } = setUpPage(DashboardComponent);

        component.processWeeklySales([
          ...orders,
          { status: 'Completed', created_at: at(10, 3, 11), amount: 'abc' },
          { status: 'Completed', created_at: at(10, 3, 18), amount: 5 }
        ]);

        expect(component.weeklySalesData['Tue-11']).toBe(150);
        expect(component.weeklySalesData['Tue-9']).toBeUndefined();
        expect(component.weeklySalesData['Tue-18']).toBeUndefined();
        expect(component.weeklySalesData['Mon-11']).toBe(7);
      });
    });

    describe('getHeatmapClass', () => {
      it('แบ่งระดับสีตามยอดขายของแต่ละช่วงเวลา', () => {
        const { component } = setUpPage(DashboardComponent);
        component.weeklySalesData = { 'Mon-10': 60000, 'Mon-11': 40000, 'Mon-12': 20000, 'Mon-13': 10000 };

        expect(component.getHeatmapClass('Mon', 0)).toBe(3);
        expect(component.getHeatmapClass('Mon', 1)).toBe(2);
        expect(component.getHeatmapClass('Mon', 2)).toBe(1);
        expect(component.getHeatmapClass('Mon', 3)).toBe(0);
        expect(component.getHeatmapClass('Tue', 0)).toBe(0);
      });
    });

    describe('processSaleOrdersForChart', () => {
      const chart = [
        { status: 'Completed', created_at: at(10, 4, 9), amount: 100 },
        { status: 'Completed', created_at: at(10, 3, 9), amount: 50 },
        { status: 'Completed', created_at: at(9, 20, 9), amount: 25 },
        { status: 'Pending', created_at: at(10, 4, 9), amount: 1000 },
        { status: 'Completed', amount: 1000 },
        { status: 'Completed', created_at: at(10, 4, 9), amount: 'x' }
      ];

      let component: DashboardComponent;
      beforeEach(() => {
        component = setUpPage(DashboardComponent).component;
      });

      const labelsFor = (range: string) => {
        component.processSaleOrdersForChart(chart, range);
        return component;
      };

      it('1D: หนึ่งช่วง (วันนี้)', () => {
        const component = labelsFor('1D');

        expect(component.months).toEqual(['Nov 4']);
        expect(component.data).toEqual([{ month: 'Nov 4', value: 100 }]);
        expect(component.totalSales).toBe(175);
      });

      it('1W: 7 วันล่าสุด จัดกลุ่มตามชื่อวัน (การกรองช่วงวันที่ทำก่อนหน้านี้ใน filterDataByRange)', () => {
        const component = labelsFor('1W');

        expect(component.months).toHaveSize(7);
        expect(component.months[6]).toBe('Wed');
        expect(component.data.find((d: { month: string }) => d.month === 'Wed')?.value).toBe(100);
        // วันอังคารรวมทั้ง 3 พ.ย. (50) และ 20 ต.ค. (25) เพราะจัดกลุ่มตามชื่อวัน
        expect(component.data.find((d: { month: string }) => d.month === 'Tue')?.value).toBe(75);
      });

      it('1M / 3M / 6M: จัดกลุ่มตามเดือน ตามจำนวนเดือนที่เลือก', () => {
        expect(labelsFor('1M').months).toEqual(['Nov']);
        expect(labelsFor('3M').months).toEqual(['Sep', 'Oct', 'Nov']);
        expect(labelsFor('6M').months).toHaveSize(6);
        expect(labelsFor('3M').data).toEqual([
          { month: 'Sep', value: 0 },
          { month: 'Oct', value: 25 },
          { month: 'Nov', value: 150 }
        ]);
      });

      it('1Y: ครบ 12 เดือน', () => {
        const component = labelsFor('1Y');

        expect(component.months).toHaveSize(12);
        expect(component.data.find((d: { month: string }) => d.month === 'Nov')?.value).toBe(150);
        expect(component.data.find((d: { month: string }) => d.month === 'Oct')?.value).toBe(25);
      });

      it('ช่วงเวลาที่ไม่รู้จัก: ไม่มีแกน X แต่ยังรวมยอดได้', () => {
        const component = labelsFor('ALL');

        expect(component.months).toEqual([]);
        expect(component.totalSales).toBe(175);
      });
    });

    describe('filterDataByRange', () => {
      const dated = [
        { created_at: new Date(NOW.getTime() - 0.5 * 86400000).toISOString() },
        { created_at: new Date(NOW.getTime() - 5 * 86400000).toISOString() },
        { created_at: new Date(NOW.getTime() - 20 * 86400000).toISOString() },
        { created_at: new Date(NOW.getTime() - 60 * 86400000).toISOString() },
        { created_at: new Date(NOW.getTime() - 150 * 86400000).toISOString() },
        { created_at: new Date(NOW.getTime() - 300 * 86400000).toISOString() },
        {}
      ];

      const cases: [string, number][] = [['1D', 1], ['1W', 2], ['1M', 3], ['3M', 4], ['6M', 5], ['1Y', 6], ['ALL', 6]];

      for (const [range, expected] of cases) {
        it(`${range}: ส่งออเดอร์ ${expected} รายการเข้ากราฟ`, () => {
          const { component } = setUpPage(DashboardComponent);
          const chartSpy = spyOn(component, 'processSaleOrdersForChart');
          component.allSaleOrders = dated;

          component.filterDataByRange(range);

          expect(chartSpy.calls.mostRecent().args[0]).toHaveSize(expected);
          expect(chartSpy.calls.mostRecent().args[1]).toBe(range);
        });
      }

      it('selectRange จำช่วงที่เลือกและกรองใหม่', () => {
        const { component } = setUpPage(DashboardComponent);
        const filter = spyOn(component, 'filterDataByRange');

        component.selectRange('3M');

        expect(component.selectedRange).toBe('3M');
        expect(filter).toHaveBeenCalledWith('3M');
      });
    });

    describe('loadSaleOrders', () => {
      it('เก็บเฉพาะออเดอร์ที่สำเร็จ (ไม่สนตัวพิมพ์) แล้วคำนวณสัปดาห์และกราฟ', () => {
        const { component, todo } = setUpPage(DashboardComponent);
        todo.getSaleOrders.and.returnValue(of([
          { status: 'Completed', created_at: at(10, 3, 11), amount: 100 },
          { status: 'completed', created_at: at(10, 3, 12), amount: 50 },
          { status: 'Canceled', created_at: at(10, 3, 12), amount: 999 },
          { created_at: at(10, 3, 12), amount: 1 }
        ]));

        component.loadSaleOrders();

        expect(component.allSaleOrders).toHaveSize(2);
        expect(component.saleOrders).toHaveSize(2);
        expect(component.currentWeekRange).toBe('Nov 2 - Nov 8');
        expect(component.totalSales).toBe(150);
      });

      it('โหลดไม่สำเร็จ: บันทึก error โดยไม่พัง', () => {
        const { component, todo } = setUpPage(DashboardComponent);
        todo.getSaleOrders.and.returnValue(throwError(() => new Error('down')));
        const logged = spyOn(console, 'error');

        component.loadSaleOrders();

        expect(logged).toHaveBeenCalled();
      });
    });
  });

  describe('formatK', () => {
    const cases: [number, string][] = [
      [0, '0'],
      [999, '999'],
      [1000, '1K'],
      [1500, '1.5K'],
      [999999, '1000K'],
      [1000000, '1M'],
      [2500000, '2.5M']
    ];

    for (const [value, expected] of cases) {
      it(`${value} -> ${expected}`, () => {
        const { component } = setUpPage(DashboardComponent);

        expect(component.formatK(value)).toBe(expected);
      });
    }
  });

  describe('ตารางสินค้าขายดี: แบ่งหน้า', () => {
    it('รวมจำนวนตามสินค้า แบ่งหน้าละ 5 และเปลี่ยนหน้าได้เฉพาะที่มีอยู่', () => {
      const { component } = setUpPage(DashboardComponent);
      component.saleOrders = Array.from({ length: 12 }, (_, i) => ({ product_name: `P${i % 7}`, quantity: i + 1 }));

      expect(component.getGroupedSaleOrders()).toHaveSize(7);
      expect(component.getGroupedSaleOrders()[0].quantity).toBe(1 + 8);
      expect(component.totalPages).toBe(2);
      expect(component.paginatedSaleOrders).toHaveSize(5);

      component.changePage(2);
      expect(component.paginatedSaleOrders).toHaveSize(2);
      component.changePage(3);
      component.changePage(0);
      expect(component.currentPage).toBe(2);
    });
  });
});
