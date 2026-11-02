import { Injectable, InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  UserCredential,
  reauthenticateWithPopup,
  signInWithPopup
} from 'firebase/auth';
import { AuthService, homeRouteFor } from './auth.service';
import { auditEntry } from './audit';
import { firebaseAuth } from './firebase';
import { TodoService } from './todo.service';

export type SocialProvider = 'google' | 'facebook' | 'github';

type PopupSignIn = (provider: AuthProvider) => Promise<UserCredential>;

// แยกการเปิด popup ของ Firebase ออกมาเป็น token เพื่อให้ test แทนที่ได้
export const FIREBASE_POPUP_SIGN_IN = new InjectionToken<PopupSignIn>('FIREBASE_POPUP_SIGN_IN', {
  providedIn: 'root',
  factory: () => (provider) => signInWithPopup(firebaseAuth, provider)
});

type ReauthPopup = (provider: AuthProvider) => Promise<UserCredential | null>;

// ยืนยันตัวตนซ้ำด้วยบัญชี social ที่ login อยู่ (คืน null ถ้าไม่มีผู้ใช้ Firebase ค้างอยู่) ใช้ก่อนทำรายการสำคัญ
export const FIREBASE_REAUTH_POPUP = new InjectionToken<ReauthPopup>('FIREBASE_REAUTH_POPUP', {
  providedIn: 'root',
  factory: () => (provider) => {
    const user = firebaseAuth.currentUser;
    return user ? reauthenticateWithPopup(user, provider) : Promise.resolve(null);
  }
});

const PROVIDERS: Record<SocialProvider, () => AuthProvider> = {
  google: () => new GoogleAuthProvider(),
  facebook: () => new FacebookAuthProvider(),
  github: () => new OAuthProvider('github.com')
};

// Social Login ที่ใช้ร่วมกันในหน้า Login และ Register:
// เปิด popup -> ส่ง Firebase ID token ให้ Backend ตรวจ -> เก็บ session -> บันทึก audit -> ไปหน้าตาม role
@Injectable({
  providedIn: 'root'
})
export class SocialLoginService {
  private readonly todoService = inject(TodoService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly popupSignIn = inject(FIREBASE_POPUP_SIGN_IN);

  async signIn(kind: SocialProvider): Promise<void> {
    const credential = await this.popupSignIn(PROVIDERS[kind]());
    const idToken = await credential.user.getIdToken();

    const res = await firstValueFrom(this.todoService.socialLogin(idToken));
    this.authService.setSession(res.token, res.user, kind);

    this.todoService.logAudit(auditEntry(res.user, 'Social Login')).subscribe({
      error: (err) => console.error('Failed to save audit log', err)
    });

    const { username, title: email, profile, role } = res.user;
    await this.router.navigate([homeRouteFor(role)], {
      state: { username, email, profile, role, stan: true }
    });
  }
}
