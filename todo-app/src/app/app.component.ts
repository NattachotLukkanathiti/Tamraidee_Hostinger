import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, Router } from '@angular/router'; // <-- เพิ่ม Router ตรงนี้

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { NavbarComponent } from './navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    RouterOutlet,
    NavbarComponent 

  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {

  private router = inject(Router); // <-- ย้ายขึ้นมาไว้ด้านบนเพื่อให้เป็นระเบียบ

  isLoginPage(): boolean {
  const hiddenRoutes = ['/', '/register', '/otp', '/forgot', '/login', '/confirmemployee','/receipt','/step','/reset'];
  
  // ใช้ .split('?')[0] เพื่อตัด Query Parameters (เช่น ?fbclid=...) ออกไป
  const currentRoute = this.router.url.split('?')[0];
  
  // หน้าร้าน (/shop, /shop/:sku) เป็นหน้าสาธารณะ ไม่ใช้ Navbar ของระบบหลังร้าน
  const isShop = currentRoute === '/shop' || currentRoute.startsWith('/shop/');

  return isShop || hiddenRoutes.includes(currentRoute);
}
}