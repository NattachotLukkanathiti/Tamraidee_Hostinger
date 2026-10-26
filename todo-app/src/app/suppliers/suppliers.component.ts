import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core'; // เพิ่ม ViewChild, ElementRef
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-suppliers',
  imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css'
})
export class SuppliersComponent {
  @ViewChild('fileInput') fileInput!: ElementRef; // เพิ่มบรรทัดนี้
  private todoService = inject(TodoService);
  button_edit = false;
  selectedSupplier: any = {}
  search = '';
  items: string[] = ['รายการที่ 1', 'รายการที่ 2', 'รายการที่ 3'];
  filteredItems: string[] = [...this.items];

  data: any[] = [];
  months: string[] = [];
  inhere = false;
  email = '';
  username = '';
  showpopup = false;
  popup = '';
  showpopupnoti = false;
  isMenuOpen = true;
  isMenuOpenprofile = true;
  currentView = 'dashboard';
  currentTime = new Date();
  isTimeOpen = false;
  Animation_out = false;
  out = false;
  suppliers: any[] = []; 
  reload = false;
  isLoading = false; 
  loader = false;
  play_Return = false;
  Animation_outdash = false;
  return = false;
  stan = false;
  openn = false;
  profile = '';
  userRole: string = '';
  
  // --- ส่วนที่เพิ่มเข้ามาใหม่ (ตัวแปรสำหรับฟอร์ม) ---
  button_importt = false;
  button_cancel = false;
  outimport = false;
  product = true;
  imagePreview: string | null = null;
  selectedFile: File | null = null;
  // -------------------------------------------

  newSupplier = {
    supplier_name: '',
    created_by: '',
    email: '',
    phone: '',
    logo: ''
  };

  private timeSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {
       window.scrollTo({ top: 0, behavior: 'smooth' });
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user';
    this.profile = state.profile || '';
    this.loadSuppliers();
    
    if (state.Move_return === true) { this.out = false; }
    if (state.Move_returns3 === true) { this.play_Return = false; this.out = false; }
    if (state.Open_bar === true){ this.openn = true; }
    if (state.Dont_animation === true){ this.openn = false; this.out = true; }
    if (state.Move_return4 === true) { this.out = false; this.play_Return = true; }
    if (state.Move_return5 === true) { this.stan = false; this.play_Return = false; this.Animation_outdash = false; }

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login");
      return;
    }
      
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

  reloads() {
    this.loadSuppliers();
    this.isLoading = true; 
  }   

