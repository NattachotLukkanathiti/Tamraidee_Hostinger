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
}