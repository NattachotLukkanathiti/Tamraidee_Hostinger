export interface AuditActor {
  username: string;
  title: string; // อีเมล
  role?: string | null;
  profile?: string | null;
}

// สร้างข้อมูล audit log ของผู้ใช้ ณ เวลาปัจจุบัน (ฝั่ง Backend จะยึดชื่อและ role จาก token อีกชั้น)
export function auditEntry(user: AuditActor, activity: string, now = new Date()) {
  return {
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    time: now.toTimeString().split(' ')[0], // HH:MM:SS
    username: user.username,
    email: user.title,
    activity,
    role: user.role || 'Guest',
    picture: user.profile
  };
}
