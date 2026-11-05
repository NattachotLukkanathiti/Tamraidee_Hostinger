import { of, throwError } from 'rxjs';
import { setUpPage } from '../../testing/page-test-utils';
import { SettingsPageComponent } from './setting.component';

describe('SettingsPageComponent', () => {
  const STORE = { id: 1, email: 'shop@test.com', phone: '081-111-2222', address: 'Bangkok' };

  const open = (settings: object | null) => {
    const page = setUpPage(SettingsPageComponent);
    page.todo.getSettings.and.returnValue(of(settings));
    page.todo.saveSettings.and.returnValue(of({ success: true }));
    page.todo.logAudit.and.returnValue(of({}));
    page.fixture.detectChanges();
    return { ...page, el: page.fixture.nativeElement as HTMLElement };
  };
  const switches = (el: HTMLElement) => el.querySelectorAll<HTMLInputElement>('.switch');

  it('โหลดการตั้งค่าร้านและการตั้งค่า POS มาแสดง', async () => {
    const { fixture, component, el } = open({ ...STORE, pos_hide_prices: true, pos_allow_price_edit: false });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.posSettingsAvailable).toBeTrue();
    expect(switches(el).length).toBe(2);
    expect(switches(el)[0].checked).toBeTrue();
    expect(switches(el)[1].checked).toBeFalse();
    expect(el.textContent).toContain('Allow price editing at checkout');
  });

  it('กดสวิตช์แล้วบันทึก: ส่งค่า POS ไปพร้อมข้อมูลร้าน และบันทึก audit', async () => {
    const { fixture, component, el, todo } = open({ ...STORE, pos_hide_prices: false, pos_allow_price_edit: false });
    await fixture.whenStable();
    fixture.detectChanges();

    switches(el)[1].click();
    fixture.detectChanges();
    component.save();

    expect(todo.saveSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 1, address: 'Bangkok', pos_hide_prices: false, pos_allow_price_edit: true
    }));
    expect(todo.logAudit).toHaveBeenCalledWith(jasmine.objectContaining({ activity: 'Update Store Settings' }));
    expect(component.showpopup).toBeTrue();
  });

  it('ฐานข้อมูลยังไม่มีคอลัมน์การตั้งค่า POS: ซ่อนสวิตช์ แจ้งให้รัน migration และไม่ส่งค่า POS ไปบันทึก', () => {
    const { component, el, todo } = open(STORE);

    expect(component.posSettingsAvailable).toBeFalse();
    expect(switches(el).length).toBe(0);
    expect(el.querySelector('.settings-note')?.textContent).toContain('007_pos_settings.sql');

    component.save();
    const payload = todo.saveSettings.calls.mostRecent().args[0];
    expect('pos_hide_prices' in payload).toBeFalse();
    expect('pos_allow_price_edit' in payload).toBeFalse();
  });

  it('บันทึกไม่สำเร็จ: แสดงข้อความจาก API / ไม่มีข้อความใช้ข้อความกลาง', () => {
    const { component, todo } = open(null);
    todo.saveSettings.and.returnValue(throwError(() => ({ error: { message: 'POS settings are not available yet.' } })));

    component.save();
    expect(component.showpopupnoti).toBeTrue();
    expect(component.popup).toContain('not available yet');

    todo.saveSettings.and.returnValue(throwError(() => ({})));
    component.save();
    expect(component.popup).toBe('Failed to save settings');
    expect(component.isLoading).toBeFalse();
  });
});
