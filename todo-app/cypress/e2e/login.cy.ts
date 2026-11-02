import { LoginComponent } from '../../src/app/login/login.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองการทำงานของ Service
    todoServiceMock = {
      login: cy.stub(),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(LoginComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงข้อความแจ้งเตือนเมื่อล็อกอินไม่สำเร็จ', () => {
    // จำลองให้ Service คืนค่า Error
    todoServiceMock.login.returns(throwError(() => new Error('Login Failed')));

    // กรอกข้อมูลและกดปุ่ม
    cy.get('input[name="username"]').type('wronguser');
    cy.get('input[name="password"]').type('wrongpass');
    cy.get('button[type="submit"]').click();

    // ตรวจสอบว่า Popup แจ้งเตือนแสดงขึ้นมา
    cy.contains('Username or password incorrect').should('be.visible');
  });

  it('ควรเปลี่ยนหน้าไปที่ Dashboard เมื่อล็อกอินสำเร็จด้วยสิทธิ์ Admin', () => {
    // จำลองให้ Service คืนค่า Success
    todoServiceMock.login.returns(of({
      user: { id: 1, username: 'admin', title: 'admin@test.com', role: 'admin' }
    }));

    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('123456');
    cy.get('button[type="submit"]').click();

    // ตรวจสอบว่า Router.navigate ถูกเรียกไปที่ /dashboard
    cy.get('@navigateSpy').should('have.been.calledWith', ['/dashboard']);
  });
});