import { OtpComponent } from '../../src/app/otp/otp.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('OtpComponent', () => {
  let routerMock: any;

  beforeEach(() => {
    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    // จำลองข้อมูลใน sessionStorage
    sessionStorage.setItem('tempUserData', JSON.stringify({
      username: 'testuser',
      title: 'test@example.com',
      password: 'password123'
    }));

    cy.mount(OtpComponent, {
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('ควรแสดงข้อความแจ้งเตือนเมื่อกรอก OTP ไม่ครบ 6 หลัก', () => {
    cy.get('button').contains('Verify').click(); // ปรับข้อความปุ่มตามจริง
    cy.contains('กรุณากรอกรหัส OTP ให้ครบ 6 หลัก').should('be.visible');
  });

  it('ควรส่งข้อมูลเมื่อกรอก OTP ครบและกดปุ่มยืนยัน', () => {
    // จำลองการกรอก OTP 123456
    cy.get('input').eq(0).type('1');
    cy.get('input').eq(1).type('2');
    cy.get('input').eq(2).type('3');
    cy.get('input').eq(3).type('4');
    cy.get('input').eq(4).type('5');
    cy.get('input').eq(5).type('6');

    // ดักจับ Request
    cy.intercept('POST', '**/todos', { body: { success: true } }).as('submitOtp');

    cy.get('button').contains('Verify').click();

    cy.wait('@submitOtp').then((interception) => {
      // ตรวจสอบว่า OTP ที่ส่งไปคือ 123456
      expect(interception.request.body.otp).to.equal('123456');
    });
  });
});