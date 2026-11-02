import { NavbarComponent } from '../../src/app/navbar/navbar.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('NavbarComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลแจ้งเตือน
    todoServiceMock = {
      getTodoss: cy.stub().returns(of([])),
      getNotifications: cy.stub().returns(of([
        { id: 1, title: 'Stock Update', message: 'Product A added' }
      ])),
      getNotificationStatus: cy.stub().returns(of([])),
      getChatHistory: cy.stub().returns(of([])),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(NavbarComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงจุดแจ้งเตือนเมื่อมีข้อความใหม่', () => {
    // ตรวจสอบว่ามีจุดแจ้งเตือน (Badge) แสดงขึ้นมา
    cy.get('.notification-badge').should('be.visible');
  });

  it('ควรออกจากระบบและเปลี่ยนหน้าไปที่ / เมื่อกด Logout', () => {
    // กดปุ่มเปิดเมนูโปรไฟล์
    cy.get('.profile-menu-btn').click();
    
    // กดปุ่ม Logout
    cy.get('button').contains('Logout').click();

    // ตรวจสอบว่า Router.navigate ถูกเรียกไปที่ /
    cy.get('@navigateSpy').should('have.been.calledWith', ['/']);
  });
});