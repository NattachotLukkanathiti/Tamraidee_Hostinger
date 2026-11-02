import '@angular/compiler'; // แก้ปัญหา JIT Compiler
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../../src/app/dashboard/dashboard.component';
import { TodoService } from '../../src/app/services/todo.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';

describe('DashboardComponent', () => {
  let todoServiceMock: any;
  let routerMock: any;

  beforeEach(() => {
    // จำลองข้อมูลสำหรับ Service ต่างๆ
    todoServiceMock = {
      getSummary: cy.stub().returns(of([{ todays_sale: 1000, yearly_total_sales: 50000, net_income: 20000, products: 150 }])),
      getSaleOrders: cy.stub().returns(of([])),
      getTodoss: cy.stub().returns(of([])),
      getMonth: cy.stub().returns(of([])),
      getInventory: cy.stub().returns(of([])),
      logAudit: cy.stub().returns(of({}))
    };

    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    // Mount Component
    cy.mount(DashboardComponent, {
      imports: [CommonModule], // เพิ่ม CommonModule เพื่อให้ *ngIf, *ngFor ทำงานได้
      providers: [
        { provide: TodoService, useValue: todoServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรแสดงข้อมูล Summary เริ่มต้นได้ถูกต้อง', () => {
    // ตรวจสอบว่าข้อมูลที่ Mock ไว้แสดงผลบนหน้าจอ
    cy.contains('1,000').should('be.visible'); 
    cy.contains('50,000').should('be.visible');
  });

  it('ควรเปลี่ยนหน้าไปที่ Inventory เมื่อกดปุ่ม', () => {
    // สมมติว่ามีปุ่มที่เรียกใช้ฟังก์ชัน Animationa_out()
    cy.get('button.inventory-btn').click();
    
    // รอให้ setTimeout ทำงาน (ในโค้ดตั้งไว้ 300ms)
    cy.wait(350);
    
    cy.get('@navigateSpy').should('have.been.calledWith', ['/inventory']);
  });
});