  Animationa2_out(){ this.out = false; this.Animation_outdash = true; this.inhere = true; this.play_Return = false; setTimeout(() =>{ this.router.navigate(['/inventory'],{ state:{username: this.username , email: this.email, Move_return:true,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa3_out(){ this.out = false; this.Animation_outdash = true; this.inhere = true; this.play_Return = false; setTimeout(() =>{ this.router.navigate(['/sale'],{ state:{username: this.username , email: this.email, Move_return:true,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa4_out(){ this.out = false; this.Animation_outdash = true; this.inhere = true; this.play_Return = false; setTimeout(() =>{ this.router.navigate(['/history'],{ state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa5_out(){ this.out = false; this.Animation_outdash = true; this.inhere = true; this.play_Return = false; setTimeout(() =>{ this.router.navigate(['/employee'],{ state:{username: this.username , email: this.email, Move_returnout:true ,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa6_out(){ this.out = false; this.Animation_outdash = true; this.inhere = true; this.play_Return = false; setTimeout(() =>{ this.router.navigate(['/audit'],{ state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa_out1(){ setTimeout(() =>{ this.router.navigate(['/pos'],{ state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile} }) } ,300) }
  Animationa_out(){ this.Animation_outdash = true; setTimeout(() =>{ this.router.navigate(['/dashboard'],{ state:{username: this.username , email: this.email, Move_return:true ,Dont_animation: true ,role:this.userRole ,profile:this.profile} }) } ,300) }
  
  openpopupnoti(message:string){ this.showpopupnoti = true; this.popup = message; }
  closepopup(){ this.showpopup = false; this.showpopupnoti = false; this.router.navigate(['/login']); }
  ngOnDestroy() { this.timeSubscription?.unsubscribe(); }
loadSuppliers() {
  this.loader = true;
  
  forkJoin({
    suppliers: this.todoService.getSuppliers(),
    orders: this.todoService.getSaleOrders(),
    inventory: this.todoService.getInventory() // 1. ดึงข้อมูล Inventory เพิ่ม
  }).subscribe({
    next: (res: any) => {
      const allOrders = Array.isArray(res.orders) ? res.orders : (res.orders.data || []);
      const completedOrders = allOrders.filter((order: any) => order.status === 'Completed');

      this.suppliers = res.suppliers.map((supplier: any) => {
        
        const supplierOrders = completedOrders.filter((order: any) => {
          // 2. ค้นหา brand จาก Inventory โดยใช้ product_name
          const invItem = res.inventory.find((inv: any) => inv.product_name === order.product_name);
          const brandName = invItem?.brand || order.brand; // ถ้าไม่เจอใน Inventory ให้ใช้ brand เดิมจาก order

          if (!brandName) return false;
          
          // 3. เทียบ brand กับ supplier_name
          return String(brandName).toLowerCase() === String(supplier.supplier_name).toLowerCase();
        });
        
        return {
          ...supplier,
          order_history: supplierOrders.length
        };
      });
      this.filterSuppliers();
      this.isLoading = false; 
      this.loader = false;
    },
    error: (err) => { 
      console.error('Error fetching data:', err); 
      this.loader = false; 
    }
  });
}

  selectedStatus: string = 'Active';
  filteredSuppliers: any[] = [];
 filterSuppliers() {
    this.filteredSuppliers = this.suppliers.filter(supplier => {
      // Default to 'Active' if status is undefined
      const status = supplier.status || 'Active'; 
      return status === this.selectedStatus;
    });
  }
  toggleMenu() { this.out = false; this.isMenuOpen = !this.isMenuOpen; this.isMenuOpenprofile = !this.isMenuOpenprofile; }
  hambar(){ this.isMenuOpen = !this.isMenuOpen; }
  setView(view: string) { this.currentView = view; }
  filterS() { this.filteredItems = this.items.filter(item => item.toLowerCase().includes(this.search.toLowerCase()) ); }

  logout() {
    const now = new Date();
    const auditData = { date: now.toISOString().split('T')[0], time: now.toTimeString().split(' ')[0], username: this.username, email: this.email, activity: 'Logout', role: this.userRole, picture: this.profile };
    this.todoService.logAudit(auditData).subscribe({
      next: () => { console.log('Logout audit saved'); this.router.navigate(['/login']); },
      error: (err) => { console.error('Failed to save logout audit', err); this.router.navigate(['/login']); }
    });
  }

  button_imports() {
    this.outimport = false;
    this.button_importt = true;
  }

  saveSupplier() {
  this.isLoading = true; // เปิด Loading
  
  this.todoService.addSupplier(this.newSupplier).subscribe({
    next: (res) => {
      console.log('Supplier saved successfully:', res);
      this.loadSuppliers(); // โหลดข้อมูลในตารางใหม่
      this.button_cancels(); // ปิดหน้าต่างฟอร์ม
      this.isLoading = false; // ปิด Loading
    },
    error: (err) => {
      console.error('Error saving supplier:', err);
      this.isLoading = false;
      // สามารถเพิ่ม openpopupnoti('บันทึกไม่สำเร็จ') ตรงนี้ได้
    }
  });
}
    button_edits(supplier: any) {
    this.selectedSupplier = { ...supplier }; // คัดลอกข้อมูลมาเพื่อไม่ให้กระทบกับตารางหลัก
    this.imagePreview = supplier.logo || null;
    this.outimport = false;
    this.button_edit = true;
  }

  // --- ฟังก์ชันบันทึกการแก้ไข ---
  updateSupplier() {
    this.isLoading = true;
    this.todoService.updateSupplier(this.selectedSupplier.id, this.selectedSupplier).subscribe({
      next: (res) => {
        console.log('Supplier updated successfully:', res);
        this.loadSuppliers();
        this.button_cancels();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error updating supplier:', err);
        this.isLoading = false;
      }
    });
  }
  // --- ส่วนที่เพิ่มเข้ามาใหม่ (ฟังก์ชันสำหรับฟอร์ม) ---
  button_cancels() {
    this.outimport = true;
    setTimeout(() => {
      this.button_importt = false;
      this.outimport = false;
       this.button_edit = false;
      this.imagePreview = null;
    }, 400);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => { this.imagePreview = reader.result as string; };
      reader.readAsDataURL(file);
    }
  }

  onUrlChange(url: string) {
    this.imagePreview = (url && url.trim() !== '') ? url : null;
  }
  toggleSupplierStatus(supplier: any) {
    // กำหนดสถานะใหม่ (สมมติว่าเปลี่ยนเป็น 'Canceled' หรือ 'Inactive')
    const newStatus = supplier.status === 'Active' ? 'Canceled' : 'Active';
    
    this.isLoading = true;

    // อัปเดตข้อมูล
    const updatedData = { ...supplier, status: newStatus };

    this.todoService.updateSupplier(supplier.id, updatedData).subscribe({
      next: (res) => {
        console.log(`Supplier status changed to ${newStatus}`);
        
        // อัปเดตค่าใน UI ทันที
        supplier.status = newStatus;
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.isLoading = false;
        this.openpopupnoti('ไม่สามารถเปลี่ยนสถานะได้ กรุณาลองใหม่อีกครั้ง');
      }
    });
  }





  showCancelPopup = false;
  supplierToCancel: any = null;
  popupMessage = '';

  // 1. Open Popup when clicking the delete button
  openCancelPopup(supplier: any) {
    this.supplierToCancel = supplier;
    this.popupMessage = `Are you sure you want to cancel the supplier ${supplier.supplier_name}?`;
    this.showCancelPopup = true;
  }

  closeCancelPopup() {
    this.showCancelPopup = false;
    this.supplierToCancel = null;
  }

  confirmCancel() {
    if (!this.supplierToCancel) return;

    this.isLoading = true;

    const updatedData = { ...this.supplierToCancel, status: 'Canceled' };

    this.todoService.updateSupplier(this.supplierToCancel.id, updatedData).subscribe({
      next: (res) => {
        console.log('Supplier canceled successfully');
        this.supplierToCancel.status = 'Canceled'; // Update UI
                this.filterSuppliers();
        this.isLoading = false;
        this.closeCancelPopup();
      },
      error: (err) => {
        console.error('Error canceling supplier:', err);
        this.isLoading = false;
        this.closeCancelPopup();
        this.openpopupnoti('Unable to cancel. Please try again.');
      }
    });
  }
}