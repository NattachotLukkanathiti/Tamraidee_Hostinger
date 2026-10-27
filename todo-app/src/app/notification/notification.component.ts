import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { TodoService } from '../services/todo.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent implements OnInit, OnDestroy {
  private todoService = inject(TodoService);
  private router = inject(Router);

  // --- Session & UI State ---
  username = ''; email = ''; userRole = ''; profile = '';
  isMenuOpen = false; isMenuOpenprofile = true; isTimeOpen = false;
  showpopupnoti = false; popup = '';
  currentTime = new Date();
  private timeSubscription!: Subscription;

  // --- Loading State ---
  isLoading = false;
  loader = false;

  // --- Animation State ---
  Animation_out = false; Animation_outsale = false; play_Return = false; 
  out = false; outs = false; stan = false; inhere = false;

  // --- Dynamic Data ---

  // เปลี่ยนจาก Signal เป็น Array ธรรมดา เพื่อให้ใช้กับ HTML เดิมได้
  notifications: any[] = [];

  ngOnInit(): void {
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
       if (this.username) {
      this.loadNotifications();
    }

    if (!this.username || !this.email) {
      this.openpopupnoti("Session not found. Redirecting to login");
      return;
    }

    if (state.Move_return === true) { this.stan = false; this.play_Return = true; this.inhere = true; }
    else if (state.stan === true) { this.stan = true; this.inhere = true; this.play_Return = false; }
    if (state.Dont_animation === true) { this.inhere = false; this.outs = true; }

   

    this.timeSubscription = interval(1000).subscribe(() => { this.currentTime = new Date(); });
  }

  ngOnDestroy() { this.timeSubscription?.unsubscribe(); }

loadNotifications() {
    this.todoService.getNotifications().subscribe({
      next: (res: any) => {
        const rawData = Array.isArray(res) ? res : (res.data || []);
        
        // 1. ดึงข้อมูลสถานะการอ่านจาก Backend แทน Local Storage
        this.todoService.getNotificationStatus(this.username).subscribe({
          next: (statusRes: any) => {
            const readStatusList = Array.isArray(statusRes) ? statusRes : (statusRes.data || []);
            
            // สร้าง Array ของ ID ที่อ่านแล้ว
            const readIds = readStatusList.map((status: any) => status.notification_id);

            // แมปข้อมูลเพิ่ม is_read เข้าไป
            this.notifications = rawData.map((item: any) => ({
              ...item,
              is_read: readIds.includes(item.id)
            }));
          },
          error: (err) => console.error('Error fetching status:', err)
        });
      },
      error: (err) => console.error('Error fetching notifications:', err)
    });
  }

  // --- Navigation & UI Functions ---
  navigateTo(path: string, extraState: any = {}) {
    this.out = true; this.play_Return = false; this.Animation_outsale = true;
    setTimeout(() => {
      this.router.navigate([path], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile, ...extraState } });
    }, 300);
  }
  
   Animationa2_out(){


    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out2(){


    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return2:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out3(){


    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out5(){
            this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, Move_return5:true ,Open_bar:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out6(){
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out1(){
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out4(){
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
   inventory(){
    
    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }

  
  Animationa_out(){

    
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }

  hambar() { this.isMenuOpen = !this.isMenuOpen; }
  toggleMenu() { this.outs = false; this.isMenuOpen = !this.isMenuOpen; this.isMenuOpenprofile = !this.isMenuOpenprofile; }
  openpopupnoti(message: string) { this.showpopupnoti = true; this.popup = message; }
  closepopup() { this.showpopupnoti = false; this.router.navigate(['/login']); }
  openPro() { this.isMenuOpenprofile = !this.isMenuOpenprofile; }
  
  logout() {
    const now = new Date();
    const auditData = { date: now.toISOString().split('T')[0], time: now.toTimeString().split(' ')[0], username: this.username, email: this.email, activity: 'Logout', role: this.userRole, picture: this.profile };
    this.todoService.logAudit(auditData).subscribe({ next: () => this.router.navigate(['/login']), error: () => this.router.navigate(['/login']) });
  }
    getTimeAgo(dateString: string): string {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
 markAsRead(item: any) {
    // ถ้าอ่านแล้วไม่ต้องทำอะไรซ้ำ
    if (item.is_read) return;

    // 1. อัปเดตสถานะใน UI ทันที
    item.is_read = true;

     const hasUnread = this.notifications.some(n => !n.is_read);
    
    // 3. ถ้าอ่านหมดแล้ว ให้ส่งสัญญาณบอก Navbar ทันที (ผ่าน localStorage)
    if (!hasUnread) {
      localStorage.setItem('clear_notification_dot', 'true');
    }
    // 2. ส่งข้อมูลไปบันทึกที่ Backend (ตาราง notification_status)
    this.todoService.markNotificationAsRead(item.id, this.username).subscribe({
      next: () => console.log('Marked as read successfully'),
      error: (err) => {
        console.error('Failed to mark as read:', err);
        // หากบันทึกไม่สำเร็จ ให้คืนค่ากลับเป็นยังไม่อ่าน
        item.is_read = false; 
      }
    });
     if (item.title && item.title.includes('Pending Approvals')) {
      this.Animation_out3(); // ฟังก์ชันสำหรับไปหน้า Stock History
    }
  }
  
 goToHistory(item: any) {
    // 1. ทำการบันทึกว่าอ่านแล้ว
    this.markAsRead(item);
    
    // 2. นำทางไปหน้า Stock History
    this.Animation_out3();
}
  get hasUnreadNotifications(): boolean {
    return this.notifications.some(item => !item.is_read);
  }
  pendingApprovals(): number {
  return this.notifications.filter(item => item.title.includes('Pending Approvals')).length;
}

inventoryAlerts(): number {
  return this.notifications.filter(item => item.type === 'warning').length;
}

stockUpdates(): number {
  return this.notifications.filter(item => item.type === 'success').length;
}
}