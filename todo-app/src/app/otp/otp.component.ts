import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../environments/environment';

export const OTP_LENGTH = 6;
const OTP_LIFETIME_SECONDS = 5 * 60;
// ขอรหัสใหม่ได้เมื่อผ่านไปแล้ว 5 วินาทีหลังขอครั้งล่าสุด
const RESEND_COOLDOWN_SECONDS = 5;

interface PendingUser {
  username?: string;
  title?: string;
  password?: string;
}

// หน้ากรอก OTP ใช้ร่วมกัน 2 โหมด: สมัครสมาชิก (/otp) และลืมรหัสผ่าน (/step ตั้ง route data { mode: 'forget' })
@Component({
  selector: 'app-otp',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp.component.html',
  styleUrl: './otp.component.css'
})
export class OtpComponent implements OnInit, OnDestroy {

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiBase;

  readonly isReset = inject(ActivatedRoute, { optional: true })?.snapshot.data['mode'] === 'forget';

  otpDigits: string[] = new Array(OTP_LENGTH).fill('');

  userData: PendingUser = {};
  errorMessage = '';
  isLoading = false;
  showpopup = false;
  showpopupnoti = false;
  popup = '';
  registersuccess = false;
  timeLeft = OTP_LIFETIME_SECONDS;
  timer: ReturnType<typeof setInterval> | undefined;

  get title(): string {
    return this.isReset ? '2 Step Verification' : 'Email OTP Verification';
  }

  get submitLabel(): string {
    return this.isReset ? 'Submit' : 'Verify & Proceed';
  }

  get timerText(): string {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  get canResend(): boolean {
    return this.timeLeft <= OTP_LIFETIME_SECONDS - RESEND_COOLDOWN_SECONDS;
  }

  openpopup(message: string) {
    this.popup = message;
    this.showpopup = true;
  }

  closepopup() {
    this.showpopup = false;
    this.showpopupnoti = false;

    if (this.registersuccess) {
      void this.router.navigate(['/login']);
      this.registersuccess = false;
    }
  }

  openpopupnoti(message: string) {
    this.showpopupnoti = true;
    this.popup = message;
  }

  ngOnInit() {
    // ดึงข้อมูลจาก sessionStorage ก่อน (กันรีเฟรชหน้าแล้วข้อมูลหาย) ไม่มีค่อยใช้ history.state
    const savedData = sessionStorage.getItem('tempUserData');

    if (savedData) {
      this.userData = JSON.parse(savedData);
    } else if (history.state?.userData?.title) {
      this.userData = history.state.userData;
      sessionStorage.setItem('tempUserData', JSON.stringify(this.userData));
    }

    // ไม่มีอีเมลให้ยืนยัน -> กลับไปเริ่มใหม่ที่หน้าสมัครสมาชิก
    if (!this.userData?.title) {
      alert('ไม่พบข้อมูลการสมัครสมาชิก กรุณากรอกข้อมูลใหม่');
      void this.router.navigate(['/register']);
      return;
    }

    this.startTimer();
  }

  // รับเฉพาะตัวเลข แล้วเลื่อนโฟกัสไปกล่องถัดไป
  onDigitInput(event: Event, index: number, nextInput: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replaceAll(/\D/g, '');
    this.otpDigits[index] = value;
    input.value = value;

    if (value && nextInput) {
      nextInput.focus();
    }
  }

  // กด Backspace ในกล่องที่ว่าง -> ถอยไปกล่องก่อนหน้า
  onKeyDown(event: KeyboardEvent, index: number, prevInput: HTMLInputElement | null) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && prevInput) {
      prevInput.focus();
    }
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  // กดยืนยัน OTP: ส่งไป /todos เพื่อตรวจ OTP แล้วสมัครสมาชิก (หรือขอ reset token ถ้าเป็นโหมดลืมรหัสผ่าน)
  submitRegister() {
    const fullOtp = this.otpDigits.join('');

    if (fullOtp.length !== OTP_LENGTH) {
      this.errorMessage = `กรุณากรอกรหัส OTP ให้ครบ ${OTP_LENGTH} หลัก`;
      this.openpopupnoti(this.errorMessage);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      username: this.userData.username,
      title: this.userData.title,
      password: this.userData.password,
      otp: fullOtp,
      isReset: this.isReset
    };

    this.http.post<{ resetToken?: string }>(`${this.apiUrl}/todos`, payload).subscribe({
      next: (res) => this.onVerified(res),
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        this.openpopupnoti(this.errorMessage);
      }
    });
  }

  private onVerified(res: { resetToken?: string }) {
    this.isLoading = false;
    // ลบข้อมูลชั่วคราว (อีเมล/รหัสผ่านที่รอสมัคร) ออกจาก sessionStorage
    sessionStorage.removeItem('tempUserData');

    if (this.isReset) {
      void this.router.navigate(['/reset'], {
        state: { userData: { title: this.userData.title }, resetToken: res.resetToken }
      });
      return;
    }

    this.openpopup('Your register Completed');
    this.registersuccess = true;
  }

  // ขอรหัส OTP ใหม่
  resendOtp() {
    if (!this.canResend) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post(`${this.apiUrl}/api/request-otp`, { title: this.userData.title }).subscribe({
      next: () => {
        this.isLoading = false;
        this.openpopup('OTP sent to your email');
        this.otpDigits = new Array(OTP_LENGTH).fill('');
        this.timeLeft = OTP_LIFETIME_SECONDS;
        this.startTimer();
      },
      error: () => {
        this.isLoading = false;
        this.openpopupnoti('OTP has Incorrect');
      }
    });
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
