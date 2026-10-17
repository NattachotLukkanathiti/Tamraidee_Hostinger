
import { Component, OnInit, inject ,HostListener} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-audit',
  imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './audit.component.html',
  styleUrl: './audit.component.css'
})
export class AuditComponent {
    itemsPerPage: number = 10; 
  currentPage: number = 1;
  totalPages: number = 1;
  pagesArray: number[] = [];

    rowHeight: number = 50; // ความสูงของแต่ละแถว (px)
  headerHeight: number = 250;
  // --- เพิ่มฟังก์ชันดักจับการ Resize ---
    paginatedAuditLogs: any[] = [];
  filteredAuditLogs: any[] = [];


 
  private todoService = inject(TodoService);

  search = '';
  items: string[] = ['รายการที่ 1', 'รายการที่ 2', 'รายการที่ 3'];
  filteredItems: string[] = [...this.items];

  data: any[] = [];
  months: string[] = [];
  
  email = '';
  username = '';
  showpopup = false;
  popup = '';
  showpopupnoti = false;
  isMenuOpen = true;
  isMenuOpenprofile = false;
  currentView = 'dashboard';
  currentTime = new Date();
  isTimeOpen = false;
  Animation_out = false;
  out = true;
  history: any[] = []; 
  reload = false;
  isLoading = false; 
  loader = false;
  profile = '';
 play_Return = false;
   Animation_outdash = false;
  return = false;
    stan = false;
   userRole: string = '';
    auditLogs: any[] = []; 
  private timeSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {
   window.scrollTo({ top: 0, behavior: 'smooth' });
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
    this.loadAudit();
     if (state.Move_return === true) {
    this.out = false;
  }
  if (state.Move_returns3 === true) {
        this.play_Return = false;
    this.out = false;
    
  }
   if (state.Move_return4 === true) {
        this.out = false
    this.play_Return = true;
  }
  if (state.Move_return44 === true) {
        this.out = false
    this.play_Return = false;
  }
  if (state.Move_return6 === true) {
        this.out = false
    this.play_Return = false;
  }


    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
    return;
    }
      

      
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }
   @HostListener('window:resize', ['$event'])
  onResize(event: any) { 
    this.calculateRows();
  }

  calculateRows() {
    const availableHeight = window.innerHeight - this.headerHeight;
    this.itemsPerPage = Math.max(5, Math.floor(availableHeight / this.rowHeight));
    
    if (this.filteredAuditLogs && this.filteredAuditLogs.length > 0) {
      this.calculateTotalPages();
    }
  }

   calculateTotalPages() {
    this.totalPages = Math.ceil(this.filteredAuditLogs.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;
    this.changePage(1);
  }



  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

 filterS() {
    if (!this.search) {
      this.filteredAuditLogs = [...this.auditLogs];
    } else {
      const searchTerm = this.search.toLowerCase();
      this.filteredAuditLogs = this.auditLogs.filter(log => 
        (log.username && log.username.toLowerCase().includes(searchTerm)) ||
        (log.activity && log.activity.toLowerCase().includes(searchTerm)) ||
        (log.role && log.role.toLowerCase().includes(searchTerm))
      );
    }
    this.calculateTotalPages();
  }
  reloads() {
    this.loadAudit();
    this.isLoading = true; 
}   
  Animationa2_out(){
    this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animationa3_out(){
    this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa4_out(){
    this.Animation_outdash = true;
    

    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa6_out(){
    this.Animation_outdash = true;
    

    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out5(){
              this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, Move_return5:true ,Open_bar:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out(){
    this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole  ,profile:this.profile}
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
  }


  loadAudit() {
    this.loader = true;
    
    this.todoService.getAudit().subscribe({
      next: (res) => {
        this.auditLogs = res;
        this.filteredAuditLogs = [...this.auditLogs]; // <--- เพิ่มบรรทัดนี้
        this.calculateTotalPages(); // <--- เพิ่มบรรทัดนี้
        this.isLoading = false;
        this.loader = false;
      },
      error: (err) => {
        console.error('Error fetching audit logs:', err);
        this.loader = false;
      }
    });
  }


  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.isMenuOpenprofile = !this.isMenuOpenprofile;
  }
  hambar(){
    this.isMenuOpen = !this.isMenuOpen;
  }

  setView(view: string) {
    this.currentView = view;
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
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Failed to save logout audit', err);
        this.router.navigate(['/login']); 
      }
    });
  }
  // เพิ่มฟังก์ชันนี้เข้าไป
  get visiblePages(): number[] {
    const blockSize = 3; // แสดงทีละ 3 หน้า
    const currentBlock = Math.floor((this.currentPage - 1) / blockSize);
    const startPage = (currentBlock * blockSize) + 1;
    const endPage = Math.min(startPage + blockSize - 1, this.totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  // อัปเดตฟังก์ชัน changePage เดิม
  changePage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAuditLogs = this.filteredAuditLogs.slice(startIndex, endIndex);
  }
}


