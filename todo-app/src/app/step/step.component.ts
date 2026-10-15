
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-step',
  imports: [CommonModule, FormsModule],
  templateUrl: './step.component.html',
  styleUrl: './step.component.css'
})
export class StepComponent implements OnInit, OnDestroy {

  private http = inject(HttpClient);
  private router = inject(Router);

  // URL API บน Render ของคุณ
    private apiUrl = 'https://api.tamraidee.tech';

  // ✏️ เปลี่ยนเป็น Array เก็บเลข 4 ช่อง เพื่อรองรับ HTML แบบ 4 กล่อง
  otpDigits: string[] = ['', '', '', ''];

  userData: { username?: string; title?: string; password?: string } = {};
  errorMessage: string = '';
  isLoading: boolean = false;
  showpopup = false;
  showpopupnoti = false;
  popup = '';
  from: string = '';
  registersuccess = false;
  timeLeft = 5 * 60; // 5 นาที (300 วินาที)
  timer: any;

  openpopup(message:string){
    this.popup = message;
    this.showpopup = true;
  }
  closepopup(){
    this.showpopup = false;
    this.showpopupnoti = false;
    
    if(this.registersuccess === true){
      this.router.navigate(['/login']); 
            this.registersuccess = false;
    }
  }
  openpopupnoti(message:string){
    this.showpopupnoti = true;
    this.popup = message;
  }
  ngOnInit() {
    this.from = history.state?.from || sessionStorage.getItem('otpFrom') || '';

    // 📌 1. ดึงข้อมูลจาก sessionStorage ก่อน (ป้องกันการรีเฟรชหน้าจอแล้วหลุด)
    const savedData = sessionStorage.getItem('tempUserData');

    if (savedData) {
      this.userData = JSON.parse(savedData);
    } else if (history.state?.userData?.title) {
      // ถ้าไม่มีใน sessionStorage แต่มีใน history.state ให้จดลง sessionStorage ทันที
      this.userData = history.state.userData;
      sessionStorage.setItem('tempUserData', JSON.stringify(this.userData));
    }

    if (this.from === 'forget') {
    sessionStorage.setItem('otpFrom', 'forget');
  }
    // 📌 2. ถ้าไม่มีข้อมูลอีเมลจริงๆ ให้เด้งกลับไปหน้าสมัครสมาชิก
    if (!this.userData || !this.userData.title) {
      alert('ไม่พบข้อมูลการสมัครสมาชิก กรุณากรอกข้อมูลใหม่');
      this.router.navigate(['/register']); // 📌 แก้ตาม path หน้าสมัครของคุณ เช่น /register หรือ /signup
      return;
    }

    this.startTimer();
  }

  // ➕ ฟังก์ชันเลื่อนโฟกัสไปกล่องถัดไปอัตโนมัติเมื่อพิมพ์ตัวเลข
  onDigitInput(event: any, index: number, nextInput: HTMLInputElement | null) {
    const val = event.target.value.replace(/[^0-9]/g, '');
    this.otpDigits[index] = val;
    event.target.value = val;

    if (val && nextInput) {
      nextInput.focus();
    }
  }

  // ➕ ฟังก์ชันกด Backspace เพื่อถอยกลับไปลบช่องก่อนหน้า
  onKeyDown(event: KeyboardEvent, index: number, prevInput: HTMLInputElement | null) {
    if (event.key === 'Backspace' && !this.otpDigits[index] && prevInput) {
      prevInput.focus();
    }
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        clearInterval(this.timer);
      }
    }, 1000);
  }

  get timerText() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // 📌 3. ฟังก์ชันกดยืนยัน OTP และส่งข้อมูลไปยัง /todos
  submitRegister() {
     this.isLoading = true; // เริ่มแสดง Loading
    // นำเลข 4 ช่องมารวมกันเป็น String ชุดเดียว
    
    const fullOtp = this.otpDigits.join('');

    if (!fullOtp || fullOtp.length !== 4) {
       this.isLoading = false; // เริ่มแสดง Loading
      this.errorMessage = 'กรุณากรอกรหัส OTP ให้ครบ 4 หลัก';
          this.openpopupnoti(this.errorMessage)
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      username: this.userData.username,
      title: this.userData.title,
      password: this.userData.password,
      otp: fullOtp,
            isReset: this.from === 'forget'
    };

    // ยิงไปยัง /todos บน Backend เพื่อตรวจสอบ OTP และบันทึกข้อมูล
    this.http.post<any>(`${this.apiUrl}/todos`, payload).subscribe({
      next: (res) => {
        this.isLoading = false;
         if (this.from === 'forget') {

        this.router.navigate(['/reset'], {
          state: {
            userData: this.userData
          }
        });

        return;
      }

        // 🧹 ลบข้อมูลชั่วคราวออกเมื่อสมัครสมาชิกสำเร็จ
        // 🧹 ลบข้อมูลชั่วคราวออกเมื่อสมัครสมาชิกสำเร็จ
sessionStorage.removeItem('tempUserData');
sessionStorage.removeItem('otpFrom'); // 📌 เพิ่มบรรทัดนี้
        this.openpopup("Your register Completed")
           this.registersuccess = true;
        // ย้ายไปหน้า Login
      },
      error: (err) => {
        this.isLoading = false;
        // แสดงข้อความแจ้งเตือน Error จาก Backend
        this.errorMessage = err.error?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
        this.openpopupnoti(this.errorMessage);
      }
    });
  }

  // 📌 4. ฟังก์ชันขอรหัส OTP ใหม่
  resendOtp() {
    this.isLoading = true; // เริ่มแสดง Loading
    if (this.timeLeft > 295) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<any>(`${this.apiUrl}/api/request-otp`, { title: this.userData.title }).subscribe({
      next: (res) => {
        this.isLoading = false; // เริ่มแสดง Loading
        this.openpopup("OTP sent to your email")
        this.otpDigits = ['', '', '', '']; // ล้างช่องเก่า
        this.timeLeft = 5 * 60; // รีเซ็ตเวลาเป็น 5 นาที
        this.startTimer();
      },
      error: (err) => {
        this.isLoading = false;
        this.openpopupnoti("OTP has Incorrect")
      }
    });
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}