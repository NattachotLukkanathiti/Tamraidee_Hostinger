import { EditComponent } from '../../src/app/edit/edit.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { of } from 'rxjs';

describe('EditComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;
  let locationMock: any;

  beforeEach(() => {
    // จำลองข้อมูลผู้ใช้
    todoServiceMock = {
      getTodos: cy.stub().returns(of([{ id: 1, username: 'TestUser' }])),
      updateProfile: cy.stub().returns(of({ success: true })),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    locationMock = {
      back: cy.spy().as('backSpy')
    };

    // จำลอง history.state
    Object.defineProperty(window, 'history', {
      value: {
        state: { username: 'TestUser', email: 'test@example.com' }
      },
      writable: true
    });

    cy.mount(EditComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: Location, useValue: locationMock }
      ]
    });
  });

  it('ควรโหลดข้อมูลผู้ใช้และแสดงผลได้ถูกต้อง', () => {
    cy.contains('TestUser').should('be.visible');
  });

  it('ควรเรียกใช้ updateProfile เมื่อกดปุ่มบันทึก', () => {
    // สมมติว่ามีปุ่มบันทึกที่มีข้อความว่า "บันทึก" หรือ class .btn-save
    cy.get('button').contains('บันทึก').click();

    // ตรวจสอบว่า updateProfile ถูกเรียก
    cy.wrap(todoServiceMock.updateProfile).should('have.been.called');
  });

  it('ควรย้อนกลับเมื่อกดปุ่มยกเลิก', () => {
    // สมมติว่ามีปุ่มยกเลิก
    cy.get('button').contains('ยกเลิก').click();
    
    cy.get('@backSpy').should('have.been.called');
  });
});