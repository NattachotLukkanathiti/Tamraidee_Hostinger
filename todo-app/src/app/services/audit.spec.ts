import { auditEntry } from './audit';

describe('auditEntry', () => {
  const now = new Date(2026, 10, 1, 8, 5, 9);

  it('สร้างข้อมูล audit ของผู้ใช้พร้อมวันที่และเวลา', () => {
    const entry = auditEntry(
      { username: 'admin1', title: 'admin@test.com', role: 'admin', profile: 'me.png' },
      'Login',
      now
    );

    expect(entry.username).toBe('admin1');
    expect(entry.email).toBe('admin@test.com');
    expect(entry.activity).toBe('Login');
    expect(entry.role).toBe('admin');
    expect(entry.picture).toBe('me.png');
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.time).toBe('08:05:09');
  });

  it('ผู้ใช้ที่ยังไม่มี role บันทึกเป็น Guest', () => {
    expect(auditEntry({ username: 'u', title: 'u@test.com', role: null }, 'Login', now).role).toBe('Guest');
    expect(auditEntry({ username: 'u', title: 'u@test.com' }, 'Login', now).role).toBe('Guest');
  });

  it('ไม่ส่งเวลามา ใช้เวลาปัจจุบัน', () => {
    const entry = auditEntry({ username: 'u', title: 'u@test.com' }, 'Logout');

    expect(entry.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
