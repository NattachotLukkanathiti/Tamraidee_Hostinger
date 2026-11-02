import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router'; // เพิ่ม Router

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { TodoService } from '../services/todo.service';
import { AuthService, homeRouteFor } from '../services/auth.service';
import { auditEntry } from '../services/audit';
import { SocialLoginService, SocialProvider } from '../services/social-login.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  private readonly todoService = inject(TodoService);
  private readonly authService = inject(AuthService);
  private readonly socialLogin = inject(SocialLoginService);
  private readonly router = inject(Router); // ใช้สำหรับเปลี่ยนหน้า

  // เข้าหน้า Login = ออกจากระบบ (ทุกหน้าที่กด Logout จะพากลับมาที่นี่)
  ngOnInit(): void {
    this.authService.clearSession();
  }

  title = ''; // เปลี่ยนจาก title เป็น username
  password = '';
  rememberMe = false;
  showPassword = false;
  showpopup = false;
  showpopupnoti = false;
  popup = '';
  registersuccess = false;

  

  openpopup(message:string){
    this.popup = message;
    this.showpopup = true;
  }
  closepopup(){
    this.showpopup = false;
    this.showpopupnoti = false;
    
    if(this.registersuccess === true){
      void this.router.navigate(['/login']);
      this.registersuccess = false;
    }
  }
  openpopupnoti(message:string){
    this.showpopupnoti = true;
    this.popup = message;
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // เปลี่ยนจาก addTodo เป็น login
   isLoading = false; // เพิ่มตัวแปรนี้

  login() {
    if (!this.title.trim() || !this.password.trim()) return;

    this.isLoading = true; // เริ่มแสดง Loading

    this.todoService.login(this.title, this.password).subscribe({
      next: (response) => {
        this.isLoading = false; // ซ่อน Loading
        const user = response.user;
        this.authService.setSession(response.token, user);

        this.todoService.logAudit(auditEntry(user, 'Login')).subscribe({
          next: () => console.log('Audit log saved successfully'),
          error: (err) => console.error('Failed to save audit log', err)
        });

        // ส่งข้อมูลผู้ใช้ไปพร้อมกับการเปลี่ยนหน้า (รวมข้อมูลส่วนตัวให้หน้า Profile แสดงได้ทันที)
        void this.router.navigate([homeRouteFor(user.role)], {
          state: {
            id: user.id,
            username: user.username,
            email: user.title,
            profile: user.profile,
            stan: true,
            inhere: true,
            role: user.role,
            status: user.status,
            dob: user.dob,
            national_id: user.national_id,
            address: user.address,
            emergency_contact: user.emergency_contact
          }
        });
      },
      error: (error) => {
        this.isLoading = false; // ซ่อน Loading เมื่อเกิดข้อผิดพลาด
        console.error('Login Failed', error);
        this.openpopupnoti("Username or password incorrect");
      }
    });
  }

  signInWithGoogle() {
    this.socialSignIn('google');
  }

  signInWithFacebook() {
    this.socialSignIn('facebook');
  }

  signInWithGitHub() {
    this.socialSignIn('github');
  }

  // เข้าสู่ระบบด้วย Google / Facebook / GitHub
  socialSignIn(kind: SocialProvider) {
    this.isLoading = true;
    this.socialLogin.signIn(kind)
      .catch((error) => {
        console.error(error);
        this.openpopupnoti(error?.error?.message || "การล็อกอินล้มเหลว กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
}
