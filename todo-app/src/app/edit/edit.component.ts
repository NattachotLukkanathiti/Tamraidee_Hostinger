import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Subscription } from 'rxjs';
import { TodoService } from '../services/todo.service';

export interface UserEdit{
  name?: string;
  email?: string;
  avatar?: string;
  roleShort?: string;
  dob?: string;
  nationalId?: string;
  address?: string;
  emergencyContact?: string;
}

@Component({
  selector: 'app-edit-page',
  standalone: true,
  imports: [RouterLink, CommonModule, DatePipe, FormsModule], 
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private todoService = inject(TodoService);
  private cdr = inject(ChangeDetectorRef);

  readonly defaultAvatar = 'assets/images/default-avatar.svg'; 
  
  userId: number = 0; 
  username = '';
  email = '';
  userRole = '';
  profile = '';
  isLoading = false;
  dob = '';
  nationalId = '';
  address = '';
  emergencyContact = '';
    phone = ''; // <-- เพิ่มตัวแปรนี้

  isMenuOpen = false; 
  isTimeOpen = false;
  currentTime = new Date();
  private timeSubscription!: Subscription;

  // --- เพิ่มตัวแปรสำหรับ Popup ---
  showpopup = false;
  popup = '';

  navigateTo(route: string, extraState: any = {}) {
    this.router.navigate([route], {
      state: { 
        id: this.userId, 
        username: this.username, 
        email: this.email, 
        role: this.userRole, 
        profile: this.profile,
        ...extraState
      }
    });
  }

  ngOnInit(): void {
    const state = history.state;
        
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';
    this.profile = state.profile || this.defaultAvatar; 

    this.dob = state.dob || '';
    this.nationalId = state.national_id || state.nationalId || ''; 
    this.address = state.address || '';
    this.emergencyContact = state.emergency_contact || state.emergencyContact || ''; 
     this.phone = state.phone || '';
    this.todoService.getTodos().subscribe({
      next: (todos: any[]) => {
        const currentUser = todos.find(u => u.username === this.username);
        if (currentUser) {
          this.userId = currentUser.id;
          console.log('Found ID automatically:', this.userId);
          this.cdr.markForCheck();
        } else {
          this.openpopup('ไม่พบผู้ใช้งานนี้ในระบบ'); // แทนที่ alert
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  // --- ฟังก์ชันจัดการ Popup ---
  openpopup(message: string) {
    this.showpopup = true;
    this.popup = message;
    this.cdr.markForCheck();
  }

  closepopup() {
       this.router.navigate(['/profile'],{
        state:{  
          id: this.userId,
          username: this.username, 
          email: this.email, 
          role: this.userRole, 
          profile: this.profile,
          dob: this.dob,

           phone: this.phone,
          Move_return: true 
        }
      })
    this.showpopup = false;
    this.cdr.markForCheck();
  }

  // --- Navigation Functions ---
  Animationa2_out(){ setTimeout(() =>{ this.navigateTo('/inventory', { Move_return: true }); } ,300); }
  Animation_out2(){ setTimeout(() =>{ this.navigateTo('/sale', { Move_return2: true }); } ,300); }
  Animation_out3(){ setTimeout(() =>{ this.navigateTo('/history', { Move_return4: true }); } ,300); }
  Animation_out5(){ setTimeout(() =>{ this.navigateTo('/suppliers', { Move_return5: true, Open_bar: true }); } ,300); }
  Animation_out6(){ setTimeout(() =>{ this.navigateTo('/audit', { Move_return6: true }); } ,300); }
  Animationa_out1(){ setTimeout(() =>{ this.navigateTo('/pos', { Move_return6: true }); } ,300); }
  Animation_out4(){ setTimeout(() =>{ this.navigateTo('/employee', { Move_return6: true }); } ,300); }
  Animationa_out(){ setTimeout(() =>{ this.navigateTo('/dashboard', { Move_return: true }); } ,300); }

  // --- UI Functions ---
  hambar() { this.isMenuOpen = !this.isMenuOpen; }
  openPro() { /* Logic */ }
  back() { this.location.back(); }
  edit(){ this.router.navigate(['/edit']); }

 saveProfile() {
    if (this.userId === 0) {
      this.openpopup('Error: ไม่พบ ID ของผู้ใช้ กรุณาลองใหม่อีกครั้ง');
      return;
    }
    
    this.isLoading = true;
    
    const updatedData = {
      username: this.username, // ส่ง username ไปด้วย
      dob: this.dob,
      national_id: this.nationalId,         
      address: this.address,
      emergency_contact: this.emergencyContact, 
      profile: this.profile,
      phone: this.phone
    };

    this.todoService.updateProfile(this.userId, updatedData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.openpopup('Profile saved successfully!');
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error updating profile:', error);
        this.openpopup('Failed to save profile. Please try again.');
      }
    });
  }

  button_cancels() { this.back(); }
  onProfileImageSelected(event: any) {
    const file = event.target.files[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.openpopup('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }

      this.isLoading = true;
      this.cdr.markForCheck();

      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = () => {
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // บีบอัดรูปภาพเหลือ 50% (0.5)
          this.profile = canvas.toDataURL('image/jpeg', 0.5);
          
          this.isLoading = false;
          this.cdr.markForCheck();
        };
      };
      
      reader.readAsDataURL(file);
    }
  }
}