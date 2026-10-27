
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { forkJoin,interval, Subscription } from 'rxjs';
import { Output, EventEmitter } from '@angular/core';
import { createClient } from '@supabase/supabase-js'; 

type HeaderPanel = 'account' | null;
@Component({
  selector: 'app-navbar',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  private todoService = inject(TodoService);
    private changeDetector = inject(ChangeDetectorRef);
    private ngZone = inject(NgZone); 

      private supabaseUrl = 'https://iemqkiftkhyoalyqpjzj.supabase.co'; 
  private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXFraWZ0a2h5b2FseXFwanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjExODMsImV4cCI6MjEwNzgzNzE4M30.zk_zlo7QSHuNlM943ikEfwS6eWWbRjTYlWEN94kxn7o';
  private supabase = createClient(this.supabaseUrl, this.supabaseKey);
  search = '';
  items: string[] = ['รายการที่ 1', 'รายการที่ 2', 'รายการที่ 3'];
  filteredItems: string[] = [...this.items];

  data: any[] = [];
  months: string[] = [];
  errorMessage: string = '';
  email = '';
  username = '';
  showpopup = false;
  profile = '';
  navigationState?: any;
  popup = '';
  showpopupnoti = false;
  isMenuOpen = false;
  isMenuOpenprofile = true;
  currentView = 'dashboard';
  stan = false;
  currentTime = new Date();
  isTimeOpen = false;
  Animation_out = false;
  Animation_outsale = false;
  play_Return = false;
  inhere = false;
  outs = false;
  out = false;
  todos: any[] = [];
  Max = false;
  loader = false
  userRole: string = '';
  blur= false;
  openPanel: HeaderPanel = null;
  isNavOpen = false;
   isClosing = false;
     isRightPanelOpen = true;
     notification: any[] = [];
     notification_status: any[] = []; 
  summary: any = {
  todays_sale: 0,
  yearly_total_sales: 0,
  net_income: 0,
  products: 0
  
};
status: string = '';
ber = false;
  openpro = false;
  private timeSubscription!: Subscription;
    private notiSubscription!: Subscription;
      private profileSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {

    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
    this.status = state.status || '';
    this.loadTodos()
     if (state.Move_return === true) {
    this.stan = false;
    this.play_Return = true;
    this.inhere = true;
    this.loadSummary(); 
  }
     if (this.username) {
 /*      interval(3000).subscribe(() => {
        if (!document.hidden) {
          this.loadTodos();
        }
      }); */
      
      this.loadProfileData(); 
      this.loadNotifications();
      this.loadChatMessages(); 
       this.setupRealtime();
      
      // 2. ตั้งให้เช็คแจ้งเตือนใหม่ทุกๆ 30 วินาที (30000 มิลลิวินาที)
     /*  this.notiSubscription = interval(3000).subscribe(() => {
        if (!document.hidden) {
          this.loadNotifications();
        }
      });
      
      this.profileSubscription = interval(3000).subscribe(() => {
        if (!document.hidden) {
          this.loadProfileData(); 
        }
      });
      
      this.chatSubscription = interval(3000).subscribe(() => {
        if (!document.hidden) {
          this.loadChatMessages(); // ดึงข้อมูลแชทใหม่ทุก 3 วินาที
        }
      }); */
    }
  // เข้ามาจาก Login
  else if (state.stan === true) {
    this.stan = true;
        this.inhere = true;
    this.play_Return = false;
  }
  if (state.Dont_animation === true){
     this.inhere = false;
    this.outs = true;
    
  }

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
    return;
  }
    this.loadChartData();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    })
  }
  setupRealtime() {
    this.supabase
      .channel('navbar-realtime')
      // 1. แก้จาก 'todos' เป็น 'todos' (ตรงกันแล้ว)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload: any) => {
        this.ngZone.run(() => { this.loadTodos(); this.loadProfileData(); });
      })
      // 2. แก้จาก 'notifications' เป็น 'notification' (ตัด s ออก)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, (payload: any) => {
        this.ngZone.run(() => { this.loadNotifications(); });
      })
      // 3. แก้จาก 'chat_messages' เป็น 'chat'
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat' }, (payload: any) => {
        this.ngZone.run(() => { this.loadChatMessages(); });
      })
      .subscribe();
  }

  

  loadSummary() {
    this.todoService.getSummary().subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          const data = res[0];
          // แปลงค่าเป็น Number เพื่อให้ Pipe ของ Angular ทำงานได้ถูกต้อง
          this.summary = {
            todays_sale: Number(data.todays_sale) || 0,
            yearly_total_sales: Number(data.yearly_total_sales) || 0,
            net_income: Number(data.net_income) || 0,
            products: Number(data.products) || 0
          };
        }
      },
      error: (err) => console.error('Error loading summary:', err)
    });
  }

  Animationa_out11(){
     this.isClosing = true;
    this.outs = false;
        this.out = true;
    this.play_Return = false;
    this.Animation_out = true;
    
    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
        
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animationa_out1(){
     this.isClosing = true;
    this.outs = false;
        this.out = true;
    this.play_Return = false;
    this.Animation_out = true;
    
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
        
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animationa_out(){
    this.isClosing = true;
    this.outs = false;
        this.out = true;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animation_out2(){
    this.isClosing = true;
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return3:true ,role:this.userRole ,profile:this.profile}
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animation_out3(){
    this.isClosing = true;
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_returnH:true ,role:this.userRole ,profile:this.profile}
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animation_out4(){
    this.isClosing = true;
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile }
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animation_out5(){
    this.isClosing = true;
            this.out = false;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, Move_return5:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
        this.ber = false;
        this.isClosing = false;
    } ,300)
  }
  Animation_out6(){
    this.isClosing = true;
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
        this.ber = false;
         this.isClosing = false;
    } ,300)
  }
  openpopupnoti(message:string){
    this.showpopupnoti = true;
    this.popup = message;
  }
  closepopup(){
    this.showpopup = false;
    this.showpopupnoti = false;
    
  
      this.router.navigate(['/login']); 
    
  }
  ngOnDestroy() {
    this.timeSubscription?.unsubscribe();
        this.notiSubscription?.unsubscribe();
          this.profileSubscription?.unsubscribe(); 
  }
  // ปรับชื่อและค่า scale ให้เหมาะกับความสูงของกราฟ
  calculateHeight(valueInBaht: number): number {
    const maxHeight = 300; // ความสูงสูงสุดที่ยอมรับได้ (px)
    const scale = 0.004;    // อัตราส่วนย่อขยาย (ปรับตามความเหมาะสมของข้อมูล)
    
    return Math.min(valueInBaht * scale, maxHeight);
  }
