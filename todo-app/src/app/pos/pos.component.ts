import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, inject , ElementRef, ViewChild  } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TodoService } from '../services/todo.service'; // นำเข้า TodoService
import promptpay from 'promptpay-qr';
import * as QRCode from 'qrcode';
interface Category {
  label: string;
  count: number;
  icon: string;
}

interface Product {
  id: string;
  category: string;
  name: string;
  stock: number;
  price: number;
  image: string;
   brand?: string;          // <-- เพิ่มตรงนี้
  quantity_alert?: number; 
}

interface CartItem extends Product {
  quantity: number;
  batchNo: string;
}

type HeaderPanel = 'account' | null;
type MainView = 'pos' | 'notifications' | 'help' | 'profile' | 'profile-edit';

@Component({
  selector: 'app-pos-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PosComponent implements OnInit, OnDestroy {
      @ViewChild('categoryRow') categoryRow!: ElementRef;
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private todoService = inject(TodoService); // เรียกใช้ TodoService
  private clockTimer?: ReturnType<typeof setInterval>;

  profile = '';
  username = '';
  role = '';
   product = true;
  navItems = [
    { label: 'Pos' },
    { label: 'Sales Orders' },
    { label: 'Employee' }
  ];
    outimport = false;
  paymentOptions = ['Choose', 'Cash', 'QR'];
  insuranceOptions = ['Choose', 'Standard', 'Premium'];
  isClosing = false;
  helpSearch = '';
  helpIssueType = 'Select';
  avatarLinkInput = '';

  categories: Category[] = [];
  products: Product[] = [];
  email = '';
  userRole = '';
  searchTerm = '';
  selectedCategory = 'All Categories';
  selectedPayment = 'Choose';
  selectedInsurance = 'Choose';
  discountUnit: '%' | '$' = '%';
  discount = 0;
  orderCode = '0';
  cartItems: CartItem[] = [];
  selectedNav = 'Pos';
  isNavOpen = false;
  isRightPanelOpen = true;
  openPanel: HeaderPanel = null;
  currentView: MainView = 'pos';
  clock = new Date();
  notification: any[] = [];
play_Return = false;
  Animation_out = false;
    
  storePhone: string = ''; 
  ngOnInit(): void {
     this.loadNotifications();
      this.loadStoreSettings();
    const navigation = this.router.lastSuccessfulNavigation;
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || 'user'; // เพิ่มเติม: รับค่า role (ค่าเริ่มต้นเป็น user)
    this.profile = state.profile || '';
    if (state || state.inhere) {
      this.profile = state.profile || '';
      this.username = state.username || '';
      this.userRole = state.role || '';
    }
        if (state.Move_return6 === true) {
      this.play_Return = true;
    }
    // เริ่มการทำงานของนาฬิกา
    this.clockTimer = setInterval(() => {
      this.clock = new Date();
      this.changeDetector.markForCheck();
    }, 1000);

    this.loadInventory();
  }
  loadStoreSettings(): void {
    this.todoService.getSettings().subscribe({
      next: (settings) => {
        if (settings && settings.phone) {
          // ลบขีดหรือช่องว่างออก เพื่อให้ PromptPay ใช้งานได้ถูกต้อง
          this.storePhone = settings.phone.replace(/[-\s]/g, ''); 
        }
         if (settings.address) {
            this.storeAddress = settings.address; // <-- เพิ่มการดึงข้อมูลที่อยู่ตรงนี้
          }
      },
      error: (err) => console.error('Error loading store settings:', err)
    });
  }
  loadInventory(): void {
    // ดึงข้อมูลจาก TodoService
    this.todoService.getInventory().subscribe({
      next: (res) => {
        this.products = res.map(item => ({
          id: item.sku,
          category: item.category,
          name: item.product_name,
          stock: item.quantity,
          price: item.price,
          image: item.picture,
          brand: item.brand,                   // <-- เพิ่มการดึง Brand
          quantity_alert: item.quantity_alert 
        })) || [];

        this.generateCategories(this.products);
        this.changeDetector.markForCheck();
      },
      error: (err) => console.error('Error loading inventory:', err)
    });
  }

  generateCategories(products: Product[]): void {
    const categoryMap = new Map<string, { count: number, firstImage: string }>();

    products.forEach(p => {
      if (!categoryMap.has(p.category)) {
        // ถ้ายังไม่มีหมวดหมู่นี้ ให้บันทึกรูปภาพของสินค้าชิ้นแรกไว้
        categoryMap.set(p.category, { count: 1, firstImage: p.image });
      } else {
        // ถ้ามีแล้ว ให้นับจำนวนเพิ่ม
        const data = categoryMap.get(p.category)!;
        data.count += 1;
      }
    });

    this.categories = [
      // หมวดหมู่ All ใช้รูป Black.svg
      { label: 'All Categories', count: products.length, icon: 'image/Black.svg' },

      // หมวดหมู่อื่นๆ ดึงรูปจากสินค้าชิ้นแรก
      ...Array.from(categoryMap.entries()).map(([label, data]) => ({
        label,
        count: data.count,
        icon: data.firstImage || 'image/Black.svg' // ถ้าไม่มีรูปให้ใช้ Black.svg แทน
      }))
    ];
  }

  get filteredProducts(): Product[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.products.filter((product) => {
      const categoryMatches = this.selectedCategory === 'All Categories' || product.category === this.selectedCategory;
      const queryMatches = !query || `${product.name} ${product.category}`.toLowerCase().includes(query);
      return categoryMatches && queryMatches;
    });
  }

  get filteredInventory() {
    return this.filteredProducts.map(product => ({
      sku: product.id,
      product_name: product.name,
      picture: product.image,
      quantity: product.stock,
      category: product.category,
      brand: 'N/A',
      price: product.price,
      quantity_alert: 10
    }));
  }

  get itemCount(): number { return this.cartItems.length; }
  get subtotal(): number { return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0); }

  get discountAmount(): number {
    const value = Number(this.discount) || 0;
    if (value <= 0) return 0;
    if (this.discountUnit === '%') return (this.subtotal * Math.min(value, 100)) / 100;
    return Math.min(value, this.subtotal);
  }

  get total(): number { return Math.max(0, this.subtotal - this.discountAmount); }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isNavOpen && window.innerWidth > 900) {
      this.isNavOpen = false;
      this.changeDetector.markForCheck();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isNavOpen && !this.openPanel) return;
    this.isNavOpen = false;
    this.openPanel = null;
    this.changeDetector.markForCheck();
  }
   Animationa_out(){
    
  this.Animation_out = true;
  
    setTimeout(() =>{
      this.router.navigate(['/inventory'],{
        state:{username: this.username , email: this.email ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animationa_out1(){

    setTimeout(() =>{
      this.router.navigate(['/pos'],{
        state:{username: this.username , email: this.email, Move_return6:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out2(){
         this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/sale'],{
        state:{username: this.username , email: this.email, Move_return3:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out3(){
            this.Animation_out = true;
    setTimeout(() =>{
      this.router.navigate(['/history'],{
        state:{username: this.username , email: this.email, Move_returnH:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out4(){
        
    setTimeout(() =>{
      this.router.navigate(['/employee'],{
        state:{username: this.username , email: this.email, Move_return4:true ,role:this.userRole ,profile:this.profile }
      })
    } ,300)
  }
  Animation_out5(){
            
    setTimeout(() =>{
      this.router.navigate(['/suppliers'],{
        state:{username: this.username , email: this.email, Move_return5:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  Animation_out6(){
          
    setTimeout(() =>{
      this.router.navigate(['/audit'],{
        state:{username: this.username , email: this.email, Move_return6:true ,Dont_animation:true ,role:this.userRole ,profile:this.profile}
      })
    } ,300)
  }
  
  
  toggleNav(): void { this.isNavOpen = !this.isNavOpen; this.openPanel = null; }
  selectNav(label: string): void { if (label !== 'Pos') return; this.selectedNav = label; this.isNavOpen = false; this.currentView = 'pos'; }
  toggleAccountMenu(): void { this.openPanel = this.openPanel === 'account' ? null : 'account'; this.isNavOpen = false; }
  toggleFullScreen(): void { this.isRightPanelOpen = !this.isRightPanelOpen; this.openPanel = null; }
  closePanel() {
    this.isClosing = true; // สั่งให้เล่นอนิเมชั่น slideOut

    // รอ 300ms (0.3s) ให้อนิเมชั่นจบ แล้วค่อยลบ Element ออกจาก DOM
    setTimeout(() => {
      this.openPanel = null;
      this.isClosing = false;
    }, 300);
  }
  openHelp(){
    this.router.navigate(['helpp'],{
      state:{ username: this.username, email: this.email, role: this.userRole, profile: this.profile}
    })
  }
  openProfile() {
    this.router.navigate(['/profile'], {
      state: { username: this.username, email: this.email, Move_returns3: true, role: this.userRole, profile: this.profile }
    });

  }
  backToPos(): void { this.currentView = 'pos'; }
  startEditProfile(): void { this.avatarLinkInput = ''; this.currentView = 'profile-edit'; }
  cancelEditProfile(): void { this.currentView = 'profile'; }
  selectCategory(category: Category): void { this.selectedCategory = category.label; }

  scrollCategories(direction: 'left' | 'right'): void {
    const row = document.querySelector<HTMLElement>('.category-row');
    if (!row) return;
    const step = Math.max(180, Math.round(row.clientWidth * 0.6));
    row.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  }

  addToCart(product: Product): void {
    const item = this.cartItems.find((entry) => entry.id === product.id);
    if (item) item.quantity = Math.min(item.quantity + 1, product.stock);
    else this.cartItems = [...this.cartItems, { ...product, quantity: 1, batchNo: '' }];
  }

  changeQuantity(item: CartItem, change: number): void {
    const next = item.quantity + change;
    if (next <= 0) { this.removeFromCart(item); return; }
    item.quantity = Math.min(next, item.stock);
    this.changeDetector.markForCheck();
  }

  removeFromCart(item: CartItem): void {
    this.cartItems = this.cartItems.filter((entry) => entry.id !== item.id);
    this.changeDetector.markForCheck();
  }

  clearOrder(): void { this.cartItems = []; }

  resetOrder(): void {
    this.searchTerm = '';
    this.selectedCategory = 'All Categories';
    this.selectedPayment = 'Choose';
    this.selectedInsurance = 'Choose';
    this.discountUnit = '%';
    this.discount = 0;
    this.cartItems = [];
  }

  startTransaction(): void { this.resetOrder(); this.orderCode = String(Date.now()).slice(-6); }


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
  formatStock(stock: number): string { return stock < 10 ? `0${stock}` : `${stock}`; }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || amount === 0) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  openNotifications(): void {
    this.router.navigate(['/notification'],{
          state: { username: this.username, email: this.email, Move_returns3: true, role: this.userRole, profile: this.profile }
    });
  }
  showAccountMenu() {
    this.isClosing = false;
    this.openPanel = 'account';
  }
loadNotifications(): void {
    this.todoService.getNotifications().subscribe({
      next: (res: any) => {
        this.notification = Array.isArray(res) ? res : (res.data || []);
        this.changeDetector.markForCheck(); // สั่งให้ Angular อัปเดต UI
      },
      error: (err) => console.error('Error loading notifications:', err)
    });
  }


  // ฟังก์ชันเลื่อนไปทางซ้าย
  // รับ element เข้ามาตรงๆ จาก HTML
  scrollLeft(element: HTMLElement) {
    element.scrollBy({ left: -200, behavior: 'smooth' });
  }

  scrollRight(element: HTMLElement) {
    element.scrollBy({ left: 200, behavior: 'smooth' });
  }



// 1. เพิ่มตัวแปรควบคุมการแสดงผล
showQrModal = false;

closeQrModal(): void {
  this.outimport = true;
  setTimeout(() => {
    this.outimport = false;
    this.product = true;
    this.qrCodeUrl = ''; // <--- เพิ่มการล้างค่า QR Code
  }, 300);
}

qrCodeUrl: string = '';

// 2. แก้ไขฟังก์ชันให้เหลือเพียงอันเดียว
  generatePromptPayQR(amount: number) {
    if (!this.storePhone) {
      alert('Not found number in Settings');
      return;
    }

    const payload = promptpay(this.storePhone, { amount });
    
    QRCode.toDataURL(payload, (err, url) => {
      if (!err) {
        this.qrCodeUrl = url; 
        this.changeDetector.markForCheck();
      }
    });
  }



// 1. เพิ่มตัวแปรควบคุม Modal เงินสด
  showCashModal = false;

  // 2. แก้ไขฟังก์ชัน completePayment
   // แก้ไขฟังก์ชัน completePayment
  completePayment(): void {
    if (!this.cartItems.length) { 
      return alert('กรุณาเลือกสินค้าก่อนชำระเงิน'); 
    }
      this.orderCode = String(Date.now()).slice(-6);
    if (this.selectedPayment === 'QR') {
      this.product = false; // สั่งให้แสดง Modal (ตามโครงสร้าง CSS เดิมของคุณ)
      this.generatePromptPayQR(this.total); // สร้าง QR Code ตามยอดเงินรวม
      this.changeDetector.markForCheck();
    } else if (this.selectedPayment === 'Cash') {
      this.cashReceived = 0;   
      this.changeAmount = 0;  
      this.showCashModal = true;
      this.changeDetector.markForCheck();
    } else {
      alert('กรุณาเลือกวิธีการชำระเงิน');
    }
  }

  // 3. เพิ่มฟังก์ชันปิด Cash Modal
  closeCashModal(): void {
    this.outimport = true;
    setTimeout(() => {
      this.outimport = false;
      this.showCashModal = false;
      this.changeDetector.markForCheck();
    }, 300);
  }

 confirmCashPayment(): void {
    if (this.cashReceived < this.total) {
      return alert('No enough');
    }

    this.processOrder(); 
  }


  // 1. เพิ่มตัวแปรสำหรับคำนวณเงิน
  cashReceived: number = 0;
  changeAmount: number = 0;

  // 2. ฟังก์ชันคำนวณเงินทอน
  calculateChange(): void {
    if (this.cashReceived >= this.total) {
      this.changeAmount = this.cashReceived - this.total;
    } else {
      this.changeAmount = 0;
    }
    this.changeDetector.markForCheck();
  }


  storeAddress: string = '';


  paymentSuccess = false;
processOrder(): void {
    const orderCode = `#${this.orderCode}`;
    const now = new Date().toISOString();

  const addressArray = this.storeAddress 
      ? this.storeAddress.split(',').map(addr => addr.trim()) 
      : ['ไม่พบข้อมูลที่อยู่'];

    const receiptData = {
      companyName: 'Tam rai dee Company Limited (Head Office)',
         companyAddress: addressArray,
/*       companyAddress: ['123/45 Gayson Tower, 15th Floor,', 'Ratchadamri Road,', 'Lumpini, Pathum Wan, Bangkok 10330'], */
      taxId: '0105560000000',
      receiptNumber: `REC-${this.orderCode}`,
      orderCode: orderCode,
      cashier: this.username || 'พนักงานขาย',
      items: this.cartItems.map(item => ({
        skuOrName: item.name,
        quantity: item.quantity,
        unitPrice: this.formatCurrency(item.price),
        amount: this.formatCurrency(item.price * item.quantity)
      })),
      subtotal: this.formatCurrency(this.subtotal),
      productInsurancePremium: this.selectedInsurance,
      discount: this.formatCurrency(this.discountAmount),
      grandTotal: this.formatCurrency(this.total)
    };

    this.cartItems.forEach(item => {
      const itemAmount = item.price * item.quantity;
      const salesData = {
        order_code: orderCode,
        product_name: item.name,
        quantity: item.quantity,
        amount: itemAmount,
        picture: this.profile, 
        create_by: this.username,
        status: 'Completed',
        created_at: now
      };

      this.todoService.saveSalesOrder(salesData).subscribe();

      const newStock = item.stock - item.quantity;
      const updateData = {
        product_name: item.name,
        picture: item.image, 
        quantity: newStock,
        price: item.price,
        category: item.category,
        brand: item.brand || 'N/A',
        quantity_alert: item.quantity_alert || 10
      };
      this.todoService.updateInventoryStock(item.id, updateData).subscribe();
    });

    // เปลี่ยนสถานะให้แสดงข้อความ "ชำระเงินสำเร็จ"
    this.paymentSuccess = true;
    this.changeDetector.markForCheck();
    
    // ข้อมูลผู้ใช้ที่จะส่งไปหน้า Receipt และรับกลับมา
    const userData = {
      username: this.username,
      email: this.email,
      role: this.userRole,
      profile: this.profile
    };

    // รอ 1.5 วินาที เพื่อให้พนักงานเห็นข้อความ แล้วค่อยเด้งไปหน้าใบเสร็จ
    setTimeout(() => {
      this.paymentSuccess = false;
      this.showCashModal = false;
      
      this.router.navigate(['/receipt'], {
        state: { 
          receiptData: receiptData,
          userData: userData // <--- ส่งข้อมูลผู้ใช้แนบไปด้วย
        }
      });

      this.cartItems = [];
      this.loadInventory();
    }, 1500);
  }
}