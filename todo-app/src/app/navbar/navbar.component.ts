
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { forkJoin,interval, Subscription } from 'rxjs';
import { Output, EventEmitter } from '@angular/core';

type HeaderPanel = 'account' | null;
@Component({
  selector: 'app-navbar',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {

  private todoService = inject(TodoService);
    private changeDetector = inject(ChangeDetectorRef); // <-- เพิ่มบรรทัดนี้
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
  openpro = false;
  private timeSubscription!: Subscription;
    private notiSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {

    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
    this.loadTodos()
     if (state.Move_return === true) {
    this.stan = false;
    this.play_Return = true;
    this.inhere = true;
    this.loadSummary(); 
  }
      if (this.username) {
      this.loadNotifications();
      
      // 2. ตั้งให้เช็คแจ้งเตือนใหม่ทุกๆ 30 วินาที (30000 มิลลิวินาที)
      this.notiSubscription = interval(30000).subscribe(() => {
        this.loadNotifications();
      });
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
    });
  
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
  Animationa_out1(){
    this.outs = false;
        this.out = true;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out(){
    this.outs = false;
        this.out = true;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out2(){
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return3:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out3(){
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_returnH:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out4(){
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out5(){
            this.out = false;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, Move_return5:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out6(){
            this.out = true;
    this.play_Return = false;
    this.Animation_outsale = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
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
     
      
      // สมมติว่าคุณมีตัวแปร currentState ที่เก็บข้อมูล state ที่ส่งมา
      const currentEmail = this.navigationState?.state?.email;

      if (currentEmail) {
        // กรองให้เหลือเฉพาะ todo ที่ email ตรงกับ state
        this.todos = res.filter(todo => todo.email === currentEmail);
      } else {
        this.todos = res;
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
  hambar(){
    this.isMenuOpen = !this.isMenuOpen;
    this.blur = !this.blur;
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
  const readIds = new Set(
    this.notification_status.map(
      (status: any) => Number(status.notification_id)
    )
  );

  return this.notification.some(
    (item: any) => !readIds.has(Number(item.id))
  );
}
}