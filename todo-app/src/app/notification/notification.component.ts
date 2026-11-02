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



  username = ''; email = ''; userRole = ''; profile = '';
  isMenuOpen = false; isMenuOpenprofile = true; isTimeOpen = false;
  showpopupnoti = false; popup = '';
  currentTime = new Date();
  private timeSubscription!: Subscription;

  isLoading = false;
  loader = false;


  Animation_out = false; Animation_outsale = false; play_Return = false; 
  out = false; outs = false; stan = false; inhere = false;

  

  notifications: any[] = [];

  ngOnInit(): void {
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
       if (this.username) {
          this.loadHistory(); 
                this.loadInventory(); 
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


  navigateTo(path: string, extraState: any = {}) {
    this.out = true; this.play_Return = false; this.Animation_outsale = true;
    setTimeout(() => {
      this.router.navigate([path], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile, ...extraState } });
    }, 300);
  }
  
   Animationa2_out() {
  this.animation = true;
  setTimeout(() => {
    this.router.navigate(['/inventory'], {
      state: {
        username: this.username,
        email: this.email,
        role: this.userRole,
        profile: this.profile,
        
        form_noti: true // ค่าที่ต้องการส่ง
      }
    });
  }, 300);
}
  Animation_out2(){

   this.animation = true;
    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out3(){
   this.animation = true;

    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out5(){
       this.animation = true;
            this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, form_noti:true ,Open_bar:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out6(){
       this.animation = true;
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out1(){
       this.animation = true;
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out4(){
       this.animation = true;
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
   inventory(){
    this.animation = true;
    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }

  
  Animationa_out(){

       this.animation = true;
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email, form_noti:true ,role:this.userRole ,profile:this.profile }
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

    }
  }
   goToInventory(item: any) {
    // 1. ทำการบันทึกว่าอ่านแล้ว
    this.markAsRead(item);
    
     this.out = false;
  this.play_Return = false;
  this.Animation_out = true;
  
  setTimeout(() => {
    this.router.navigate(['/inventory'], {
      state: {
        username: this.username, 
        email: this.email, 
        role: this.userRole, 
        profile: this.profile,
        filterStatus: 'Low in Stock' // <--- ส่งค่าตัวกรองไปที่นี่
      }
    });
  }, 300);

}
goToHistory(item: any) {
  // 1. บันทึกสถานะการอ่าน
  this.markAsRead(item);
  
  this.out = false;
  this.play_Return = false;
  this.Animation_out = true;
  
  let statusToSend = 'all'; // ค่าเริ่มต้นหากไม่ตรงเงื่อนไขใดๆ
  const title = item.title ? item.title.toLowerCase() : '';
  const message = item.message ? item.message.toLowerCase() : '';

  // 2. ตรวจสอบคำเพื่อส่งตัวกรองที่ถูกต้อง
  if (title.includes('approved') || message.includes('approved') || title.includes('accepted')) {
    statusToSend = 'Approved';
  } else if (title.includes('reject') || message.includes('reject')) {
    statusToSend = 'Rejected';
  } else if (title.includes('pending') || message.includes('pending')) {
    statusToSend = 'Pending';
  }

  // 3. สั่งเปลี่ยนหน้าและส่งค่า state (ลบ Animation_out3 ออกแล้ว)
  setTimeout(() => {
    this.router.navigate(['/history'], {
      state: {
        username: this.username, 
        email: this.email, 
        role: this.userRole, 
        profile: this.profile,
        filterStatus: statusToSend,
        form_noti: true // ส่งค่านี้ไปเพื่อให้แอนิเมชันทำงานถูกต้อง
      }
    });
  }, 300);
}
  get hasUnreadNotifications(): boolean {
    return this.notifications.some(item => !item.is_read);
  }

  historyList: any[] = [];
    loadHistory() {
    this.todoService.getHistory().subscribe({
      next: (res: any) => {
        this.historyList = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err) => console.error('Error fetching history:', err)
    });
  }
    pendingApprovals(): number {
    // นับจากรายการใน History ที่มีสถานะเป็น 'Pending' เท่านั้น
    return this.historyList.filter(item => item.status === 'Pending').length;
  }


    loadInventory() {
    this.todoService.getInventory().subscribe({
      next: (res: any) => {
        this.inventoryList = Array.isArray(res) ? res : (res.data || []);
      },
      error: (err) => console.error('Error fetching inventory:', err)
    });
  }
  inventoryList: any[] = [];
  inventoryAlerts(): number {
    return this.inventoryList.filter(item => {
      // ตรวจสอบว่ามีค่าทั้งสองตัว และ quantity น้อยกว่าหรือเท่ากับ quantity_alert
      const isLowStock = item.quantity <= item.quantity_alert;
      
      // หรือถ้าคุณยังต้องการเช็คสถานะ 'Low Stock' จากฐานข้อมูลร่วมด้วย ให้ใช้บรรทัดนี้แทนค่ะ
      // return item.status === 'Low Stock' || (item.quantity <= item.quantity_alert);
      
      return isLowStock;
    }).length;
}
stockUpdates(): number {
  return this.notifications.filter(item => item.type === 'success').length;
}
animation = false;

}