import { setUpPage } from '../../testing/page-test-utils';
import { HelppComponent } from './helpp.component';

describe('HelppComponent', () => {
  it('สร้างหน้าได้ โดยใช้ Supabase client จากค่าตั้งค่ากลาง', () => {
    const { component } = setUpPage(HelppComponent);

    expect(component).toBeTruthy();
  });
});
