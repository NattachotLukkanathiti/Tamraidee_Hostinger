import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { TodoService } from '../services/todo.service';

interface StoreSettings {
  id?: number;
  email: string;
  phone: string;
  address: string;
  language: string;
  time_zone: string;
  currency: string;
  date_format: string;
}

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './setting.component.html',
  styleUrl: './setting.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly todoService = inject(TodoService);

  readonly languageOptions = ['English', 'ไทย'];
  readonly timeZoneOptions = ['Asia/Bangkok (UTC+7)', 'UTC'];
  readonly currencyOptions = ['THB', 'USD', 'EUR'];
  readonly dateFormatOptions = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
  
  userRole = ''; username = ''; email = ''; profile = '';

  form: StoreSettings = {
    email: '', phone: '', address: '',
    language: this.languageOptions[0],
    time_zone: this.timeZoneOptions[0],
    currency: this.currencyOptions[0],
    date_format: this.dateFormatOptions[0]
  };

  ngOnInit(): void {
    this.loadSettings();
    const state = history.state;
    this.userRole = state.role || '';
    this.username = state.username || '';
    this.email = state.email || '';
    this.profile = state.profile || '';
  }

  navigateTo(route: string, extraState: any = {}) {
    this.router.navigate([route], {
      state: { 
        username: this.username,
        email: this.email,
        role: this.userRole,
        profile: this.profile,
        ...extraState
      }
    });
  }

  back() { this.location.back(); }

  Animationa2_out(){ setTimeout(() =>{ this.navigateTo('/inventory', { Move_return: true }); } ,300); }
  Animation_out2(){ setTimeout(() =>{ this.navigateTo('/sale', { Move_return2: true }); } ,300); }
  Animation_out3(){ setTimeout(() =>{ this.navigateTo('/history', { Move_return4: true }); } ,300); }
  Animation_out5(){ setTimeout(() =>{ this.navigateTo('/suppliers', { Move_return5: true, Open_bar: true }); } ,300); }
  Animation_out6(){ setTimeout(() =>{ this.navigateTo('/audit', { Move_return6: true }); } ,300); }
  Animationa_out1(){ setTimeout(() =>{ this.navigateTo('/pos', { Move_return6: true }); } ,300); }
  Animation_out4(){ setTimeout(() =>{ this.navigateTo('/employee', { Move_return6: true }); } ,300); }
  Animationa_out(){ setTimeout(() =>{ this.navigateTo('/dashboard', { Move_return: true }); } ,300); }

  save(): void {
    this.todoService.saveSettings(this.form).subscribe({
      next: (response) => {
        if (response.success) {
          alert('บันทึกการตั้งค่าสำเร็จ');
          this.router.navigate(['/pos']);
        }
      },
      error: (err) => console.error('Error saving settings', err)
    });
  }

  loadSettings(): void {
    this.todoService.getSettings().subscribe({
      next: (data) => { if (data) this.form = data; },
      error: (err) => console.error('Error loading settings', err)
    });
  }
}