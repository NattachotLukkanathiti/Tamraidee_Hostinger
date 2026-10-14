import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-forgot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot.component.html',
  styleUrl: './forgot.component.css'
})
export class ForgotComponent {

  private http = inject(HttpClient);
  private router = inject(Router);

  private apiUrl = 'https://api.tamraidee.tech';

  title: string = '';
  isLoading: boolean = false;

  showpopup = false;
  showpopupnoti = false;
  popup = '';

  openpopup(message: string) {
    this.popup = message;
    this.showpopup = true;
  }

  closepopup() {
    this.showpopup = false;
    this.showpopupnoti = false;
  }

  openpopupnoti(message: string) {
    this.showpopupnoti = true;
    this.popup = message;
  }

  onSubmit() {

    if (!this.title.trim()) {
      this.openpopupnoti('กรุณากรอกอีเมล');
      return;
    }

    this.isLoading = true;

    // ตรวจสอบ Email ก่อน
    this.http.post<any>(
      `${this.apiUrl}/api/check-email`,
      {
        title: this.title
      }
    ).subscribe({

      next: (checkRes) => {

        if (checkRes.exists) {

          // มี Email → ส่ง OTP
          this.sendOtp();

        } else {

          this.isLoading = false;

          this.openpopupnoti(
            'ไม่พบอีเมลนี้ในระบบ'
          );
        }
      },

      error: (err) => {

        this.isLoading = false;

        this.openpopupnoti(
          err.error?.message ||
          'เกิดข้อผิดพลาดในการตรวจสอบอีเมล'
        );
      }

    });
  }


  sendOtp() {

    this.http.post<any>(
      `${this.apiUrl}/api/request-otp`,
      {
        title: this.title
      }
    ).subscribe({

      next: (res) => {

        this.isLoading = false;

        // เก็บ Email
        sessionStorage.setItem(
          'tempUserData',
          JSON.stringify({
            title: this.title
          })
        );

        // จำว่า OTP มาจาก Forgot
        sessionStorage.setItem(
          'otpFrom',
          'forget'
        );

        // ไปหน้า OTP
        this.router.navigate(['/step'], {
          state: {
            from: 'forget',
            userData: {
              title: this.title
            }
          }
        });

      },

      error: (err) => {

        this.isLoading = false;

        this.openpopupnoti(
          err.error?.message ||
          'เกิดข้อผิดพลาดในการส่ง OTP'
        );
      }

    });
  }
}