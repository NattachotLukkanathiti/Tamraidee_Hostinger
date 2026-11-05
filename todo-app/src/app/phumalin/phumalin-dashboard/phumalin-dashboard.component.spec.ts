import { of } from 'rxjs';
import { PhumalinDashboardComponent } from './phumalin-dashboard.component';
import { pmItem, pmMove, setUpPhumalin } from '../phumalin-test-utils';

describe('PhumalinDashboardComponent', () => {
  it('สรุป: เบิกวันนี้ (นับตามรหัส) / เติมวันนี้ / ของหมด / จำนวนวัตถุดิบ และหมวดที่เบิกบ่อย', () => {
    const page = setUpPhumalin(PhumalinDashboardComponent);
    page.api.getItems.and.returnValue(of([pmItem({ id: 1 }), pmItem({ id: 2, quantity: 0, category: 'meat' })]));
    page.api.getMovements.and.returnValue(of([
      pmMove({ id: 1, order_code: 'UP-1', item_name: 'Cabbage' }),
      pmMove({ id: 2, order_code: 'UP-1', item_name: 'Pork', category: 'meat' }),
      pmMove({ id: 3, order_code: 'UP-2', item_name: 'Cabbage' }),
      pmMove({ id: 4, type: 'in', quantity: 3, order_code: null })
    ]));
    const { component, el } = page.create();

    expect(page.api.getMovements).toHaveBeenCalledWith('upper', 2000);
    expect(component.summary).toEqual({ withdrawalsToday: 2, addedToday: 1, outOfStock: 1, items: 2 });
    expect(component.totalWithdrawals).toBe(3);
    expect(component.topItems[0]).toEqual(jasmine.objectContaining({ name: 'Cabbage', count: 2 }));
    expect(component.categoryUsage).toEqual([{ name: 'ผัก', percent: 100 }, { name: 'เนื้อสัตว์', percent: 50 }]);
    expect(el.querySelectorAll('.con_data_row').length).toBe(4);
  });
});
