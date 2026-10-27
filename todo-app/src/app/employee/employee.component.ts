
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-employee',
   imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './employee.component.html',
  styleUrl: './employee.component.css'
})
export class EmployeeComponent {


  currentPage: number = 1;
itemsPerPage: number = 10; 
totalPages: number = 1;
paginatedEmployeeList: any[] = [];
  private todoService = inject(TodoService);

  search = '';
  items: string[] = ['รายการที่ 1', 'รายการที่ 2', 'รายการที่ 3'];
  filteredItems: string[] = [...this.items];

  data: any[] = [];
  months: string[] = [];
    stan = false;
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
  out = false;
  saleOrders: any[] = []; 
  reload = false;
  isLoading = false; 
  loader = false;
  Animation_outdash = false;
  return = false;
  play_Return = false;
  employee :any[] = []; 
  todos :any[] = []; 
  userRole: string = '';
  profile = '';
  employeeList: any[] = []; 
filteredEmployeeList: any[] = [];
outimport = false;
product = true;
button_cancel = false;
button_edit_account = false;
selectedaccount: any = { role: '' };
  private timeSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {
   window.scrollTo({ top: 0, behavior: 'smooth' });
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';

     if (state.Move_return === true) {
    this.stan = false;
      this.play_Return = true;
      this.out = false;
  }
    if (state.Move_return2 === true){
      this.stan = false;
      this.play_Return = true;
      this.out = false;
    }
    if (state.Move_return3 === true){
    
    }
    if (state.Move_return4 === true){
      this.stan = false;
      this.play_Return = false;
      this.Animation_outdash = false
      this.Animation_out = false;
      this.out = false;
    }
    if (state.Move_returnout === true){
        this.play_Return = true;
    }

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
    return;
    }

