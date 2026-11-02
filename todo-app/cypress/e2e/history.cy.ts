import { HistoryComponent } from '../../src/app/history/history.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('HistoryComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลประวัติ
    todoServiceMock = {
      getTodoss: cy.stub().returns(of([])),
      getHistory: cy.stub().returns(of([
        { sku: 'SKU001', product_name: 'Product A', created_by: 'User1', status: 'Approved' },
        { sku: 'SKU002', product_name: 'Product B', created_by: 'User2', status: 'Pending' }
      ]))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(HistoryComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงข้อมูลประวัติเริ่มต้นได้ถูกต้อง', () => {
    cy.contains('Product A').should('be.visible');
    cy.contains('Product B').should('be.visible');
  });

  it('ควรกรองข้อมูลเมื่อพิมพ์ค้นหา', () => {
    // พิมพ์คำว่า SKU001 ในช่องค้นหา
    cy.get('input[type="text"]').type('SKU001');

    // ควรจะเจอ Product A แต่ไม่เจอ Product B
    cy.contains('Product A').should('be.visible');
    cy.contains('Product B').should('not.exist');
  });
});