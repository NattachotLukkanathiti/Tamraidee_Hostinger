import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TodoService } from '../services/todo.service';

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './reset.component.html',
  styleUrl: './reset.component.css'
})
export class ResetComponent implements OnInit, OnDestroy {
  title = ''; // ใช้เก็บ Email
  resetToken = ''; // ได้จากหน้า Step หลังยืนยัน OTP สำเร็จ
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  
  loading = false; // 📌 ใช้ loading ตาม HTML เดิม
  isLoading = false; // สำหรับ Loading Overlay
  showpopup = false;
  showpopupnoti = false;
  popup = '';
  resetsuccess = false;

  constructor(
    private todoService: TodoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // ดึงข้อมูล Email จาก history.state ที่ส่งมาจากหน้า OTP
    const userData = history.state?.userData;
    const resetToken = history.state?.resetToken;
    if (userData && userData.title && resetToken) {
      this.title = userData.title;
      this.resetToken = resetToken;
    } else {
      this.openpopupnoti("ไม่พบข้อมูลผู้ใช้งาน กรุณาทำรายการใหม่");
      setTimeout(() => this.router.navigate(['/forgot']), 2000);
    }
  }

  ngOnDestroy(): void {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // 📌 ใช้ชื่อ addTodo() ตามที่ HTML เรียกใช้ (click)="addTodo()"
  addTodo() {
    this.loading = true;
    this.isLoading = true;

    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordPattern.test(this.password)) {
      this.loading = false;
      this.isLoading = false;
      this.openpopupnoti("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ");
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.loading = false;
      this.isLoading = false;
      this.openpopupnoti("รหัสผ่านไม่ตรงกัน");
      return;
    }

    // ส่งข้อมูลไปอัปเดตที่ Backend
    this.todoService.resetPassword(this.title, this.password, this.resetToken).subscribe({
      next: () => {
        this.loading = false;
        this.isLoading = false;
        this.openpopup("Reset Password Completed");
        this.resetsuccess = true;
      },
      error: (err) => {
        this.loading = false;
        this.isLoading = false;
        this.openpopupnoti(err.error?.message || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง");
      }
    });
  }

  openpopup(message: string) {
    this.popup = message;
    this.showpopup = true;
  }

  closepopup() {
    this.showpopup = false;
    this.showpopupnoti = false;
    
    if (this.resetsuccess) {
      this.router.navigate(['/login']); 
      this.resetsuccess = false;
    }
  }

  openpopupnoti(message: string) {
    this.showpopupnoti = true;
    this.popup = message;
  }
}