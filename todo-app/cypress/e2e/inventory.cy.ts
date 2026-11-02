import { InventoryComponent } from '../../src/app/inventory/inventory.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('InventoryComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลสินค้า
    todoServiceMock = {
      getInventory: cy.stub().returns(of([
        { sku: 'SKU-001', product_name: 'Product A', category: 'Electronics', quantity: 10 },
        { sku: 'SKU-002', product_name: 'Product B', category: 'Office', quantity: 5 }
      ])),
      getSuppliers: cy.stub().returns(of([])),
      deleteInventory: cy.stub().returns(of({ success: true })),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(InventoryComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงรายการสินค้าเริ่มต้นได้ถูกต้อง', () => {
    cy.contains('Product A').should('be.visible');
    cy.contains('Product B').should('be.visible');
  });

  it('ควรลบสินค้าได้เมื่อกดยืนยัน', () => {
    // กดปุ่มลบของรายการแรก
    cy.get('.btn-delete').first().click();

    // ตรวจสอบว่า Popup ยืนยันแสดงขึ้นมา
    cy.contains('Are you sure you want to delete').should('be.visible');

    // กดปุ่มยืนยันการลบ
    cy.get('button').contains('Confirm').click();

    // ตรวจสอบว่าฟังก์ชัน deleteInventory ถูกเรียกใช้งาน
    cy.wrap(todoServiceMock.deleteInventory).should('have.been.calledWith', 'SKU-001');
  });
});