loadTodos() {
  this.todoService.getTodoss().subscribe({
    next: (res) => {
      // กรองเอาเฉพาะข้อมูลของ user ปัจจุบัน
      this.todos = res.filter(todo => todo.username === this.username);

      if (this.todos.length > 0) {
        const currentUser = this.todos[0];
        const roleValue = currentUser.role || currentUser.userRole;
        
        // 1. เช็คว่า Role หายไปหรือไม่
        const isMissingRole = !roleValue || roleValue.trim() === "";
        
        // 2. เช็คว่า Status เป็น Locked หรือไม่ (เปรียบเทียบแบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่)
        const isLocked = currentUser.status && currentUser.status.toLowerCase() === 'locked';

        if (isLocked) {
          this.popup = "Your account has been Locked. Please contact admin.";
          this.showpopupnoti = true;
        } else if (isMissingRole) {
          this.popup = "Warning: Your account is missing a 'Role'.";
          this.showpopupnoti = true;
        } else {
          this.showpopupnoti = false;
        }
      }
    },
    error: (err) => console.error(err)
  });
}

  loadChartData() {
    this.loader = true; // Set to true before fetching data
    this.todoService.getMonth().subscribe({
      next: (res) => {
        this.data = res;
        this.months = res.map(item => item.month);
        this.loader = false; // Set to false once data is ready
      },
      error: (err) => {
        console.error(err);
        this.loader = false; // Also set to false on error
      }
      
    });
  }
  
    @Output() toggleRightPanel = new EventEmitter<void>();
  toggleFullScreen(): void { 
    // 2. เมื่อกดปุ่ม ให้ส่งสัญญาณออกไป
    this.toggleRightPanel.emit();
  }
  toggleNav(): void { this.isNavOpen = !this.isNavOpen; this.openPanel = null; }
  toggleMenu() {
    this.outs = false;
    this.isMenuOpen = !this.isMenuOpen;
    this.Max = !this.Max;
    this.isMenuOpenprofile = !this.isMenuOpenprofile;
  }
  hambar() {
  if (this.ber) {
    // ถ้ากำลังเปิดอยู่ ให้เล่นอนิเมชั่นปิดก่อน
    this.isClosing = true;
    
    // รอให้อนิเมชั่นเล่นจบ (สมมติว่า 0.3 วินาที) แล้วค่อยซ่อน
    setTimeout(() => {
      this.ber = false;
      this.isClosing = false;
    }, 300); // 300ms = 0.3s
  } else {
    // ถ้าปิดอยู่ ให้เปิดได้เลยทันที
    this.ber = true;
  }
}

  setView(view: string) {
    this.currentView = view;
  }

  filterS() {
    this.filteredItems = this.items.filter(item =>
      item.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  logout() {
    const now = new Date();
    const auditData = {
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0],
      username: this.username, 
      email: this.email,       
      activity: 'Logout', 
      role: this.userRole,     
      picture: this.profile
    };


    this.todoService.logAudit(auditData).subscribe({
      next: () => {
        console.log('Logout audit saved');
        this.router.navigate(['/']);
        this.closePanel
      },
      error: (err) => {
        console.error('Failed to save logout audit', err);
        this.router.navigate(['/login']); 
      }
    });
  }
   openPro(){
    this.isMenuOpenprofile = !this.isMenuOpenprofile;
  }

  toggleAccountMenu(): void { 
    this.openPanel = this.openPanel === 'account' ? null : 'account'; 
    this.isNavOpen = false; 
  }
 openProfile() {
    // 1. ค้นหาข้อมูลผู้ใช้ปัจจุบันจาก todos ที่โหลดมาแล้ว
    const currentUser = this.todos.find(u => u.username === this.username);

    this.router.navigate(['/profile'], {
      state: { 
        // 2. ส่ง ID และข้อมูลพื้นฐาน
        id: currentUser?.id || 0,
        username: this.username, 
        email: this.email, 
        role: this.userRole, 
        profile: this.profile,

        // 3. ส่งข้อมูลส่วนตัวไปด้วย (ถ้ามี)
        dob: currentUser?.dob || '',
        national_id: currentUser?.national_id || '',
        address: currentUser?.address || '',
        emergency_contact: currentUser?.emergency_contact || '',
        phone: currentUser?.phone || ''
      }
    });
        this.closePanel();
  }

  openHelp() {
       this.router.navigate(['/helpp'], {
      state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile }
    });

    this.closePanel();
  }
    openSetting() {
       this.router.navigate(['/setting'], {
      state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile }
    });
   
    this.closePanel();
  }

  closePanel() {
    this.isClosing = true;
    setTimeout(() => {
      this.openPanel = null;
      this.isClosing = false;
      this.changeDetector.markForCheck();
    }, 300);
  }

  openNotifications(): void {
    this.router.navigate(['/notification'],{
          state: { username: this.username, email: this.email, Move_returns3: true, role: this.userRole, profile: this.profile }
    });
  }
