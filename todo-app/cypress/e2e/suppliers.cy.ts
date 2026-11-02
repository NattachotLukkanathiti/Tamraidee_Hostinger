describe('Suppliers Component', () => {
  const mockSuppliers = [
    { id: 1, supplier_name: 'Supplier A', email: 'a@test.com', status: 'Active' },
    { id: 2, supplier_name: 'Supplier B', email: 'b@test.com', status: 'Active' }
  ];

  beforeEach(() => {
    // Mock API
    cy.intercept('GET', '**/suppliers', { statusCode: 200, body: mockSuppliers }).as('getSuppliers');
    cy.intercept('GET', '**/sale-orders', { statusCode: 200, body: [] }).as('getOrders');
    cy.intercept('GET', '**/inventory', { statusCode: 200, body: [] }).as('getInventory');

    cy.visit('/suppliers', {
      onBeforeLoad(win) {
        Object.defineProperty(win.history, 'state', {
          value: { username: 'Admin', email: 'admin@test.com', role: 'Admin' },
          writable: true
        });
      }
    });

    cy.wait(['@getSuppliers', '@getOrders', '@getInventory']);
  });

  it('ควรแสดงรายการ Suppliers และค้นหาได้', () => {
    cy.contains('Supplier A').should('be.visible');
    cy.contains('Supplier B').should('be.visible');

    // ทดสอบการค้นหา
    cy.get('input[placeholder="Search"]').type('Supplier A');
    cy.contains('Supplier A').should('be.visible');
    cy.contains('Supplier B').should('not.exist');
  });

  it('ควรเพิ่ม Supplier ใหม่ได้สำเร็จ', () => {
    cy.intercept('POST', '**/suppliers', { statusCode: 201, body: { success: true } }).as('addSupplier');
    cy.intercept('POST', '**/audit', { statusCode: 200 }).as('logAudit');

    cy.get('button').contains('Add Supplier').click(); // ปรับชื่อปุ่มตามจริง

    cy.get('input[name="supplier_name"]').type('Supplier C');
    cy.get('input[name="email"]').type('c@test.com');
    
    cy.get('button').contains('Save').click();

    cy.wait('@addSupplier');
    cy.wait('@logAudit');
  });

  it('ควรยกเลิก (Cancel) Supplier ได้', () => {
    cy.intercept('PUT', '**/suppliers/1', { statusCode: 200 }).as('updateSupplier');

    // กดปุ่ม Cancel ของ Supplier A
    cy.contains('Supplier A').parent().find('button.cancel-btn').click(); 

    // ยืนยันใน Popup
    cy.contains('Are you sure').should('be.visible');
    cy.get('button').contains('Confirm').click();

    cy.wait('@updateSupplier');
    cy.contains('Supplier A').should('not.exist'); // หรือตรวจสอบว่าสถานะเปลี่ยนไป
  });
});