      this.loadTodos(); 
      
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }
  reloads() {
  this.loadTodos();
    this.isLoading = true; 
}   


    Animationa_out1(){
  this.Animation_outdash = true;
    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa2_out(){
    this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa3_out(){
    this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return2:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animationa4_out(){

    this.Animation_outdash = true
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
  Animationa6_out(){
 this.out = false;
    this.play_Return = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  
  Animationa_out(){
    this.Animation_outdash = true;
    
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  openpopupnoti(message:string){
    this.showpopupnoti = true;
    this.popup = message;
  }
  openpopup(message:string){
    this.showpopup = true;
    this.popup = message;
  }
  closepopup(){
    this.showpopup = false;
    this.showpopupnoti = false;
    this.button_edit_account = false;
    
    
  }
  calculateTotalPages() {
  this.totalPages = Math.ceil(this.filteredEmployeeList.length / this.itemsPerPage);
  if (this.totalPages === 0) this.totalPages = 1;
  this.changePage(1); // รีเซ็ตไปหน้าแรกเสมอเมื่อข้อมูลเปลี่ยน
}

changePage(page: number) {
  if (page < 1 || page > this.totalPages) return;
  this.currentPage = page;
  
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = startIndex + this.itemsPerPage;
  this.paginatedEmployeeList = this.filteredEmployeeList.slice(startIndex, endIndex);
}
  ngOnDestroy() {
    this.timeSubscription?.unsubscribe();
  }
  // ปรับชื่อและค่า scale ให้เหมาะกับความสูงของกราฟ
  calculateHeight(valueInBaht: number): number {
    const maxHeight = 300; // ความสูงสูงสุดที่ยอมรับได้ (px)
    const scale = 0.004;    // อัตราส่วนย่อขยาย (ปรับตามความเหมาะสมของข้อมูล)
    
    return Math.min(valueInBaht * scale, maxHeight);
  }
loadTodos() {
    this.loader = true;
    this.todoService.getTodoss().subscribe({
      next: (res) => {
        this.isLoading = false; 
        this.loader = false;

        if (this.userRole === 'pos') {
          this.employeeList = res.filter((emp: any) => emp.role === 'pos');
        } else {

          this.employeeList = res;
        }

        this.todos = this.employeeList;
        this.filteredEmployeeList = [...this.employeeList]; 
               this.calculateTotalPages(); 
      },
      error: (err) => {
        console.error('Error fetching employee data:', err);
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

isGuest(role: string): boolean {
  return role === '' || role === null || role === undefined;
}
 filterS() {
  if (!this.search) {
    this.filteredEmployeeList = [...this.employeeList];
  } else {
    const searchTerm = this.search.toLowerCase();
    this.filteredEmployeeList = this.employeeList.filter(emp => 
      (emp.username && emp.username.toLowerCase().includes(searchTerm)) ||
      (emp.code && emp.code.toLowerCase().includes(searchTerm)) ||
      (emp.title && emp.title.toLowerCase().includes(searchTerm))
    );
  }
  this.calculateTotalPages();
}


filterEmployee(selected: string) {
  if (selected === 'all') {
    this.filteredEmployeeList = [...this.employeeList];
  } else {
    let mappedRole = selected;
    if (selected === 'Guest') mappedRole = '';
    if (selected === 'Front') mappedRole = 'pos';
    if (selected === 'Back') mappedRole = 'backend';
    if (selected === 'Admin') mappedRole = 'admin';

    this.filteredEmployeeList = this.employeeList.filter(emp => {
      if (mappedRole === '') {

        return emp.role === null || emp.role === undefined || emp.role === '';
      }
      return emp.role === mappedRole;
    });
  }
    this.calculateTotalPages(); 
}
  button_cancels() {
   this.outimport = true;
  const element = document.querySelector('.con_import_product') as HTMLElement;
  const element2 = document.querySelector('.con_import_product2') as HTMLElement;
  if (element) {
    element.scrollTop = 0;
    element.classList.add('out');
  }
  if (element2) {
    element2.scrollTop = 0;
    element2.classList.add('out');
  }

  setTimeout(() => {
    this.button_cancel = false;
    this.outimport = false;
    this.button_edit_account = false

  }, 400);
}
button_edit_account2(item?: any) {
  this.button_edit_account = true;
  if (item) {
    this.selectedaccount = { ...item }; 

    if (this.selectedaccount.role === 'pos') this.selectedaccount.role = 'Frontend';
    if (this.selectedaccount.role === 'backend') this.selectedaccount.role = 'Backend';
    if (this.selectedaccount.role === 'admin') this.selectedaccount.role = 'Admin';
  }
  
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

 saveAccountChanges() {
  let mappedRole = this.selectedaccount.role;
  if (mappedRole === 'Frontend') mappedRole = 'pos';
  if (mappedRole === 'Backend') mappedRole = 'backend';
  if (mappedRole === 'Admin') mappedRole = 'admin';

  const updatedAccount = {
    ...this.selectedaccount,
    role: mappedRole
  };

  // 1. ค้นหาข้อมูลเดิมจาก employeeList เพื่อใช้เปรียบเทียบ
  const originalAccount = this.employeeList.find(emp => emp.username === updatedAccount.username);

  this.todoService.updateEmployee(updatedAccount.username, updatedAccount).subscribe({
    next: (res) => {
      this.openpopup("Account updated successfully");
      
      const now = new Date();
      const baseAuditData = {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        username: this.username,
        email: this.email,
        role: this.userRole,
        picture: this.profile
      };

      // ถ้าพบข้อมูลเดิม ให้ทำการเช็คการเปลี่ยนแปลงทีละจุด
      if (originalAccount) {
        
        // 2. ตรวจสอบและบันทึก Log เมื่อมีการเปลี่ยน Role (ตำแหน่ง)
        if (originalAccount.role !== updatedAccount.role) {
          const oldRole = originalAccount.role || 'Guest';
          const newRole = updatedAccount.role || 'Guest';
          this.todoService.logAudit({
            ...baseAuditData,
            activity: `Edit Role for User: ${updatedAccount.username} (from ${oldRole} to ${newRole})`
          }).subscribe();
        }

        // 3. ตรวจสอบและบันทึก Log เมื่อมีการเปลี่ยน Status (สถานะ)
        if (originalAccount.status !== updatedAccount.status) {
          this.todoService.logAudit({
            ...baseAuditData,
            activity: `Edit Status for User: ${updatedAccount.username} (from ${originalAccount.status} to ${updatedAccount.status})`
          }).subscribe();
        }

      } else {
        // กรณีไม่พบข้อมูลเดิม (Fallback)
        this.todoService.logAudit({
          ...baseAuditData,
          activity: `Edit Role/Status for User: ${updatedAccount.username}`
        }).subscribe();
      }

      this.loadTodos(); 
      this.button_cancels(); 
    },
    error: (err) => {
      console.error('Error updating account:', err);
      this.openpopupnoti("Failed to update account");
    }
  });
}
   showDeletePopup = false;
  userToDeleteId: number | null = null; // เปลี่ยนมาเก็บ ID

  deleteAccount(id: number, username: string) {
    this.userToDeleteId = id;
    this.popup = `Are you sure you want to delete ${username}?`;
    this.showDeletePopup = true;
  }

  confirmDelete() {
    if (!this.userToDeleteId) return;
        // ดึงข้อมูล username ก่อนที่จะลบ เพื่อนำไปบันทึก Log
    const userObj = this.employeeList.find(emp => emp.id === this.userToDeleteId);
        const deletedUsername = userObj ? userObj.username : this.userToDeleteId;
    this.todoService.deleteEmployee(this.userToDeleteId).subscribe({
      next: (res) => {
        this.openpopup("Delete Guest Completed");
          const now = new Date();
        const auditData = {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          username: this.username,
          email: this.email,
          activity: `Delete User: ${deletedUsername}`,
          role: this.userRole,
          picture: this.profile
        };
        this.todoService.logAudit(auditData).subscribe();
        this.loadTodos(); 
        this.closeDeletePopup(); 
      },
      error: (err) => {
        console.error('Error deleting account:', err);
        this.openpopupnoti("Cannot Delete Guest");
        this.closeDeletePopup(); 
      }
    });
  }

  closeDeletePopup() {
    this.showDeletePopup = false;
    this.userToDeleteId = null; // รีเซ็ตค่า ID
  }
  }