loadNotifications(): void {
  if (!this.username) return;

  forkJoin({
    notifications: this.todoService.getNotifications(),
    status: this.todoService.getNotificationStatus(this.username)
  }).subscribe({
    next: (res: any) => {
        this.notification = Array.isArray(res.notifications)
        ? res.notifications
        : (res.notifications?.data || []);

      this.notification_status = Array.isArray(res.status) 
        ? res.status 
        : (res.status?.data || []);

      // 2. บังคับให้ Angular อัปเดตหน้าจอทุกครั้ง
      this.changeDetector.markForCheck();
    
    },
    error: (err) => {
      console.error('Error loading notifications:', err);
    }
  });
}

  getDisplayRole(): string {
    if (this.userRole.toLowerCase() === 'pos') {
      return 'Frontend';
    }
    // ทำให้ตัวอักษรตัวแรกเป็นตัวพิมพ์ใหญ่สำหรับ Role อื่นๆ
    return this.userRole.charAt(0).toUpperCase() + this.userRole.slice(1);
  }
get hasUnreadNotifications(): boolean {
  if (!this.notification || this.notification.length === 0) return false;
  if (!this.notification_status) return true;

  // 1. ดึง ID ของข้อความที่อ่านแล้วมาเก็บไว้
  const readIds = new Set(this.notification_status.map((status: any) => String(status.notification_id)));

  // 2. กรองเอาเฉพาะข้อความที่ผู้ใช้คนนี้ "มีสิทธิ์มองเห็น" และ "ยังไม่ได้อ่าน"
  const unreadVisibleItems = this.notification.filter((item: any) => {
    const isRead = readIds.has(String(item.id));
    if (isRead) return false; // ถ้าอ่านแล้ว ไม่ต้องนับ

    const title = item.title || '';
    const role = this.userRole;

    // เงื่อนไขการซ่อน (เอามาจาก HTML ของคุณ)
    const isHiddenForAdmin = title.includes('submitted') && role !== 'admin';
    const isHiddenForBackendPos = !title.includes('submitted') && title.includes('Pending Approvals') && role !== 'backend' && role !== 'pos';
    const isHiddenForStatus = (title.includes('Accepted') || title.includes('Rejected')) && role !== 'backend' && role !== 'pos';

    // ถ้าเข้าเงื่อนไขซ่อน = ไม่ต้องนับ
    if (isHiddenForAdmin || isHiddenForBackendPos || isHiddenForStatus) {
      return false;
    }

    return true; // นับเฉพาะอันที่มองเห็นและยังไม่ได้อ่าน
  });

  // 3. ถ้ามีข้อความที่ยังไม่ได้อ่านและมองเห็นได้ > 0 ให้แสดงจุดแดง
  return unreadVisibleItems.length > 0;
}

  loadProfileData() {
    this.todoService.getTodoss().subscribe({
      next: (res) => {
        // ค้นหาข้อมูลของผู้ใช้ปัจจุบัน
        const currentUser = res.find((user: any) => user.username === this.username);
        if (currentUser) {
          this.profile = currentUser.profile || this.profile;
          this.userRole = currentUser.role || this.userRole;
                   this.status = currentUser.status || this.status; 
          this.changeDetector.markForCheck(); // สั่งอัปเดตหน้าจอ
          
        }
      },
      error: (err) => console.error('Error loading profile:', err)
    });
  }

  chatMessages: any[] = [];
