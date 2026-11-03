import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

export const API_BASE = environment.apiBase;

export interface SessionUser {
  id: number;
  username: string;
  title: string; // อีเมล
  role?: string | null;
  status?: string | null;
  profile?: string | null;
  [key: string]: any;
}

const STORAGE_KEY = 'auth_session';

// เก็บ JWT และข้อมูลผู้ใช้ที่ login อยู่ (แทนการพึ่ง history.state อย่างเดียว ทำให้รีเฟรชหน้าแล้วไม่หลุด)
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  // localStorage อาจใช้ไม่ได้ (เช่น private mode) จึงครอบ try/catch ไว้ที่เดียว
  private storage<T>(action: (store: Storage) => T, fallback: T): T {
    if (!this.isBrowser) return fallback;
    try {
      return action(localStorage);
    } catch {
      return fallback; // ใช้งานได้แค่ใน session นี้ผ่าน history.state
    }
  }

  // socialProvider: ระบุเมื่อเข้าระบบด้วย Social Login (หน้า History ใช้ตัดสินว่าต้อง re-authenticate ด้วยวิธีไหน)
  setSession(token: string, user: SessionUser, socialProvider?: string) {
    this.storage((store) => {
      store.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
      if (socialProvider) {
        store.setItem('isSocialLogin', 'true');
        store.setItem('socialProvider', socialProvider);
      }
    }, undefined);
  }

  clearSession() {
    this.storage((store) => {
      store.removeItem(STORAGE_KEY);
      store.removeItem('isSocialLogin');
      store.removeItem('socialProvider');
    }, undefined);
  }

  private read(): { token: string; user: SessionUser } | null {
    return this.storage((store) => {
      const raw = store.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    }, null);
  }

  get token(): string | null {
    return this.read()?.token ?? null;
  }

  get user(): SessionUser | null {
    return this.read()?.user ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  // ข้อมูลที่หน้าต่าง ๆ อ่านจาก history.state (รูปแบบเดียวกับที่หน้า Login ส่งไป)
  navigationState(): Record<string, any> {
    const user = this.user;
    if (!user) return {};
    return {
      id: user.id,
      username: user.username,
      email: user.title,
      profile: user.profile,
      role: user.role,
      status: user.status,
      dob: user['dob'],
      national_id: user['national_id'],
      address: user['address'],
      emergency_contact: user['emergency_contact']
    };
  }
}

// ตำแหน่งที่เข้าระบบหลังร้านได้ (คนอื่นที่ login อยู่ใช้ได้เฉพาะหน้าร้าน /shop)
export const BACK_OFFICE_ROLES = ['admin', 'manager', 'pos', 'backend'];

export function canUseBackOffice(role?: string | null): boolean {
  return BACK_OFFICE_ROLES.includes((role || '').toLowerCase());
}

// หน้าแรกของแต่ละ role (ตรงกับ logic เดิมในหน้า Login)
export function homeRouteFor(role?: string | null): string {
  switch ((role || '').toLowerCase()) {
    case '': return '/confirmemployee';
    case 'pos': return '/pos';
    case 'backend': return '/inventory';
    case 'admin':
    case 'manager': return '/dashboard';
    default: return '/shop'; // ไม่ใช่พนักงาน = เข้าได้เฉพาะหน้าร้าน
  }
}
