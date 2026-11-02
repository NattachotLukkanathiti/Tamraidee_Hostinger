import { ProfileComponent } from '../../src/app/profile/profile.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

describe('ProfileComponent', () => {
  let routerMock: any;
  let locationMock: any;

  beforeEach(() => {
    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    locationMock = {
      back: cy.spy().as('backSpy')
    };

    // จำลองข้อมูลผู้ใช้ใน history.state
    Object.defineProperty(window, 'history', {
      value: {
        state: { 
          username: 'TestUser', 
          email: 'test@example.com',
          dob: '1990-01-01'
        }
      },
      writable: true
    });

    cy.mount(ProfileComponent, {
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: Location, useValue: locationMock }
      ]
    });
  });

  it('ควรแสดงข้อมูลส่วนตัวของผู้ใช้ได้ถูกต้อง', () => {
    cy.contains('TestUser').should('be.visible');
    cy.contains('test@example.com').should('be.visible');
    cy.contains('1990-01-01').should('be.visible');
  });

  it('ควรเปลี่ยนหน้าไปที่ /edit เมื่อกดปุ่มแก้ไข', () => {
    // สมมติว่ามีปุ่มแก้ไขที่มีข้อความว่า "Edit" หรือ class .btn-edit
    cy.get('button').contains('Edit').click();

    // ตรวจสอบว่า router.navigate ถูกเรียกไปที่ /edit
    cy.get('@navigateSpy').should('have.been.calledWith', ['/edit']);
  });
});