private chatSubscription!: Subscription;
loadChatMessages() {
  this.todoService.getChatHistory(20, 0).subscribe({
    next: (data) => {
      const existingIds = new Set(this.chatMessages.map(m => m.id));
      const newMessages = data.filter((m: any) => !existingIds.has(m.id));

      this.chatMessages = data;
      
      if (newMessages.length > 0 && !this.isInitialLoad) {
            if (this.status.toLowerCase() === 'inactive') { return; } 
                  if (!this.isSoundEnabled || this.status.toLowerCase() === 'inactive') { 
          return; 
        }


        
        const incomingMessages = newMessages.filter((m: any) => m.sender !== this.username);
        if (incomingMessages.length > 0) {
          const latestMessage = incomingMessages[incomingMessages.length - 1] as any;
          
          // ดึง status ของคนส่ง (ถ้าไม่มีให้ถือว่าเป็น Active ไว้ก่อน)
          const senderStatus = latestMessage.status || 'Active';
          
          // 1. เช็คก่อนเลยว่า ถ้าเป็น Inactive ให้ข้ามไป ไม่ต้องแจ้งเตือน
          if (senderStatus === 'Inactive') {
            return; 
          }

          // 2. ถ้าสถานะปกติ ให้เช็ค Role เพื่อแจ้งเตือนตามตำแหน่ง
          const senderRole = latestMessage.userRole || 'user';

          if (this.userRole === 'admin' && senderRole !== 'admin') {
            // เราเป็น Admin และคนส่งเป็น User ทั่วไป
            this.playNotificationSound();
          } else if (this.userRole !== 'admin' && senderRole === 'admin') {
            // เราเป็น User ทั่วไป และคนส่งเป็น Admin
            this.playNotificationSound();
          } else if (['backend', 'frontend'].includes(this.userRole) && senderRole !== this.userRole) {
            // เพิ่มเติม: สำหรับ backend/frontend ถ้าคนส่งไม่ใช่ตำแหน่งเดียวกัน ให้แจ้งเตือน
            this.playNotificationSound();
          }
        }
      }

      this.isInitialLoad = false;
      this.changeDetector.markForCheck();
    },
    error: (err) => {
      console.error('Error loading chat messages:', err);
      this.isInitialLoad = false;
    }
  });
}
get hasProfileUpdate(): boolean {
   if (this.status.toLowerCase() === 'inactive') return false; 
  if (!this.chatMessages || this.chatMessages.length === 0) return false;
  
  // เช็คว่ามีข้อความที่ยังไม่ได้อ่าน (is_read เป็น false) และผู้ส่งไม่ใช่ตัวเราเอง
  return this.chatMessages.some(m => !m.is_read && m.sender !== this.username);
}


