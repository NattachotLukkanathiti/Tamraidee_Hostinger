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
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyDX97-QwdseS6C9vYZ8PQTUFsLTn-3oxQU",
  authDomain: "tamraidee.firebaseapp.com",
  projectId: "tamraidee",
  storageBucket: "tamraidee.firebasestorage.app",
  messagingSenderId: "393168837647",
  appId: "1:393168837647:web:35588c991e76a38b2ed77a",
  measurementId: "G-VHEHJMBK45"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app); 
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
export class LoginComponent {

  private todoService = inject(TodoService);
  private router = inject(Router); // ใช้สำหรับเปลี่ยนหน้า

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
      this.router.navigate(['/login']); 
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
        const profile = response.user.profile;
        const role = response.user.role; // ปรับให้ตรงกับตัวแปร role จาก API ของคุณ
                const status = response.user.status;
        // --- ส่วนที่เพิ่ม: เตรียมข้อมูลสำหรับ Audit Log ---
         const now = new Date();
        const auditData = {
          date: now.toISOString().split('T')[0], // จะได้รูปแบบ YYYY-MM-DD
          time: now.toTimeString().split(' ')[0], // จะได้รูปแบบ HH:MM:SS
          username: response.user.username,
          email: response.user.title,
          activity: 'Login',
          role: response.user.role || 'Guest',
          picture: profile
        };

        // --- ส่วนที่เพิ่ม: ส่งข้อมูลไปบันทึก ---
        this.todoService.logAudit(auditData).subscribe({
          next: () => console.log('Audit log saved successfully'),
          error: (err) => console.error('Failed to save audit log', err)
        });
        const navigationState = {
          state: {
            id: response.user.id, // <--- เพิ่มบรรทัดนี้ (ส่ง ID ไปด้วย)
            username: response.user.username,
            email: response.user.title,
            profile: profile,
            stan: true,
            inhere: true,
            role: role,
            status: status,
            
            // เพิ่มข้อมูลส่วนตัวไปด้วย เพื่อให้หน้า Profile แสดงผลได้ทันที
            dob: response.user.dob,
            national_id: response.user.national_id,
            address: response.user.address,
            emergency_contact: response.user.emergency_contact
          }
        };

        if (!role) {
          this.router.navigate(['/confirmemployee'], navigationState);
        } else {
          switch (role.toLowerCase()) {
            case 'admin':
              this.router.navigate(['/dashboard'], navigationState);
              break;
            case 'pos':
              this.router.navigate(['/pos'], navigationState);
              break;
            case 'backend':
              this.router.navigate(['/inventory'], navigationState);
              break;
            default:
              this.router.navigate(['/dashboard'], navigationState);
          }
        }
      },
      error: (error) => {
        this.isLoading = false; // ซ่อน Loading เมื่อเกิดข้อผิดพลาด
        console.error('Login Failed', error);
        this.openpopupnoti("Username or password incorrect");
      }
    });
  }




   signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    this.handleSocialLogin(provider);
  }

  // ฟังก์ชันล็อกอินด้วย Facebook
  signInWithFacebook() {
    const provider = new FacebookAuthProvider();
    this.handleSocialLogin(provider);
  }
// ฟังก์ชันล็อกอินด้วย GitHub
  signInWithGitHub() {
    const provider = new OAuthProvider('github.com');
    this.handleSocialLogin(provider);
  }
private handleSocialLogin(provider: any) {
  this.isLoading = true;
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      const email = user.email || '';
      const username = user.displayName || user.email?.split('@')[0] || 'User';
      const profile = user.photoURL || '';

      const userData = { username, title: email, password: user.uid, profile, status: 'Active' };

      // 1. บันทึกหรืออัปเดตข้อมูลลง Supabase
      this.todoService.registerOrUpdateUser(userData).subscribe({
        next: () => {
          
          // 2. ตรวจสอบ Role จาก Supabase ว่าผู้ใช้คนนี้มีสิทธิ์อะไร
          this.todoService.checkUserRole(email).subscribe({
            next: (res) => {
              // ถ้ามี Role อยู่แล้ว ให้ส่ง Role นั้นไป
              this.proceedAfterLogin(user, email, username, res.role);
            },
            error: () => {
              // ถ้าไม่พบข้อมูล (ผู้ใช้ใหม่) ให้ส่งค่าว่าง (Guest)
              this.proceedAfterLogin(user, email, username, '');
            }
          });

        },
        error: (err) => {
          console.error('Error saving to Supabase:', err);
          this.proceedAfterLogin(user, email, username, '');
        }
      });
    })
    .catch((error) => {
      this.isLoading = false;
      console.error(error);
      this.openpopupnoti("การล็อกอินล้มเหลว กรุณาลองใหม่อีกครั้ง");
    });
}private proceedAfterLogin(user: any, email: string, username: string, role: string) {
  const profile = user.photoURL || '';

  const now = new Date();
  const auditData = {
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().split(' ')[0],
    username: username,
    email: email,
    activity: 'Social Login',
    role: role || 'Guest',
    picture: profile
  };

  this.todoService.logAudit(auditData).subscribe();
  this.isLoading = false;

  const navigationState = { state: { username, email, profile, role, stan: true } };

  // ตรวจสอบ Role เพื่อส่งไปหน้าที่ถูกต้อง
  if (!role) {
    this.router.navigate(['/confirmemployee'], navigationState);
  } else {
    switch (role.toLowerCase()) {
      case 'admin': this.router.navigate(['/dashboard'], navigationState); break;
      case 'pos': this.router.navigate(['/pos'], navigationState); break;
      case 'backend': this.router.navigate(['/inventory'], navigationState); break;
      default: this.router.navigate(['/dashboard'], navigationState);
    }
  }
}
}