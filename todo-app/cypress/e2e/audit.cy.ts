import { AuditComponent } from '../../src/app/audit/audit.component';
import { TodoService } from '../../src/app/services/todo.service';
import { of } from 'rxjs';

describe('AuditComponent', () => {
  let todoServiceMock: any;

  beforeEach(() => {
    // จำลองการทำงานของ TodoService
    todoServiceMock = {
      getAudit: cy.stub().returns(of([
        { username: 'User1', activity: 'Login', role: 'admin', date: new Date().toISOString() },
        { username: 'User2', activity: 'Logout', role: 'user', date: new Date().toISOString() }
      ]))
    };

    // ตั้งค่าการ Mount Component
    cy.mount(AuditComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock }
      ]
    });
  });

  it('ควรแสดงข้อมูล Audit Logs เริ่มต้น', () => {
    // ตรวจสอบว่าตารางหรือข้อมูลถูกโหลดขึ้นมา
    cy.get('table').should('be.visible');
    cy.contains('User1').should('be.visible');
    cy.contains('User2').should('be.visible');
  });

  it('ควรกรองข้อมูลตามการค้นหาได้', () => {
    // พิมพ์คำค้นหา
    cy.get('input[type="text"]').type('User1');
    
    // ควรจะเจอ User1 แต่ไม่เจอ User2
    cy.contains('User1').should('be.visible');
    cy.contains('User2').should('not.exist');
  });
});