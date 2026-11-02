import { PosComponent } from '../../src/app/pos/pos.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('PosComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลสินค้าในคลัง
    todoServiceMock = {
      getInventory: cy.stub().returns(of([
        { sku: 'P001', product_name: 'Coffee', category: 'Drinks', quantity: 50, price: 45, picture: '' }
      ])),
      getSettings: cy.stub().returns(of({ phone: '0800000000' })),
      getNotifications: cy.stub().returns(of([])),
      getNotificationStatus: cy.stub().returns(of([]))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(PosComponent, {
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงรายการสินค้าและเพิ่มลงตะกร้าได้', () => {
    // ตรวจสอบว่าสินค้าแสดงผล
    cy.contains('Coffee').should('be.visible');

    // คลิกที่สินค้าเพื่อเพิ่มลงตะกร้า
    cy.get('.product-card').first().click();

    // ตรวจสอบว่าสินค้าถูกเพิ่มในตะกร้าและคำนวณราคาถูกต้อง
    cy.contains('Cart (1)').should('be.visible');
    cy.contains('45').should('be.visible');
  });
});