import { Component, OnInit } from '@angular/core'; 
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TodoService } from '../services/todo.service';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
export class RegisterComponent implements OnInit { 

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
  ngOnDestroy(): void {
    if (this.update) {
      this.update.unsubscribe();
    }
  }
   verifyOtp() {
    this.todoService.verifyOtp(this.title, this.otp).subscribe({
      next: () => {
      
        this.todoService.addTodo(this.username, this.title, this.password, this.confirmPassword).subscribe(() => {
          this.openpopup("Success");
          this.username = '';
          this.title = '';
          this.password = '';
          this.confirmPassword = '';
          this.otp = '';
          this.otpoutput = false; 
          this.loadTodos();
          this.loading = false;
          this.registersuccess = true;
        });
      },
      error: () => {
        this.openpopupnoti("Invalid or expired OTP.");
      }
    });
  }

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
  private update!: Subscription;
  constructor(
    private todoService: TodoService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  toggleConfirmPassword(){
     this.showConfirmPassword = !this.showConfirmPassword;
  }

  ngOnInit(): void {
    this.loadTodos();
    this.update = interval(2000).subscribe(() => {
      this.loadTodos();
    })
  }

  loadTodos() {
    this.todoService.getTodos().subscribe(data => {
      this.todos = data;
    });
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
    const checkEmail = this.todos.some(todo => todo.title === this.title);
    if (checkEmail) {
      this.isLoading = false;
      this.openpopupnoti("This is account a already in use")
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.isLoading = false; 
      this.openpopupnoti("Passwords do not match");
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.isLoading = false;
      this.openpopupnoti("Password do not match");
      return;
    }
    this.loading = true;

    this.todoService.sendOtp(this.title).subscribe({
    next: () => {
      const userData = {
          username: this.username,
          title: this.title,
          password: this.password
        };
        sessionStorage.setItem('tempUserData', JSON.stringify(userData));
      this.router.navigate(['/otp'], { state: { userData } });
      this.otpoutput = true; 
      this.loading = false;
    },
    error: () => {
      this.openpopupnoti("Unable to send OTP. Please try again.");
      this.loading = false;
    }
  });
  }

  deleteTodo(id: number) {
    this.todoService.deleteTodo(id).subscribe(() => {
      this.loadTodos();
    });
  }

  toggleTodo(todo: any) {
    this.todoService.updateTodo(todo).subscribe(() => {
      this.loadTodos();
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
  
       
        this.todoService.registerOrUpdateUser(userData).subscribe({
          next: () => {
            
         
            this.todoService.checkUserRole(email).subscribe({
              next: (res) => {
              
                this.proceedAfterLogin(user, email, username, res.role);
              },
              error: () => {

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
        this.openpopupnoti("Login failed. Please try again.");
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