private isInitialLoad = true; // ป้องกันเสียงดังตอนรีเฟรช
  
  playNotificationSound() {
    if (!this.isSoundEnabled) return;

    // รีเซ็ตเสียงให้กลับไปจุดเริ่มต้น เพื่อให้เล่นซ้ำได้ทันทีแม้เสียงเก่ายังไม่จบ
    this.notificationAudio.pause();
    this.notificationAudio.currentTime = 0;

    // สั่งเล่นเสียง
    this.notificationAudio.play().catch(err => {
      console.warn('ไม่สามารถเล่นเสียงได้ (อาจต้องรอ User แตะหน้าจอก่อน):', err);
    });
  }
  // ค่าเริ่มต้นเป็น true (เปิดเสียง) โดยดึงจาก localStorage ถ้ามี
  isSoundEnabled: boolean = localStorage.getItem('soundEnabled') !== 'false';

  // ฟังก์ชันสำหรับกด เปิด-ปิด เสียง
  toggleSound() {
    this.isSoundEnabled = !this.isSoundEnabled;
    localStorage.setItem('soundEnabled', String(this.isSoundEnabled));
  }

  // เพิ่มฟังก์ชันนี้ใน navbar.component.ts
get isActive(): boolean {
  if (!this.status) return false; // ถ้าไม่มีค่า status ให้ซ่อนไว้ก่อน
  return this.status.toLowerCase() === 'active'; // ถ้าเป็น active (ตัวเล็กหรือใหญ่ก็ได้) ให้แสดงผล
}


  private notificationAudio = new Audio('assets/sounds/notification.mp3');

  
}