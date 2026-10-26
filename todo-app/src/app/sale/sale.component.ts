
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-sale',
  imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './sale.component.html',
  styleUrl: './sale.component.css'
})
export class SaleComponent {
   button_cancel = false;
  button_importt = false;
    button_edit = false;
    button_detail = false;
    button_request = false;
        outimport = false;
        product2 = true;
           selectedProduct: any = {}; 

groupedSaleOrders: any[] = [];
 itemsPerPage: number = 10; 
  currentPage: number = 1;
  totalPages: number = 1;
  pagesArray: number[] = [];
  saleOrders: any[] = []; 
  filteredSaleOrders: any[] = []; // <-- เพิ่มบรรทัดนี้
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

  reload = false;
  isLoading = false; 
  loader = false;
  Animation_outdash = false;
  return = false;
  profile = '';
  play_Return = false;
   userRole: string = '';
  
  private timeSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {
       window.scrollTo({ top: 0, behavior: 'smooth' });
    this.loadSupplierBrands();
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
   

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
    return;
    }

      this.loadSaleOrders(); 
      this.todoService.getSaleOrders().subscribe({
    next: (res) => { // <--- ตรวจสอบว่ามี (res) ตรงนี้
      this.saleOrders = res;
      
      // เรียกใช้ฟังก์ชันจัดกลุ่มข้อมูล
      this.groupOrdersByCode(res); 
      
      this.isLoading = false; 
      this.loader = false;
    },
    error: (err) => {
      console.error('Error fetching sale order:', err);
      this.loader = false;
    }
  });
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
  }

 

  // ฟังก์ชันอัปเดตตัวเลขหน้า
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredSaleOrders.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }
  reloads() {
  this.loadSaleOrders();
    this.isLoading = true; 
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
    this.Animation_out = true;

    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_return44:true , role:this.userRole ,profile:this.profile}
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
  Animation_out6(){
              this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,Open_bar:true ,role:this.userRole ,profile:this.profile}
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
    Animationa_out1(){
            this.Animation_outdash = true;

    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
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
  // ปรับชื่อและค่า scale ให้เหมาะกับความสูงของกราฟ
  calculateHeight(valueInBaht: number): number {
    const maxHeight = 300; // ความสูงสูงสุดที่ยอมรับได้ (px)
    const scale = 0.004;    // อัตราส่วนย่อขยาย (ปรับตามความเหมาะสมของข้อมูล)
    
    return Math.min(valueInBaht * scale, maxHeight);
  }

  loadSaleOrders() {
  this.loader = true;
  this.todoService.getSaleOrders().subscribe({
    next: (res) => {
      this.saleOrders = res;
      
      // จัดกลุ่มข้อมูลทุกครั้งที่โหลด เพื่อป้องกันการแสดงผลซ้ำ
      this.groupOrdersByCode(res); 
      
      this.isLoading = false; 
      this.loader = false;
    },
    error: (err) => {
      console.error('Error fetching sale order:', err);
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
  openPro(){
    this.isMenuOpenprofile = !this.isMenuOpenprofile;
  }
    // เพิ่มตัวแปรสำหรับสำรองข้อมูล
originalProductState: any = {};

opencancel(order: any) {
  this.product2 = true;
  this.outimport = false;
  this.button_edit = true; 
  // สำรองข้อมูลเดิมไว้ก่อนการแก้ไข
  this.originalProductState = { ...order };
  
  this.selectedProduct = { 
    ...order, 
    cancel_reason: order.cancel_reason || '' 
  };
  

}

opendetail(order: any) {
  this.button_cancel = false;
  // สำรองข้อมูลเดิมไว้ก่อนการแก้ไข
  this.originalProductState = { ...order };
  
  this.selectedProduct = { 
    ...order, 
    cancel_reason: order.cancel_reason || '' 
  };
  
  this.outimport = false;
  this.product2 = false;
}


button_cancels() {
  // คืนค่าข้อมูลกลับไปเป็นเหมือนเดิม
  this.selectedProduct = { ...this.originalProductState };
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
  this.outimport = true;
  setTimeout(() => {
        this.product2 = true;
    this.button_edit = false;
    this.button_detail = false;
      this.outimport = false;
  }, 400);
}
confirmCancel() {
  const orderCode = this.selectedProduct.order_code;
  
  // ดึงรายการสินค้าทั้งหมดที่อยู่ในบิลเดียวกัน
  const itemsToCancel = this.selectedProduct.items || [this.selectedProduct];

  // ดึงข้อมูล Inventory ทั้งหมดมาก่อน เพื่อใช้ในการอัปเดตสต็อก
  this.todoService.getInventory().subscribe(inventory => {
    
    itemsToCancel.forEach((item: any) => {
      // 1. อัปเดตสถานะของแต่ละรายการในฐานข้อมูลเป็น 'Canceled'
      this.todoService.updateSaleOrderStatus(item.id, 'Canceled').subscribe();

      // 2. คืนสต็อกสินค้า
      const product = inventory.find(p => p.product_name === item.product_name);
      if (product) {
        const currentQty = Number(product.quantity) || 0;
        const qtyToReturn = Number(item.quantity) || 1;
        const newQty = currentQty + qtyToReturn;

        const updateData = {
          product_name: product.product_name,
          picture: product.picture,
          quantity: newQty,
          price: product.price,
          category: product.category,
          brand: product.brand || 'N/A',
          quantity_alert: product.quantity_alert || 10
        };

        this.todoService.updateInventoryStock(product.sku, updateData).subscribe();
      }
    });

    // อัปเดตสถานะบนหน้าจอ
    this.selectedProduct.status = 'Canceled';
    this.outimport = true;
      this.loadSaleOrders(); 
    setTimeout(() => { 
      this.product2 = true; 
      this.loadSaleOrders(); // โหลดข้อมูลใหม่ทั้งหมด
    }, 400);
  });
}
groupOrdersByCode(orders: any[]) {
  this.todoService.getInventory().subscribe(inventory => {
    const map = new Map<string, any>();

    orders.forEach(order => {
      const invItem = inventory.find(p => p.product_name === order.product_name);
      
      const enrichedOrder = {
        ...order,
        sku: invItem?.sku || '-',
        brand: invItem?.brand || '-',
        product_picture: invItem?.picture || 'image/default_product.svg', // <--- เปลี่ยนเป็น product_picture
        price: invItem?.price || (order.amount / order.quantity)
      };

      if (map.has(order.order_code)) {
        const existing = map.get(order.order_code);
        existing.amount += (Number(order.amount) || 0);
        existing.items.push(enrichedOrder);
      } else {
        map.set(order.order_code, {
          ...enrichedOrder,
          amount: Number(order.amount) || 0,
          items: [enrichedOrder]
        });
      }
    });

    this.groupedSaleOrders = Array.from(map.values());
    this.filteredSaleOrders = [...this.groupedSaleOrders];
    this.updatePagination();
  });
}
// ฟังก์ชันเปลี่ยนหน้า
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ฟังก์ชันดึงข้อมูลเฉพาะหน้าปัจจุบัน
  get paginatedSaleOrders() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSaleOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }



  // ---> เพิ่มฟังก์ชันนี้เข้าไปเพื่อให้เหมือน Inventory <---
  get visiblePages(): number[] {
    const blockSize = 3; // กำหนดให้แสดงทีละ 3 หน้า
    const currentBlock = Math.floor((this.currentPage - 1) / blockSize);
    const startPage = (currentBlock * blockSize) + 1;
    const endPage = Math.min(startPage + blockSize - 1, this.totalPages);

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }



  // 1. เพิ่มตัวแปรสำหรับเก็บค่าตัวกรอง
selectedDateRange: string = 'all';
selectedBrand: string = 'all';
selectedCategory: string = 'all';
  supplierBrands: string[] = [];

// 2. เพิ่มฟังก์ชันกรองข้อมูล
filterSales() {
  const now = new Date();

  this.filteredSaleOrders = this.saleOrders.filter(order => {
    // --- กรองตามวันที่ (Date Range) ---
    let matchDate = true;
    if (this.selectedDateRange !== 'all') {
      const orderDate = new Date(order.created_at);
      const diffTime = now.getTime() - orderDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (this.selectedDateRange === '7' && diffDays > 7) matchDate = false;
      if (this.selectedDateRange === '30' && diffDays > 30) matchDate = false;
    }

    // --- กรองตาม Brand (เช็คจาก Items ด้านใน) ---
    let matchBrand = true;
    if (this.selectedBrand !== 'all') {
      // ตรวจสอบว่าใน order นั้นมีสินค้าที่ตรงกับ Brand ที่เลือกหรือไม่
      matchBrand = order.items && order.items.some((item: any) => item.brand === this.selectedBrand);
    }

    // --- กรองตาม Category ---
    let matchCategory = true;
    if (this.selectedCategory !== 'all') {
      matchCategory = order.items && order.items.some((item: any) => item.category === this.selectedCategory);
    }

    return matchDate && matchBrand && matchCategory;
  });

  // รีเซ็ตหน้ากลับไปหน้าแรก และอัปเดต Pagination
  this.currentPage = 1;
  this.updatePagination(); 
}
loadSupplierBrands() {
    // สมมติว่าใน todoService ของคุณมีฟังก์ชัน getSuppliers() 
    // ถ้าไม่มี ให้สร้างเพิ่มใน service โดยดึงจากตาราง suppliers ครับ
    this.todoService.getSuppliers().subscribe({
      next: (suppliers) => {
        // ดึงเฉพาะชื่อ brand หรือ name ของ supplier ออกมา
        // ใช้ Set เพื่อป้องกันกรณีมีชื่อซ้ำ
        const brands = new Set<string>();
        suppliers.forEach((sup: any) => {
          // เปลี่ยน 'brand_name' เป็นชื่อคอลัมน์จริงในตาราง suppliers ของคุณ (เช่น name, supplier_name)
          if (sup.brand_name) { 
            brands.add(sup.brand_name);
          }
        });
        this.supplierBrands = Array.from(brands);
      },
      error: (err) => console.error('Error fetching suppliers:', err)
    });
  }

}
