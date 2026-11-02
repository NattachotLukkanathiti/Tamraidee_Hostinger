describe('Reset Password Component', () => {
  const mockEmail = 'test@example.com';

  beforeEach(() => {
    // 1. เข้าหน้าเว็บตามปกติก่อน
    cy.visit('/reset');

    // 2. ใช้ cy.window() เพื่อจำลอง history.state
    cy.window().then((win) => {
      Object.defineProperty(win, 'history', {
        value: {
          ...win.history,
          state: {
            userData: { title: mockEmail }
          }
        },
        writable: true
      });
    });

    // 3. สั่ง reload หรือ trigger ให้ component อ่านค่า state (ถ้าจำเป็น)
    // หรือหากโค้ดของคุณอ่านค่าใน ngOnInit ทันที อาจต้องใช้การ visit แบบนี้แทน:
  });

  // ... โค้ดทดสอบอื่นๆ
});