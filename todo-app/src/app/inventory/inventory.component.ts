import { Component, OnInit, inject , ViewChild, ElementRef, HostListener ,NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';
import { createClient } from '@supabase/supabase-js';
import { create } from 'domain';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, DatePipe, RouterLink,FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.css'
})


export class InventoryComponent {
  itemsPerPage: number = 10; 
  currentPage: number = 1;
  totalPages: number = 1;
  pagesArray: number[] = [];

    rowHeight: number = 50; // ความสูงของแต่ละแถว (px)
  headerHeight: number = 250;
  // --- เพิ่มฟังก์ชันดักจับการ Resize ---
 @HostListener('window:resize', ['$event'])
  onResize(event: any) { // <-- เพิ่ม (event: any) ตรงนี้
    this.calculateRows();
  }

  calculateRows() {
    const availableHeight = window.innerHeight - this.headerHeight;
    // กำหนดให้แสดงอย่างน้อย 1 แถวเสมอ
    this.itemsPerPage = Math.max(1, Math.floor(availableHeight / this.rowHeight));
    this.updatePagination();
  }
  // ----------------------------------
  @ViewChild('fileInput') fileInput!: ElementRef; 
  private todoService = inject(TodoService);

  search = '';
  items: string[] = ['รายการที่ 1', 'รายการที่ 2', 'รายการที่ 3'];
  filteredItems: string[] = [...this.items];
 Number = Number; 
  data: any[] = [];
  months: string[] = [];
  profile = '';
  email = '';
  username = '';
  showpopup = false;
  popup = '';
  navigationState?: any;
  showpopupnoti = false;
  showpopupedit = false;
  isMenuOpen = false;
  isMenuOpenprofile = true;
  currentView = 'dashboard';
  currentTime = new Date();
  isTimeOpen = false;
  Animation_out = false;
  Animation_outdash = false;
  return = false;
  play_Return = false;
  out = false;
  stan = false;
  reload = false;
  Inventory: any[] = [];
  isLoading = false; 
  button_cancel = false;
  button_importt = false;
  product = true;
  product2 = true;
  todos: any[] = [];
  button_edit = false;
  button_addd = false;
    outimport = false;
    loader = true;
    userRole: string = '';
      newProduct = {
    sku: '',
    product_name: '',
    category: '',
    brand: '',
    price: null,
    quantity_alert: null,
    supplier: '',
    invoice_no: '',
    import_quantity: null,
    picture: ''
  };
  item: any;  
  showpopupconfirm = false
  selectedFile: File | null = null;
  isEditMode = false;
  outedit = false;
selectedProduct: any = {
  category: '',
  brand: '',
  price: null,
  quantity_alert: null
};
  originalProduct: any = null; 
  suppliers: any[] = [];
    selectedSupplier: string = 'all';
    filteredInventory: any[] = [];
  openpro = false;
    importData: any = {
    supplier: '',
    invoiceNo: '',
    importQuantity: null,
    invoiceFile: '',
      upload: ''
  };
  selectedCategory: string = 'all';
categories: string[] = [];
  //  เพิ่มบรรทัดนี้เข้าไปค่ะ
  imagePreview: string | null = null;
 // แก้ไขเป็นโปรเจกต์ใหม่
private supabaseUrl = 'https://iemqkiftkhyoalyqpjzj.supabase.co'; 
private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXFraWZ0a2h5b2FseXFwanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjExODMsImV4cCI6MjEwNzgzNzE4M30.zk_zlo7QSHuNlM943ikEfwS6eWWbRjTYlWEN94kxn7o';
  private supabase = createClient(this.supabaseUrl, this.supabaseKey);
  private timeSubscription!: Subscription;
  constructor(private router: Router, private ngZone: NgZone) {}

  ngOnInit(): void {
       window.scrollTo({ top: 0, behavior: 'smooth' });
    this.supabase
      .channel('realtime-inventory')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        console.log('ตรวจพบการเปลี่ยนแปลงข้อมูล:', payload);
        
        // 2. ใช้ ngZone.run เพื่อให้ Angular อัปเดต UI ทันที
        this.ngZone.run(() => {
          this.loadInventory(); 
        });
      })
      .subscribe();
    this.calculateRows();
    const state = history.state;
    
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user'; // เพิ่มเติม: รับค่า role (ค่าเริ่มต้นเป็น user)
    this.profile = state.profile || '';

    if (state.Move_return === true) {
      this.stan = false;
      this.play_Return = true;
      this.out = false;
    }

    if(!this.username || !this.email){
      this.openpopupnoti("Session not found. Redirecting to login")
      return;
    }
    this.loadInventory();
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });
    this.loadSuppliers(); 
    
  }

