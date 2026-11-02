import { EmployeeComponent } from '../../src/app/employee/employee.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('EmployeeComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลพนักงาน
    todoServiceMock = {
      getTodoss: cy.stub().returns(of([
        { id: 1, username: 'EmpUser1', role: 'pos' },
        { id: 2, username: 'EmpUser2', role: 'admin' }
      ])),
      deleteEmployee: cy.stub().returns(of({ success: true })),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(EmployeeComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงรายชื่อพนักงานเริ่มต้นได้ถูกต้อง', () => {
    cy.contains('EmpUser1').should('be.visible');
    cy.contains('EmpUser2').should('be.visible');
  });

  it('ควรเปิด Popup ยืนยันการลบเมื่อกดปุ่มลบ', () => {
    // เรียกใช้ฟังก์ชัน deleteAccount โดยตรง หรือกดปุ่มที่มีการเรียกใช้
    // สมมติว่ามีปุ่มลบที่มี class .btn-delete
    cy.get('.btn-delete').first().click();

    // ตรวจสอบว่า Popup แสดงขึ้นมา
    cy.contains('Are you sure you want to delete').should('be.visible');
  });
});