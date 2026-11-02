import { NotificationComponent } from '../../src/app/notification/notification.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('NotificationComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลแจ้งเตือนที่ยังไม่ได้อ่าน
    todoServiceMock = {
      getNotifications: cy.stub().returns(of([
        { id: 1, title: 'Stock Alert', message: 'Product A is low', is_read: false }
      ])),
      getNotificationStatus: cy.stub().returns(of([])),
      markNotificationAsRead: cy.stub().returns(of({ success: true })),
      getHistory: cy.stub().returns(of([])),
      getInventory: cy.stub().returns(of([]))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(NotificationComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงรายการแจ้งเตือนและทำเครื่องหมายว่าอ่านแล้วเมื่อคลิก', () => {
    // ตรวจสอบว่ามีรายการแจ้งเตือนแสดงอยู่
    cy.contains('Stock Alert').should('be.visible');

    // คลิกที่รายการแจ้งเตือน
    cy.get('.notification-item').first().click();

    // ตรวจสอบว่าฟังก์ชัน markNotificationAsRead ถูกเรียกใช้งาน
    cy.wrap(todoServiceMock.markNotificationAsRead).should('have.been.calledWith', 1);
  });
});