filterByCategory() {
  if (this.selectedCategory === 'all') {
    this.filteredInventory = [...this.Inventory];
  } else {
    this.filteredInventory = this.Inventory.filter(item => 
      item.category === this.selectedCategory
    );
  }
  this.currentPage = 1;
  this.updatePagination();
}
  filterBySupplier() {
    if (this.selectedSupplier === 'all') {
      this.filteredInventory = [...this.Inventory]; // ถ้าเลือก all ให้แสดงทั้งหมด
    } else {
      this.filteredInventory = this.Inventory.filter(item => 
        item.brand === this.selectedSupplier // ตรวจสอบว่าชื่อ supplier ตรงกันไหม
      );
    }
      this.updatePagination();
  }
  loadSuppliers() {
    // สมมติว่าใน todoService มีฟังก์ชัน getSuppliers()
    // ถ้ายังไม่มี ให้สร้างเพิ่มใน todoService ด้วยครับ
    this.todoService.getSuppliers().subscribe({
      next: (res) => {
        this.suppliers = res;
        
      },
      error: (err) => {
        console.error('Error fetching suppliers:', err);
      }
    });
  }
  // ฟังก์ชันเปลี่ยนหน้า
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // ฟังก์ชันดึงข้อมูลเฉพาะหน้าปัจจุบัน
  get paginatedInventory() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredInventory.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // ฟังก์ชันอัปเดตตัวเลขหน้า
  updatePagination() {
    this.totalPages = Math.ceil(this.filteredInventory.length / this.itemsPerPage);
    this.pagesArray = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
  }
  reloads() {
    this.loadInventory();
    this.isLoading = true; 
    
}   
  Animationa_out(){
    this.Animation_out = true;
    this.Animation_outdash = true;
    setTimeout(() =>{
      this.router.navigate(['/dashboard'],{
        state:{username: this.username , email: this.email, Move_return:true ,role:this.userRole,profile:this.profile }
      })
    } ,300)
  }
  Animationa_out2(){
      this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_returns:true, role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out3(){
      this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_returns3:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out4(){
      this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_returns4:true ,role:this.userRole ,profile:this.profile}
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
  Animationa_out6(){
              this.out = false;
    this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,Open_bar:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
    Animationa_out1(){
             this.Animation_out = true;      // สั่งให้เริ่มอนิเมชั่นหลัก
    this.Animation_outdash = true;  // <-- เพิ่มบรรทัดนี้ เพื่อบังคับให้ใช้คลาสที่เลื่อนไปทางซ้าย
    
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
  openpopup(message:string){
    this.showpopup = true;
    this.popup = message;
  }
  openpopup_confirm(message:string){
    this.popup = message;
  }
  openpopup_edit(message:string){
    this.showpopupedit = true;
    this.popup = message;
  }
  closepopup(){
    this.button_addd = false;
        this.resetForm();
        this.loadInventory();
       this.showpopup = false;
       this.showpopupnoti = false;
    this.showpopupconfirm = false;
         this.showpopupedit = false;
         this.outimport = true;
             this.button_importt = false;
    this.button_edit = false;
    
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
  if (!this.search || this.search.trim() === '') {
    this.filteredInventory = [...this.Inventory];
  } else {
    const searchTerm = this.search.toLowerCase().trim();
    
    this.filteredInventory = this.Inventory.filter(item => 
      (item.product_name && item.product_name.toLowerCase().includes(searchTerm)) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm)) ||
      (item.category && item.category.toLowerCase().includes(searchTerm)) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm))
    );
  }
  
  this.currentPage = 1;
  this.updatePagination();
}
  loadInventory() {
  this.todoService.getInventory().subscribe({
    next: (res) => {
   this.Inventory = res.reverse();
           this.updatePagination();
      this.Inventory = res.sort((a, b) => {
        // เรียงจากมากไปน้อย (ล่าสุดขึ้นก่อน)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
      this.filteredInventory = [...this.Inventory]; 
         this.updatePagination();
            this.categories = [...new Set(res.map(item => item.category).filter(cat => cat))];
      this.isLoading = false;
      this.loader = false;              
    },
    error: (err) => {
      console.error('Error fetching sale order:', err);
    }
  });
}
  button_cancels() {
      this.resetImportForm();
        this.resetForm() ;
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
    this.button_importt = false;
    this.button_addd = false;
    this.button_edit = false;
    this.button_cancel = false;
    this.outimport = false;
    this.imagePreview = null;
  }, 400);
}
  button_imports(){
        this.resetForm();
       this.outimport = false;
    this.button_importt = true;
    
  }
  button_adds(){
    this.button_addd = true;
  }


  // 3. ฟังก์ชันสำหรับล้างค่าฟอร์ม
 resetForm() {
    this.newProduct = {
      sku: '', product_name: '', category: '', brand: '', price: null,
      quantity_alert: null, supplier: '', invoice_no: '', import_quantity: null, picture: ''
    };
    this.imagePreview = null; // เพิ่มบรรทัดนี้เพื่อล้างรูปภาพตัวอย่าง
  }


  onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.selectedFile = file;
    
    // เคลียร์ค่า URL เดิมออก เพื่อให้ระบบรู้ว่ากำลังใช้ไฟล์ใหม่
    if (this.selectedProduct) {
      this.selectedProduct.picture = ''; 
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}


  async saveToStock() {
    this.isLoading = true;
     // 1. ดึงค่า Prefix จาก SKU ที่ผู้ใช้กรอก หรือจาก Category
    let prefix = '';
    
    if (this.newProduct.sku && this.newProduct.sku.trim() !== '') {
      // ถ้าผู้ใช้กรอก SKU มา (เช่น ELEC) ให้ใช้คำนั้นเป็น Prefix
      prefix = this.newProduct.sku.trim().toUpperCase();
    } else if (this.newProduct.category) {
      // ถ้าไม่ได้กรอก SKU ให้ใช้ Category แทน
      prefix = this.newProduct.category.trim().toUpperCase();
    } else {
      this.openpopupnoti('Please enter SKU or Category');
      this.isLoading = false;
      return;
    }

    // 2. สร้าง SKU ใหม่ (ถ้าผู้ใช้กรอกแค่ Prefix หรือไม่ได้กรอกเลย)
    if (!this.newProduct.sku || !this.newProduct.sku.includes('-')) {
      let maxNumber = 0;

      // หาตัวเลขสูงสุดของ Prefix นั้นๆ
      this.Inventory.forEach(item => {
        if (item.sku && item.sku.startsWith(prefix + '-')) {
          const parts = item.sku.split('-');
          if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      // เติม -001 ต่อท้าย
      const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
      this.newProduct.sku = `${prefix}-${nextNumber}`;
    }

    // 3. ตรวจสอบการซ้ำของ SKU
    const isDuplicate = this.Inventory.some(item => item.sku === this.newProduct.sku);

    if (isDuplicate) {
      this.openpopupnoti('Error: This SKU already exists in the system');
      this.isLoading = false;
      return; 
    }

    // ใช้ค่า URL ที่ผู้ใช้กรอกเข้ามาโดยตรง
  let pictureUrl = this.newProduct.picture || '';

  try {
    // 2. เพิ่มโค้ดส่วนนี้: ถ้าผู้ใช้เลือกไฟล์จากเครื่อง ให้อัปโหลดขึ้น Supabase ก่อน
    if (this.selectedFile) {
      const fileExt = this.selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('Photo')
        .upload(filePath, this.selectedFile);

      if (error) throw error;

      const { data: publicUrlData } = this.supabase.storage
        .from('Photo')
        .getPublicUrl(filePath);
              
      pictureUrl = publicUrlData.publicUrl; // นำ URL ที่ได้ไปใช้บันทึก
    }

    
      // เพิ่ม pictureUrl เข้าไปใน object ข้อมูล
      const productData = {
        ...this.newProduct,
        picture: pictureUrl,
         status: 'Approved',
        upload: this.importData.upload || '' 
      };
 this.todoService.addInventory(productData).subscribe({
        next: (res) => {
          this.openpopup('New product created successfully. View changes in Stock History');
          this.loadInventory();
          this.resetForm();
          const now = new Date();
         const historyData = {
  date: now.toISOString().split('T')[0],
  sku: productData.sku,
  product_name: productData.product_name,
  brand: productData.brand,
  price: productData.price,
  quantity: productData.import_quantity,
  created_by: this.username, // <--- แก้ตรงนี้
  picture: productData.picture,
  status: 'Approved'
};

          this.todoService.addHistory(historyData).subscribe({
            next: () => console.log('History saved successfully'),
            error: (err) => console.error('Failed to save history', err)
          });
          // 1. บันทึก Audit Log
          const auditData = {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            username: this.username,
            email: this.email,
            activity: `Import Product`,
            role: this.userRole,
            picture: this.profile
          };
          
          this.todoService.logAudit(auditData).subscribe({
            next: () => console.log('Audit saved'),
            error: (err) => console.error('Failed to save audit', err)
          });

          // 2. บันทึก Notification
          const productName = this.newProduct.product_name || this.newProduct.sku;
          const importQty = this.newProduct.import_quantity || 0;
             this.todoService.addNotification(
            `Stock Update : ${productName}`, // title
            `Import Product: ${productName} (+${importQty})`, // description (เพิ่มชื่อสินค้าและจำนวน)
            'success',                       // type
            'Just now'                       // time_ago
          ).subscribe({
            next: () => console.log('Notification saved'),
            error: (err) => console.error('Failed to save notification', err)
          });

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error adding inventory:', err);
          this.isLoading = false;
        }
      });

    } catch (error) {
      console.error('Error saving product:', error);
      this.openpopup('An error occurred while saving data');
      this.isLoading = false;
    }
  }

private resolveConfirm: ((value: boolean) => void) | null = null;

async button_delete(sku: string, index: number) {
    this.showpopupconfirm = true;
    this.openpopup_confirm("Are you sure you want to delete this item? This action cannot be undone.");

    const confirm = await new Promise<boolean>((resolve) => {
      this.resolveConfirm = resolve;
    });
  
    if (confirm) {
      this.isLoading = true;
      
      this.todoService.deleteInventory(sku).subscribe({
        next: (res) => {
          this.Inventory.splice(index, 1);
          this.openpopup('Product deleted successfully');
          this.isLoading = false;
          const now = new Date();
          const auditData = {
            date: now.toISOString().split('T')[0],
            time: now.toTimeString().split(' ')[0],
            username: this.username,
            email: this.email,
            activity: `Delete Inventory SKU: ${sku}`, 
            role: this.userRole,
            picture: this.profile
          };

          this.todoService.logAudit(auditData).subscribe({
            next: () => console.log('Delete audit saved'),
            error: (err) => console.error('Failed to save delete audit', err)
          });
        },
        error: (err) => {
          this.openpopupnoti('An error occurred while deleting the product');
          this.isLoading = false;
        }
      });
    }
}
  confirmdelete() {
    this.showpopupconfirm = false;
    if (this.resolveConfirm) this.resolveConfirm(true); 
}
button_editt(item: any) {
  this.outimport = false;
  this.button_edit = true;
  this.isEditMode = true;
  this.selectedProduct = { ...item }; 
  this.imagePreview = item.picture || null;
  this.originalProduct = { ...item };
}
async saveEdit() {
  this.isLoading = true;

  let pictureUrl = this.selectedProduct.picture; 

  try {
   
    if (this.selectedFile) {
      const fileExt = this.selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `inventory/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('Photo')
        .upload(filePath, this.selectedFile);

      if (error) throw error;

      const { data: publicUrlData } = this.supabase.storage
        .from('Photo')
        .getPublicUrl(filePath);
              
      pictureUrl = publicUrlData.publicUrl;
    }


    const updatedProduct = {
      ...this.selectedProduct,
      picture: pictureUrl 
    };
    

    this.todoService.updateInventory(updatedProduct.sku, updatedProduct).subscribe({
      next: (res) => {
        this.openpopup('Product updated successfully');
        
        const index = this.Inventory.findIndex(item => item.sku === updatedProduct.sku);
      
        if (index !== -1) {
          // อัปเดตข้อมูลในตารางทันที
          this.Inventory[index] = { ...updatedProduct };
        } else {
          this.loadInventory();
        }
        const changesObj = this.getChanges(this.originalProduct, updatedProduct);
        const changedKeys = Object.keys(changesObj).join(', ');

         const now = new Date();
          const auditData = {
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          username: this.username,
          email: this.email,
          activity: `Edit:(${changedKeys})`,
          product:  `${updatedProduct.product_name} `,
          role: this.userRole,
          picture: this.profile,
          changes: this.getChanges(this.originalProduct, updatedProduct) // <-- แก้ไขบรรทัดนี้
        };

        this.todoService.logAudit(auditData).subscribe({
          next: () => console.log('Audit saved'),
          error: (err) => console.error('Failed to save audit', err)
        });

        this.isEditMode = false;
        this.isLoading = false;
        this.selectedFile = null; 
      },
      error: (err) => {
        this.openpopupnoti('An error occurred while updating the product');
        this.isLoading = false;
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    this.openpopup('Image upload failed');
    this.isLoading = false;
  }
}
onUrlChange(url: string) {
  if (url && url.trim() !== '') {

    if (url.startsWith('http') || url.startsWith('https')) {
      this.imagePreview = url;
    }
  } else {
   
    this.imagePreview = this.selectedProduct.picture || null;
  }
}
editt(){
  this.outimport = true;
  setTimeout(() => {
    this.button_importt = false;
    this.button_addd = false;
    this.button_edit = false;
    this.button_cancel = false;
    this.outimport = false;
    this.imagePreview = null;
  }, 400);
  this.openpopup_edit('Are you sure you want to edit this product?');
}
getChanges(original: any, updated: any) {
    const changes: { [key: string]: { from: any; to: any } } = {};
    
    Object.keys(updated).forEach(key => {
   
      if (key !== 'updated_at' && original[key] !== updated[key]) {
        changes[key] = {
          from: original[key],
          to: updated[key]
        };
      }
    });
    
    return changes;
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
  createNotification(title: string, description: string, type: 'info' | 'warning' | 'success') {

    this.todoService.addNotification(
      title,
      description,
      type,
      'Just now'
    ).subscribe({
      next: () => console.log('Notification sent successfully'),
      error: (err) => console.error('Error sending notification', err)
    });
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
   generateSKU(category: string) {
  
    const prefix = category ? category.toUpperCase() : 'ITEM';
    let maxNumber = 0;

    this.Inventory.forEach(item => {
      if (item.sku && item.sku.startsWith(prefix + '-')) {
        const parts = item.sku.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxNumber) {
            maxNumber = num;
          }
        }
      }
    });

    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    this.newProduct.sku = `${prefix}-${nextNumber}`;
  }
  onCategoryChange() {

    if (this.newProduct.category && this.newProduct.category.length >= 3) {
      this.generateSKU(this.newProduct.category);
    }
  }
  onSkuChange() {
    if (this.selectedProduct && this.selectedProduct.sku) {

      const foundProduct = this.filteredInventory.find(item => item.sku === this.selectedProduct.sku);
      
      if (foundProduct) {

        this.selectedProduct = { ...foundProduct };
        this.imagePreview = foundProduct.picture || null;
      } else {
        this.openpopupnoti('SKU not found in the system');
        // รีเซ็ตข้อมูลถ้าไม่เจอ
        this.selectedProduct = { sku: this.selectedProduct.sku };
        this.imagePreview = null;
      }
    }
  }
// เปลี่ยนชื่อฟังก์ชันเป็น saveAddToStock
 saveAddToStock() {
    if (!this.selectedProduct.sku || !this.importData.supplier || !this.importData.importQuantity) {
      this.openpopupnoti('Please fill in all required fields (*)');
      return;
    }

    this.isLoading = true;

     const importPayload = {
    sku: this.selectedProduct.sku,
    product_name: this.selectedProduct.product_name,
    brand: this.selectedProduct.brand,
    price: this.selectedProduct.price,
    supplier: this.importData.supplier,
    invoiceNo: this.importData.invoiceNo,
    importQuantity: Number(this.importData.importQuantity),
      upload: this.importData.upload || '',
    quantity: Number(this.selectedProduct.quantity || 0) + Number(this.importData.importQuantity || 0)
  };


    this.todoService.updateInventory(importPayload.sku, importPayload).subscribe({
      next: (res) => {
        this.openpopup('Quantity added successfully');
        this.loadInventory();
        
        const now = new Date();
        
        const historyData = {
          date: now.toISOString().split('T')[0],
          sku: importPayload.sku,
          product_name: importPayload.product_name,
          brand: importPayload.brand,
          price: importPayload.price,
          quantity: this.importData.importQuantity,
          created_by: this.username, 
          picture: this.selectedProduct.picture || '' 
        };

        // --- เพิ่ม Console.log เพื่อเช็คข้อมูล History ---
        console.log('2. ข้อมูลที่จะบันทึกลง History (historyData):', historyData);
        console.log('====================================');

        this.todoService.addHistory(historyData).subscribe({
          next: () => console.log('History saved successfully'),
          error: (err) => console.error('Failed to save history', err)
        });

        const auditData = {
          date: now.toISOString().split('T')[0], 
          time: now.toTimeString().split(' ')[0],
          username: this.username,
          email: this.email,
          activity: `Add Quantity: ${importPayload.sku} (+${this.importData.importQuantity})`,
          role: this.userRole,
          picture: this.profile
        };
        
        this.todoService.logAudit(auditData).subscribe({
          next: () => console.log('Audit saved'),
          error: (err) => console.error('Failed to save audit', err)
        });

        this.resetImportForm();
        this.isLoading = false;
      },
      error: (err) => {
        this.openpopupnoti('An error occurred while saving data');
        this.isLoading = false;
      }
    });
  }
 
  saveImportToStock() {
    if (!this.selectedProduct.sku || !this.importData.supplier || !this.importData.importQuantity) {
      this.openpopupnoti('Please fill in all required fields (*)');
      return;
    }

    this.isLoading = true;


    const importPayload = {
      ...this.selectedProduct,
      ...this.importData,

       quantity: Number(this.selectedProduct.quantity || 0) + Number(this.importData.importQuantity || 0)
    };

    this.todoService.updateInventory(importPayload.sku, importPayload).subscribe({
      next: (res) => {
        this.openpopup('Import saved successfully');
        this.loadInventory();
        this.resetImportForm();
        this.isLoading = false;
      },
      error: (err) => {
        this.openpopupnoti('An error occurred while saving data');
        this.isLoading = false;
      }
    });
  }

  // 4. ฟังก์ชันล้างค่าฟอร์มนำเข้า
  resetImportForm() {
    this.importData = { supplier: '', invoiceNo: '', importQuantity: null, invoiceFile: '', upload: '' };
    this.selectedProduct = {};
    this.imagePreview = null;
  }



  // 1. เพิ่มตัวแปรนี้ใน Class
selectedStockFilter: string = 'all';

// 2. เพิ่มฟังก์ชันนี้เข้าไป
filterByStockStatus() {
  // เริ่มต้นโดยดึงข้อมูลทั้งหมดมาก่อน
  let baseList = [...this.Inventory];

  // กรองตามสถานะ Stock
  if (this.selectedStockFilter === 'low') {
    baseList = baseList.filter(item => Number(item.quantity) <= Number(item.quantity_alert));
  }

  // อัปเดตข้อมูลที่จะแสดงผล
  this.filteredInventory = baseList;
  this.currentPage = 1;
  this.updatePagination();
}


// เพิ่มฟังก์ชันนี้เข้าไปใน Class
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



triggerInvoiceUpload() {
  document.getElementById('invoiceUpload')?.click();
}
onInvoiceFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // ลดขนาดความกว้างสูงสุดเหลือ 500px (ช่วยลดขนาด Base64 ลงได้มาก)
        const maxWidth = 500; 
        const scaleSize = maxWidth / img.width;
        
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // ลดคุณภาพลงเหลือ 0.5 (50%)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          
          this.importData.upload = compressedBase64;
          this.importData.invoiceFile = 'File Selected';
          console.log('Compressed Base64 Length:', compressedBase64.length);
        }
      };
    };
    
    reader.readAsDataURL(file);
  }
}
triggerInvoiceUploadAdd() {
  document.getElementById('invoiceUploadAdd')?.click();
}
}
