import { ForgotComponent } from '../../src/app/forgot/forgot.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('ForgotComponent', () => {
  let routerMock: any;

  beforeEach(() => {
    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(ForgotComponent, {
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงข้อความแจ้งเตือนเมื่อไม่ได้กรอกอีเมล', () => {
    cy.get('button').contains('ส่ง').click(); // ปรับข้อความปุ่มตามจริง
    cy.contains('กรุณากรอกอีเมล').should('be.visible');
  });

  it('ควรส่ง OTP และเปลี่ยนหน้าเมื่อพบอีเมลในระบบ', () => {
    // จำลองการกรอกอีเมล
    cy.get('input').type('test@example.com');

    // ดักจับ Request และจำลองการตอบกลับว่า "พบอีเมล"
    cy.intercept('POST', '**/api/check-email', { body: { exists: true } }).as('checkEmail');
    cy.intercept('POST', '**/api/request-otp', { body: { success: true } }).as('requestOtp');

    cy.get('button').contains('ส่ง').click();

    // รอให้ Request ทำงานเสร็จสิ้น
    cy.wait('@checkEmail');
    cy.wait('@requestOtp');

    // ตรวจสอบว่ามีการเปลี่ยนหน้าไปที่ /step
    cy.get('@navigateSpy').should('have.been.calledWith', ['/step']);
  });
});