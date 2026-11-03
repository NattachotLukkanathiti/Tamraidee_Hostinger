import { Component, DestroyRef, OnInit, inject, model, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, canUseBackOffice } from '../../services/auth.service';
import { auditEntry } from '../../services/audit';
import { TodoService } from '../../services/todo.service';
import { ShopCartService } from '../shop-cart.service';

const SIDEBAR_ANIMATION_MS = 300;

// Navbar ของหน้าร้านเท่านั้น (หน้าตาเดียวกับ Navbar หลังร้าน แต่ไม่ต้องใช้ state ของการ login)
@Component({
  selector: 'app-shop-navbar',
  imports: [FormsModule, DatePipe],
  templateUrl: './shop-navbar.component.html',
  styleUrl: './shop-navbar.component.css'
})
export class ShopNavbarComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly todoService = inject(TodoService);
  private readonly destroyRef = inject(DestroyRef);
  readonly cart = inject(ShopCartService);

  readonly search = model('');
  readonly home = output<void>();
  readonly cartToggle = output<void>();
  // พนักงานที่ login อยู่ = ไปหลังร้าน / ยังไม่ login = ไปหน้า login (ทุกคน login ได้)
  readonly signIn = output<void>();

  currentTime = new Date();
  accountOpen = false;
  isClosing = false;

  ngOnInit(): void {
    const clock = setInterval(() => (this.currentTime = new Date()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  // admin / manager / pos / backend เท่านั้นที่มีทางเข้าหลังร้าน คนอื่นใช้ได้แค่หน้าร้าน
  get isStaff(): boolean {
    return this.isLoggedIn && canUseBackOffice(this.auth.user?.role);
  }

  get roleLabel(): string {
    const role = this.auth.user?.role || '';
    return this.isStaff ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Customer';
  }

  get user() {
    return this.auth.user;
  }

  toggleAccount(): void {
    if (this.accountOpen) {
      this.closeAccount();
    } else {
      this.accountOpen = true;
    }
  }

  // เล่นแอนิเมชันปิด (slideOut) ให้จบก่อนค่อยเอาแผงออก
  closeAccount(): void {
    if (!this.accountOpen || this.isClosing) return;
    this.isClosing = true;
    setTimeout(() => {
      this.accountOpen = false;
      this.isClosing = false;
    }, SIDEBAR_ANIMATION_MS);
  }

  goBackOffice(): void {
    this.accountOpen = false;
    this.signIn.emit();
  }

  logout(): void {
    const user = this.auth.user;
    if (user) {
      this.todoService.logAudit(auditEntry(user, 'Logout')).subscribe({
        error: err => console.error('Failed to save logout audit', err)
      });
    }
    this.auth.clearSession();
    this.closeAccount();
  }
}
