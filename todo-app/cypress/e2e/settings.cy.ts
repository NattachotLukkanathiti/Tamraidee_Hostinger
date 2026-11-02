describe('Settings Page Component', () => {
  const mockSettings = {
    email: 'store@example.com',
    phone: '0123456789',
    address: '123 Bangkok, Thailand',
    language: 'ไทย',
    time_zone: 'Asia/Bangkok (UTC+7)',
    currency: 'THB',
    date_format: 'DD/MM/YYYY'
  };

  beforeEach(() => {
    // Mock API สำหรับโหลดข้อมูล Settings
    cy.intercept('GET', '**/settings', {
      statusCode: 200,
      body: mockSettings
    }).as('getSettings');

    // เข้าหน้าเว็บและ Mock history.state
    cy.visit('/settings', {
      onBeforeLoad(win) {
        Object.defineProperty(win.history, 'state', {
          value: {
            username: 'AdminUser',
            email: 'admin@example.com',
            role: 'Admin',
            profile: 'avatar.png'
          },
          writable: true
        });
      }
    });

    // รอให้โหลดข้อมูลเสร็จสิ้น
    cy.wait('@getSettings');
  });

  it('ควรโหลดข้อมูล Settings และแสดงผลถูกต้อง', () => {
    // ตรวจสอบว่า Input มีค่าตรงกับที่ Mock ไว้
    cy.get('input[name="email"]').should('have.value', mockSettings.email);
    cy.get('input[name="phone"]').should('have.value', mockSettings.phone);
    cy.get('textarea[name="address"]').should('have.value', mockSettings.address);
  });

  it('ควรบันทึกข้อมูลสำเร็จและส่ง Audit Log', () => {
    // Mock API สำหรับ Save Settings และ Audit Log
    cy.intercept('POST', '**/settings', {
      statusCode: 200,
      body: { success: true }
    }).as('saveSettings');

    cy.intercept('POST', '**/audit', {
      statusCode: 200,
      body: { success: true }
    }).as('logAudit');

    // แก้ไขข้อมูล
    cy.get('input[name="phone"]').clear().type('0987654321');
    
    // กดปุ่มบันทึก
    cy.get('button').contains('Save').click();

    // รอให้ API ทำงาน
    cy.wait('@saveSettings');
    cy.wait('@logAudit');

    // ตรวจสอบ Popup สำเร็จ
    cy.contains('Settings saved successfully').should('be.visible');
  });

  it('ควรแสดง Popup แจ้งเตือนเมื่อบันทึกข้อมูลไม่สำเร็จ', () => {
    // Mock API ให้ส่ง Error กลับมา
    cy.intercept('POST', '**/settings', {
      statusCode: 500,
      body: { message: 'Internal Server Error' }
    }).as('saveSettingsFail');

    cy.get('button').contains('Save').click();

    cy.wait('@saveSettingsFail');

    // ตรวจสอบ Popup แจ้งเตือน Error
    cy.contains('Failed to save settings').should('be.visible');
  });
});