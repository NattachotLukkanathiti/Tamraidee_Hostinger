import { ConfirmemployeeComponent } from '../../src/app/confirmemployee/confirmemployee.component';
import { Router } from '@angular/router';

describe('ConfirmemployeeComponent', () => {
  let routerMock: any;

  beforeEach(() => {
    routerMock = {
      navigate: cy.spy().as('navigateSpy')
    };

    cy.mount(ConfirmemployeeComponent, {
      providers: [
        { provide: Router, useValue: routerMock }
      ]
    });
  });

  it('ควรเปลี่ยนหน้าไปที่ /login เมื่อเรียกใช้ backtologin', () => {
    cy.get('button').click();
    cy.get('@navigateSpy').should('have.been.calledWith', ['/login']);
  });
});