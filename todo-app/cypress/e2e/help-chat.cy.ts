import { HelppComponent } from '../../src/app/helpp/helpp.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('HelppComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลประวัติแชท
    todoServiceMock = {
      getTodoss: cy.stub().returns(of([])),
      getChatHistory: cy.stub().returns(of([
        { id: 1, sender: 'Admin', message: 'สวัสดีครับ มีอะไรให้ช่วยไหมครับ?', created_at: new Date().toISOString() }
      ])),
      sendChatMessage: cy.stub().returns(of({ data: { id: 2 } })),
      markChatAsRead: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(HelppComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงประวัติการแชทเริ่มต้นได้ถูกต้อง', () => {
    // เปิดหน้าต่างแชท (ถ้ามีปุ่มเปิด)
    cy.get('.chat-toggle-btn').click(); 
    
    cy.contains('สวัสดีครับ มีอะไรให้ช่วยไหมครับ?').should('be.visible');
  });

  it('ควรส่งข้อความใหม่ได้', () => {
    cy.get('.chat-toggle-btn').click();

    // พิมพ์ข้อความและกดส่ง
    cy.get('input[type="text"]').type('ต้องการสอบถามเรื่องสินค้าครับ');
    cy.get('button.send-btn').click();

    // ตรวจสอบว่าฟังก์ชันส่งข้อความถูกเรียก
    cy.wrap(todoServiceMock.sendChatMessage).should('have.been.called');
  });
});