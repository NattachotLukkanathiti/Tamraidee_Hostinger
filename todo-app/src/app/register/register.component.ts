import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TodoService } from '../services/todo.service';
import { SocialLoginService, SocialProvider } from '../services/social-login.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    MatCheckboxModule,
    CommonModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  title = '';
  username = '';
  password = '';
  confirmPassword = '';
  rememberMe = false;
  showPassword = false;
  showConfirmPassword = false;
  todos: any[] = [];
  loading = false;
  showpopup = false;
  showpopupnoti = false;
  popup = '';
  registersuccess = false;
  otp = '';
  otpoutput: boolean = false;
     isLoading = false; 

  openpopup(message:string){
    this.popup = message;
    this.showpopup = true;
  }
  closepopup(){
    this.showpopup = false;
    this.showpopupnoti = false;
    
    if(this.registersuccess === true){
      window.location.href="#";
            this.registersuccess = false;
    }
  }
  openpopupnoti(message:string){
    this.showpopupnoti = true;
    this.popup = message;
  }
  constructor(
    private todoService: TodoService,
    private socialLogin: SocialLoginService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  toggleConfirmPassword(){
     this.showConfirmPassword = !this.showConfirmPassword;
  }


  addTodo() {
    this.isLoading = true; 
  
  if (!this.title.trim() || !this.username.trim()) {
    this.isLoading = false; 
    this.openpopupnoti("Please enter both your email and username.");
    return;
  }

    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(this.title)) {
      this.isLoading = false;
      this.openpopupnoti("Please enter a valid email address");
      return;
    }
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordPattern.test(this.password)) {
      this.isLoading = false; 
      this.openpopupnoti("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ เช่น @$!%*?&#");
      
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.isLoading = false;
      this.openpopupnoti("Passwords do not match");
      return;
    }
    this.loading = true;

    // เช็กอีเมลซ้ำที่ Backend แทนการดึงรายชื่อผู้ใช้ทั้งหมดมาเทียบ
    this.todoService.checkEmail(this.title).subscribe({
      next: (res) => {
        if (res.exists) {
          this.isLoading = false;
          this.loading = false;
          this.openpopupnoti("This is account a already in use");
          return;
        }
        this.requestOtp();
      },
      error: () => {
        this.isLoading = false;
        this.loading = false;
        this.openpopupnoti("Unable to verify email. Please try again.");
      }
    });
  }

  private requestOtp() {
    this.todoService.sendOtp(this.title).subscribe({
    next: () => {
      const userData = {
          username: this.username,
          title: this.title,
          password: this.password
        };
        sessionStorage.setItem('tempUserData', JSON.stringify(userData));
      void this.router.navigate(['/otp'], { state: { userData } });
      this.otpoutput = true; 
      this.loading = false;
    },
    error: (err) => {
      this.openpopupnoti(err.error?.message || "Unable to send OTP. Please try again.");
      this.loading = false;
      this.isLoading = false;
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

  // สมัคร/เข้าสู่ระบบด้วย Google / Facebook / GitHub
  socialSignIn(kind: SocialProvider) {
    this.isLoading = true;
    this.socialLogin.signIn(kind)
      .catch((error) => {
        console.error(error);
        this.openpopupnoti(error?.error?.message || "Login failed. Please try again.");
      })
      .finally(() => {
        this.isLoading = false;
      });
  }
}
