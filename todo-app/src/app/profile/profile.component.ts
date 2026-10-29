import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { Subscription } from 'rxjs';

export interface UserProfile {
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
  selector: 'app-profile-page',
  standalone: true,
  imports: [RouterLink, CommonModule, DatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef); // เพิ่ม ChangeDetectorRef
  readonly defaultAvatar = 'assets/images/default-avatar.svg'; 

  // --- Navbar Variables ---
  userId: number = 0;
  username = '';
  email = '';
  userRole = '';
  profile = '';

  // --- Profile Variables (เพิ่มให้ตรงกับ HTML) ---
  dob = '';
  nationnal = ''; 
  address = '';
  emergency = ''; 
  phone = ''; 

  // --- Navbar UI & Time State ---
  isMenuOpen = false; 
  isTimeOpen = false;
  currentTime = new Date();
  private timeSubscription!: Subscription;

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

    this.fromEdit = state.fromEdit || false;
    this.userId = state.id || state._id || 0;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';
    this.profile = state.profile || this.defaultAvatar; 

    // --- รับค่าข้อมูลส่วนตัว ---
    this.dob = state.dob || '';
    this.nationnal = state.national_id || state.nationalId || '';
    this.address = state.address || '';
    this.emergency = state.emergency_contact || state.emergencyContact || '';
    this.phone = state.phone || '';
    this.cdr.markForCheck(); // สั่งอัปเดตหน้าจอ
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
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

    fromEdit = false; 
    back() { 
    if (this.fromEdit) {
      window.history.go(-3); 
    } else {
      this.location.back(); 
    }
  }


  edit(){
    this.router.navigate(['/edit'],{
        state:{  
          id: this.userId,
          username: this.username, 
          email: this.email, 
          role: this.userRole, 
          profile: this.profile,
          dob: this.dob,
          nationalId: this.nationnal, 
          address: this.address,
          emergencyContact: this.emergency, 
           phone: this.phone,
          Move_return: true 
        }
      })
  }
}