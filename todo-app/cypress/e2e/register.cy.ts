import { RegisterComponent } from '../../src/app/register/register.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('RegisterComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลผู้ใช้ในระบบ (เพื่อให้เช็คอีเมลซ้ำได้)
    todoServiceMock = {
      getTodos: cy.stub().returns(of([])),
      sendOtp: cy.stub().returns(of({ success: true }))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(RegisterComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงข้อความแจ้งเตือนเมื่อรหัสผ่านไม่ตรงตามเงื่อนไข', () => {
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="username"]').type('testuser');
    cy.get('input[name="password"]').type('1234'); // รหัสผ่านง่ายเกินไป
    cy.get('input[name="confirmPassword"]').type('1234');
    
    cy.get('button').contains('สมัครสมาชิก').click();

    cy.contains('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร').should('be.visible');
  });

  it('ควรส่ง OTP และเปลี่ยนหน้าเมื่อกรอกข้อมูลถูกต้อง', () => {
    cy.get('input[name="email"]').type('newuser@example.com');
    cy.get('input[name="username"]').type('newuser');
    cy.get('input[name="password"]').type('Pass@1234'); // ผ่านเงื่อนไข
    cy.get('input[name="confirmPassword"]').type('Pass@1234');

    cy.get('button').contains('สมัครสมาชิก').click();

    // ตรวจสอบว่ามีการเรียก sendOtp และเปลี่ยนหน้าไปที่ /otp
    cy.wrap(todoServiceMock.sendOtp).should('have.been.called');
    cy.get('@navigateSpy').should('have.been.calledWith', ['/otp']);
  });
});