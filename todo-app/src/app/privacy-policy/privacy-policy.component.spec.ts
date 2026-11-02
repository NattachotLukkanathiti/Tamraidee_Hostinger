import { TestBed } from '@angular/core/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';

describe('PrivacyPolicyComponent', () => {
  it('แสดงหัวข้อนโยบายความเป็นส่วนตัว', () => {
    const fixture = TestBed.createComponent(PrivacyPolicyComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.header')?.textContent).toContain('Privacy Policy');
  });
});
