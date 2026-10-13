
import { Component, OnInit, inject ,NgZone} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';
import { createClient } from '@supabase/supabase-js'; 
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
  isLoading = true; 
  loader = false;
  profile = '';
 play_Return = false;
   Animation_outdash = false;
  return = false;
    stan = false;
   userRole: string = '';
   private supabaseUrl = 'https://ehyhllaxvozjdndddfku.supabase.co';
  private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoeWhsbGF4dm96amRuZGRkZmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NjUyMzAsImV4cCI6MjEwMDQ0MTIzMH0.FQ98R2OopmNkIBQLTeieKGETr0asT2KAaMf-G6uSLq4';
  private supabase = createClient(this.supabaseUrl, this.supabaseKey);

  // ... (ตัวแปรอื่นๆ ของคุณ)

  private timeSubscription!: Subscription;
  
  // เพิ่ม NgZone ใน constructor
  constructor(private router: Router, private ngZone: NgZone) {}

  ngOnInit(): void {
    // เพิ่มการเชื่อมต่อ Realtime สำหรับตาราง history
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
    this.history
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


 loadHistory() {
    this.loader = true;
    
    // 1. ดึงข้อมูลผู้ใช้จากตาราง todos ก่อน
    this.todoService.getTodoss().subscribe({
      next: (users) => {
        
        // 2. เมื่อได้ข้อมูลผู้ใช้แล้ว ค่อยดึงข้อมูล History
        this.todoService.getHistory().subscribe({
          next: (res) => {
            this.history = res.map((item: any) => {
              // ค้นหาผู้ใช้ที่ตรงกับ created_by
              const user = users.find((u: any) => u.username === item.created_by);
              
              return {
                ...item,
                created_by: item.created_by || 'Unknown User',
                // ใช้รูปจากฟิลด์ profile ในตาราง todos
                picture: user && user.profile ? user.profile : 'assets/default-avatar.png'
              };
            });
            
          
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
    this.product1 = false;  // ซ่อน Product 1
    this.product2 = true;  // ซ่อน Product 2
    this.product3 = false; // แสดง Product 3 (View)
    
    this.selectedProduct = { ...order }; // เก็บข้อมูลของแถวที่กด
    this.outimport = false; // รีเซ็ตแอนิเมชันตอนปิด
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
  // ดึงข้อมูล request_history ทั้งหมดมา
  this.todoService.getRequestHistory().subscribe({
    next: (list) => {
      this.isLoading = false;
      // ค้นหาคำขอที่ตรงกับ SKU นี้ และมีสถานะเป็น Pending
      const found = list.find((item: any) => item.sku === order.sku && item.status === 'Pending');
      
      if (found) {
        this.selectedProduct = found; // นำข้อมูลที่เจอมาแสดง
      } else {
        // ถ้าไม่เจอ ให้เอาข้อมูลจากตาราง history มาแสดงแทน
        this.selectedProduct = { ...order, id: null }; 
      }
      this.product1 = false;  // ซ่อน Product 1
    this.product2 = true;  // ซ่อน Product 2
    this.product3 = true; // แสดง Product 3 (View)
      this.outimport = false;
      this.loader = false;
    },
    error: (err) => {
      console.error('Error fetching request detail:', err);
      this.openpopupnoti("ไม่สามารถดึงข้อมูลได้");
      this.loader = false;
    }
  });
}
  request2(order: any) {
    this.product2 = false; // แสดง
    this.selectedProduct = { ...order }; // นำข้อมูลที่รับมาใส่ใน selectedProduct
    this.outimport = false;
  }
  button_cancels(){
    this.outimport = true;
    setTimeout(() =>{
            this.product2 = true;
            this.product1 = true;
            this.product3 = true;
          
    },400)
  }
  confirmAdjustment() {
    this.isLoading = true;
    if (!this.selectedProduct.requested_quantity) {
      this.openpopupnoti("กรุณาระบุ Requested Quantity");
      return;
    }

    this.loader = true;
    const now = new Date();

    const requestData = {
      sku: this.selectedProduct.sku,
      requested_quantity: this.selectedProduct.requested_quantity,
      staff_reason: this.selectedProduct.staff_reason || '',
      status: 'Pending',
      created_by: this.username,
      created_at: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0]
    };

    this.todoService.addRequestHistory(requestData).subscribe({
      next: (response) => {
        this.todoService.updateHistoryStatusBySku(this.selectedProduct.sku, 'Pending').subscribe({
          next: () => {
            // --- การแจ้งเตือนเดิมของคุณ ---
            this.todoService.addNotification(
              `Stock Adjustment : Pending Approvals`, 
              `${this.selectedProduct.sku} ${this.selectedProduct.product_name || ''}`, 
              'info', 
              'Just now'
            ).subscribe();

            // --- เพิ่มการแจ้งเตือนที่สอง (ระบุชื่อผู้ส่ง) ---
            this.todoService.addNotification(
              `Pending Approvals: ${this.username} submitted a stock adjustment`, 
              `${this.selectedProduct.sku} ${this.selectedProduct.product_name || ''}`, 
              'info', 
              'Just now'
            ).subscribe();
            // --------------------------------------

            this.loader = false;
            this.isLoading = false;
            this.openpopup("บันทึกข้อมูลสำเร็จ: Pending");
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
        this.openpopupnoti("การบันทึกล้มเหลว: Canceled");
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
  // 1. สร้างตัวแปรแยก (Local Variables) เพื่อดึงค่ามาจาก UI
  const currentId = this.selectedProduct.id;
  const currentSku = this.selectedProduct.sku;
  const selectedStatus = this.selectedProduct.status;
  const inputPassword = this.selectedProduct.confirm_password;
  const adminNote = this.selectedProduct.admin_note;
  const requestedQuantity = this.selectedProduct.requested_quantity;

  if (!selectedStatus) {
    this.openpopupnoti("กรุณาเลือก Adjustment Status");
    return;
  }
  if (!inputPassword) {
    this.openpopupnoti("กรุณากรอก Confirm Password");
    return;
  }

  this.loader = true;

  // 2. ดึงข้อมูลผู้ใช้เพื่อตรวจสอบรหัสผ่าน
  this.todoService.getTodoss().subscribe({
    next: (users) => {
      const currentUser = users.find((u: any) => u.username === this.username);

      if (!currentUser || currentUser.password !== inputPassword) {
        this.loader = false;
        this.isLoading = false;
        this.openpopupnoti("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่");
        return;
      }

      // 3. อัปเดตสถานะ Request
      this.todoService.updateRequestStatus(currentId, { 
        status: selectedStatus, 
        admin_note: adminNote 
      }).subscribe({
        next: () => {
          
          // 4. ตรวจสอบว่าถ้าเป็น Approved ให้ไปอัปเดต Inventory
          if (selectedStatus === 'Approved') {
            
            // ดึงข้อมูลสินค้าเดิมจาก Inventory เพื่อป้องกันข้อมูลอื่น (เช่น รูปภาพ) หาย
            this.todoService.getInventory().subscribe({
              next: (inventory) => {
                const currentProduct = inventory.find((item: any) => item.sku === currentSku);
                
                if (currentProduct) {
                  // รวมข้อมูลเดิม กับ Quantity ใหม่
                  const updateData = { 
                    ...currentProduct, 
                    quantity: requestedQuantity 
                  };
                  
                  // ส่งข้อมูลทั้งหมดกลับไปอัปเดต
                  this.todoService.updateInventory(currentSku, updateData).subscribe({
                    next: () => { this.finalizeAdjustment(currentSku, selectedStatus); },
                    error: (err) => {
                      this.loader = false;
                      this.isLoading = false;
                      console.error("Error updating inventory:", err);
                      this.openpopupnoti("อัปเดตสถานะสำเร็จ แต่ไม่สามารถอัปเดต Inventory ได้");
                    }
                  });
                } else {
                  this.loader = false;
                  this.isLoading = false;
                  this.openpopupnoti("ไม่พบข้อมูลสินค้าในระบบ Inventory");
                }
              }
            });

          } else {
            // ถ้าไม่ใช่ Approved (เช่น Rejected) ข้ามไปอัปเดต History ได้เลย
            this.finalizeAdjustment(currentSku, selectedStatus);
          }

        },
        error: (err) => {
          this.loader = false;
          console.error("Error updating status:", err);
          this.openpopupnoti("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
        }
      });
    }
  });
}

 private finalizeAdjustment(sku: string, status: string) {
    this.todoService.updateHistoryStatusBySku(sku, status).subscribe(() => {
      
      // --- เพิ่มการส่ง Notification ---
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
      // --------------------------------------

      this.loader = false;
      this.openpopup(`ทำรายการสำเร็จ: ${status}`);
      this.button_cancels();
      this.loadHistory();
    });
}

}
