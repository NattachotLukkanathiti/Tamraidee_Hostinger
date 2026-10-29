
import { Component, OnInit, inject ,NgZone} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';
import { createClient } from '@supabase/supabase-js'; 
import { getAuth, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
@Component({
  selector: 'app-history',
  imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
    button_cancel = false;
  button_importt = false;
        outimport = false;
        product2 = true;
        product3 = true;
        product1 = true;
        
           selectedProduct: any = {}; 
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
   private supabaseUrl = 'https://iemqkiftkhyoalyqpjzj.supabase.co'; 
private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXFraWZ0a2h5b2FseXFwanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjExODMsImV4cCI6MjEwNzgzNzE4M30.zk_zlo7QSHuNlM943ikEfwS6eWWbRjTYlWEN94kxn7o';
  private supabase = createClient(this.supabaseUrl, this.supabaseKey);



  private timeSubscription!: Subscription;
  
  isSocialLogin: boolean = false;
  constructor(private router: Router, private ngZone: NgZone) {}
  socialProvider: string = ''; 
  ngOnInit(): void {

  const socialLoginStored = localStorage.getItem('isSocialLogin');
  this.socialProvider = localStorage.getItem('socialProvider') || '';
  if (socialLoginStored === 'true') {
    this.isSocialLogin = true;
  } else {
    this.isSocialLogin = false;
  }

     this.loadUsers(); 
       window.scrollTo({ top: 0, behavior: 'smooth' });

    this.supabase
      .channel('realtime-history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, (payload) => {
        console.log('ตรวจพบการเปลี่ยนแปลงใน History:', payload);
        this.ngZone.run(() => {
          this.loadHistory(); 
        });
      })
      .subscribe();
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
    
  const initialStatus = state.filterStatus || 'all';

  // ส่งค่า initialStatus เข้าไปใน loadHistory
  this.loadHistory(initialStatus); 

    this.loadHistory();
     if (state.Move_return === true) {
       this.stan = false;
      this.play_Return = true;
    this.out = false;
  }
  if (state.Move_returnH === true) {
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

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
    return;
    }
      

      
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }
 reloads() {
    this.isLoading = true; 
    this.loadHistory();    
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
    this.Animation_out = true;
    

    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile}
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
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole  ,profile:this.profile}
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
    
  

    
  }
  ngOnDestroy() {
    this.timeSubscription?.unsubscribe();
  }


 loadHistory(initialStatus: string = 'all') {
    this.isLoading = false;
    this.todoService.getTodoss().subscribe({
      next: (users) => {
        this.todoService.getHistory().subscribe({
          next: (res) => {
            this.history = res.map((item: any) => {
              const user = users.find((u: any) => u.username === item.created_by);
              return {
                ...item,
                created_by: item.created_by || 'Unknown User',
                picture: user && user.profile ? user.profile : 'assets/default-avatar.png'
              };
            });
              if (initialStatus !== 'all') {
              this.selectedStatus = initialStatus;
            }

               this.filterHistory(); 
/*  
            this.filteredHistory = [...this.history]; */
            this.updatePagination();

            this.isLoading = false;
            this.loader = false;
          }
        });
      },
      error: (err) => {
        console.error('Error fetching users:', err);
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

  filterS() {
    this.filteredItems = this.items.filter(item =>
      item.toLowerCase().includes(this.search.toLowerCase())
    );
  }
  detail(order: any) {
    this.isLoading = true;
   
    this.todoService.getRequestHistory().subscribe({
      next: (list) => {
        this.isLoading = false;
        
     
        const found = list.find((item: any) => item.sku === order.sku);
        
        if (found) {

          this.selectedProduct = { ...found };
        } else {

          this.selectedProduct = { ...order };
        }
        
        this.product1 = false; 
        this.product2 = true;   
        this.product3 = false;  
        this.outimport = false; 
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching request history detail:', err);
        this.openpopupnoti("Unable to  Request History");
      }
    });
  }
     Animationa_out1(){
             this.Animation_outdash = true;
    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
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
  requestFromHistory(order: any) {
    this.isLoading = true;

  this.todoService.getRequestHistory().subscribe({
    next: (list) => {
      this.isLoading = false;
      
      const found = list.find((item: any) => item.sku === order.sku && item.status === 'Pending');
      
      if (found) {
        this.selectedProduct = found; 
      } else {

        this.selectedProduct = { ...order, id: null }; 
      }
      this.product1 = false;  
    this.product2 = true;
    this.product3 = true; 
      this.outimport = false;
      this.loader = false;
    },
    error: (err) => {
      console.error('Error fetching request detail:', err);
      this.openpopupnoti("Unable to retrieve data.");
      this.loader = false;
    }
  });
}
  request2(order: any) {
    this.product2 = false; 
    this.selectedProduct = { ...order }; 
    this.outimport = false;
  }
  button_cancels(){
    this.outimport = true;
      this.selectedFileName = ''; 
    setTimeout(() =>{
            this.product2 = true;
            this.product1 = true;
            this.product3 = true;
          
    },400)
  }
  confirmAdjustment() {
    this.isLoading = true;
    if (!this.selectedProduct.requested_quantity) {
      this.openpopupnoti("Please select an Adjustment Status.");
      return;
    }

    this.loader = true;
    const now = new Date();

    const requestData = {
      sku: this.selectedProduct.sku,
      requested_quantity: this.selectedProduct.requested_quantity,
      staff_reason: this.selectedProduct.staff_reason || '',
           upload_ref: this.selectedProduct.upload_ref || '', 
      status: 'Pending',
      created_by: this.username,
      created_at: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0]
    };

    this.todoService.addRequestHistory(requestData).subscribe({
      next: (response) => {
        this.todoService.updateHistoryStatusBySku(this.selectedProduct.sku, 'Pending').subscribe({
          next: () => {

            this.todoService.addNotification(
              `Stock Adjustment : Pending Approvals`, 
              `${this.selectedProduct.sku} ${this.selectedProduct.product_name || ''}`, 
              'info', 
              'Just now',
            ).subscribe();

          
            this.todoService.addNotification(
              `Pending Approvals: ${this.username} submitted a stock adjustment`, 
              `${this.selectedProduct.sku} ${this.selectedProduct.product_name || ''}`, 
              'info', 
              'Just now'
            ).subscribe();
       

            this.loader = false;
            this.isLoading = false;
            this.openpopup("Data saved successfully: Pending");
            this.button_cancels(); 
            this.loadHistory();
          },
          error: (err) => {
            this.loader = false;
            console.error("Error updating history status:", err);
          }
        });
      },
      error: (error) => {
        this.loader = false;
        this.openpopupnoti("Save failed: Canceled");
        this.button_cancels();
      }
    });
  }
  requestHistoryList: any[] = [];

  // ดึงข้อมูล Request History
  loadRequestHistory() {
    this.loader = true;
    this.todoService.getRequestHistory().subscribe({
      next: (res) => {
        this.requestHistoryList = res;
        this.loader = false;
      },
      error: (err) => {
        console.error('Error loading request history:', err);
        this.loader = false;
      }
    });
  }

  // เมื่อกดดูรายละเอียด
  viewRequestDetail(item: any) {
    this.selectedProduct = { ...item };
   
    this.outimport = false;
  }
 confirmAdjustment2() {
  
  this.isLoading = true;

  const currentId = this.selectedProduct.id;
  const currentSku = this.selectedProduct.sku;
  const selectedStatus = this.selectedProduct.status;
  const inputPassword = this.selectedProduct.confirm_password;
  const adminNote = this.selectedProduct.admin_note;
  const requestedQuantity = this.selectedProduct.requested_quantity;

  if (!selectedStatus) {
    this.openpopupnoti("Please select an Adjustment Status.");
    return;
  }
  if (!inputPassword) {
    this.openpopupnoti("Please enter your Confirm Password.");
    return;
  }

  this.loader = true;

if (this.isSocialLogin && inputPassword === "social_verified_success") {
    this.processAdjustmentUpdate(currentId, currentSku, selectedStatus, adminNote, requestedQuantity);
    return; 
  }
  // --- โค้ดเดิมของคุณทั้งหมดด้านล่างนี้ (ไม่มีการแก้ไขใดๆ) ---
  this.todoService.getTodoss().subscribe({
    next: (users) => {
      const currentUser = users.find((u: any) => u.username === this.username);

      if (!currentUser || currentUser.password !== inputPassword) {
        this.loader = false;
        this.isLoading = false;
        this.openpopupnoti("Incorrect password. Please try again.");
        return;
      }
      

      // 3. อัปเดตสถานะ Request
      this.todoService.updateRequestStatus(currentId, { 
        
        status: selectedStatus, 
        admin_note: adminNote,
            ...(selectedStatus === 'Approved' && {
          approved_by: this.username,
          approved_picture: this.profile || 'image/profileee.svg',
          approved_date: new Date().toISOString().split('T')[0],
          approved_time: new Date().toTimeString().split(' ')[0]
        })
      }).subscribe({
        next: () => {
          if (selectedStatus === 'Approved') {
            this.todoService.getInventory().subscribe({
              next: (inventory) => {
                const currentProduct = inventory.find((item: any) => item.sku === currentSku);
                
                if (currentProduct) {
                  const updateData = { ...currentProduct, quantity: requestedQuantity };
                  
                  this.todoService.updateInventory(currentSku, updateData).subscribe({
                    next: () => { this.finalizeAdjustment(currentSku, selectedStatus); },
                    error: (err) => {
                      this.loader = false;
                      this.isLoading = false;
                      console.error("Error updating inventory:", err);
                      this.openpopupnoti("Status updated, but failed to update Inventory.");
                    }
                  });
                } else {
                  this.loader = false;
                  this.isLoading = false;
                  this.openpopupnoti("Product not found in Inventory.");
                }
              }
            });
          } else {
            this.finalizeAdjustment(currentSku, selectedStatus);
          }
        },
        error: (err) => {
          this.loader = false;
          console.error("Error updating status:", err);
          this.openpopupnoti("An error occurred while updating status.");
        }
      });
    }
  });
 }

 private processAdjustmentUpdate(currentId: any, currentSku: string, selectedStatus: string, adminNote: string, requestedQuantity: number) {
  // 3. อัปเดตสถานะ Request
    const now = new Date();
  
  // ข้อมูลที่จะอัปเดต
  const updatePayload: any = { 
    status: selectedStatus, 
    admin_note: adminNote,
        ...(selectedStatus === 'Approved' && {
      approved_by: this.username,
      approved_picture: this.profile || 'image/profileee.svg',
      approved_date: new Date().toISOString().split('T')[0],
      approved_time: new Date().toTimeString().split(' ')[0]
    })
  };

  // ถ้าสถานะเป็น Approved ให้เพิ่มข้อมูลผู้ที่อนุมัติ
  if (selectedStatus === 'Approved') {
    updatePayload.approved_by = this.username;
    updatePayload.approved_picture = this.profile || 'image/profileee.svg';
    updatePayload.approved_date = now.toISOString().split('T')[0];
    updatePayload.approved_time = now.toTimeString().split(' ')[0];
  }
  this.todoService.updateRequestStatus(currentId,updatePayload).subscribe({
    next: () => {
      if (selectedStatus === 'Approved') {
        this.todoService.getInventory().subscribe({
          next: (inventory) => {
            const currentProduct = inventory.find((item: any) => item.sku === currentSku);
            
            if (currentProduct) {
              const updateData = { 
                ...currentProduct, 
                quantity: requestedQuantity 
              };
              
              this.todoService.updateInventory(currentSku, updateData).subscribe({
                next: () => { this.finalizeAdjustment(currentSku, selectedStatus); },
                error: (err) => {
                  this.loader = false;
                  this.isLoading = false;
                  console.error("Error updating inventory:", err);
                  this.openpopupnoti("Status updated, but failed to update Inventory.");
                }
              });
            } else {
              this.loader = false;
              this.isLoading = false;
              this.openpopupnoti("Product not found in Inventory.");
            }
          }
        });
      } else {
        this.finalizeAdjustment(currentSku, selectedStatus);
      }
    },
    error: (err) => {
      this.loader = false;
      this.isLoading = false;
      console.error("Error updating status:", err);
      this.openpopupnoti("An error occurred while updating status.");
    }
  });
}
 private finalizeAdjustment(sku: string, status: string) {
    this.todoService.updateHistoryStatusBySku(sku, status).subscribe(() => {
      
      let notiType = 'info';
      let notiTitle = '';
      let notiMessage = '';

      if (status === 'Pending') {
        notiTitle = 'Pending Approvals';
        notiMessage = 'George Russell submitted a stock adjustment';
      } else {
        notiTitle = status === 'Approved' ? 'Accepted' : 'Rejected';
        notiMessage = `${sku} ${this.selectedProduct.product_name || ''}`;
      }
      
      this.todoService.addNotification(
        `Stock Adjustment : ${notiTitle}`, 
        notiMessage, 
        notiType, 
        'Just now'
      ).subscribe();


      this.loader = false;
      this.openpopup(`Transaction successful: ${status}`);
      this.button_cancels();
      this.loadHistory();
    });
}

  itemsPerPage: number = 10; 
  currentPage: number = 1;
  totalPages: number = 1;
  pagesArray: number[] = [];
  filteredHistory: any[] = [];

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get paginatedHistory() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredHistory.slice(startIndex, startIndex + this.itemsPerPage);
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredHistory.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }

  get visiblePages(): number[] {
    const blockSize = 3;
    const currentBlock = Math.floor((this.currentPage - 1) / blockSize);
    const startPage = (currentBlock * blockSize) + 1;
    const endPage = Math.min(startPage + blockSize - 1, this.totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }



selectedStatus: string = 'all';
selectedDateRange: string = 'all';


filterHistory() {
  const now = new Date();
  
  this.filteredHistory = this.history.filter(item => {

    const matchStatus = this.selectedStatus === 'all' || item.status === this.selectedStatus;


    let matchDate = true;
    if (this.selectedDateRange !== 'all') {
      const itemDate = new Date(item.date); 
      const diffTime = now.getTime() - itemDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (this.selectedDateRange === '7' && diffDays > 7) matchDate = false;
      if (this.selectedDateRange === '30' && diffDays > 30) matchDate = false;
    }

    return matchStatus && matchDate;
  });


  this.currentPage = 1;
  this.updatePagination();
}

usersList: any[] = [];

loadUsers() {
  this.todoService.getTodoss().subscribe({
    next: (users) => {
      this.usersList = users;
    }
  });
}

getUserProfileImage(username: string): string {
  if (!username) return 'image/user_avatar.svg';
  const user = this.usersList.find((u: any) => u.username === username);
  return user && user.profile ? user.profile : 'image/user_avatar.svg';
}



reAuthenticateWithGoogle() {
  const auth = getAuth();
  const user = auth.currentUser;
  const provider = new GoogleAuthProvider();

  if (user) {
    this.isLoading = true;
    reauthenticateWithPopup(user, provider)
      .then((result) => {
        this.isLoading = false;
        this.openpopup("Authentication successful");
   
        this.selectedProduct.confirm_password = "social_verified_success";
      })
      .catch((error) => {
        this.isLoading = false;
        console.error(error);
        this.openpopupnoti("Authentication failed. Please try again.");
      });
  }
}

selectedFile: File | null = null;
selectedFileName: string = '';
onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
  
    this.selectedFileName = file.name; 
    
    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedProduct.upload_ref = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}
showImagePopup = false;


}
