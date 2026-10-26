
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, ChangeDetectorRef ,input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TodoService } from '../services/todo.service';
import { interval, Subscription } from 'rxjs';

type HeaderPanel = 'account' | null;
@Component({
  selector: 'app-dashboard',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {


private productsList: { name: string; count: number; image?: string }[] = [];
  private todoService = inject(TodoService);
    private changeDetector = inject(ChangeDetectorRef); 
    
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
summary: any = {
    todays_sale: 0,
    yearly_total_sales: 0,
    net_income: 0,
    products: 0
  };
    saleOrders: any[] = [];
  openpro = false;
  private timeSubscription!: Subscription;
  constructor(private router: Router) {}

  ngOnInit(): void {
       this.loadSuppliers();
        this.loadSummary(); 
       window.scrollTo({ top: 0, behavior: 'smooth' });
        this.loadTopProducts(); 
      this.loadChartData(); 
     this.loadSaleOrders(); 
this.loadTopProducts(); 
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
  onFilterChange(event: any) {
    const filterValue = event.target.value;

    console.log('Selected filter:', filterValue);
   
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

  calculateHeight(valueInBaht: number): number {
    const maxHeight = 300; 
    const scale = 0.004;    
    
    return Math.min(valueInBaht * scale, maxHeight);
  }
 loadTodos() {
  
  this.todoService.getTodoss().subscribe({
    next: (res) => {
      console.log("Todos Data:", res);
      
    
      const currentEmail = this.navigationState?.state?.email;

      if (currentEmail) {
    
        this.todos = res.filter(todo => todo.email === currentEmail);
      } else {
        this.todos = res;
      }
    },
    error: (err) => console.error(err)
  });
}
loadSaleOrders() {
  this.todoService.getSaleOrders().subscribe({
    next: (res) => {
            this.saleOrders = res.filter(order => order.status?.toLowerCase() === 'completed');
            this.processWeeklySales(this.saleOrders); 

      this.processSaleOrdersForChart(this.saleOrders);
 
      this.saleOrders = res.filter(order => {
        const status = order.status ? order.status.toLowerCase() : '';
        return status === 'completed'; 
      });
    },
    error: (err) => console.error('Error loading sale orders:', err)
  });
}
  loadChartData() {
    this.loader = true; 
    this.todoService.getMonth().subscribe({
      next: (res) => {
        this.data = res;
        this.months = res.map(item => item.month);
        this.loader = false; 
                this.loadSaleOrders(); 
      },
      error: (err) => {
        console.error(err);
        this.loader = false; 
      }
    });
  }

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

  toggleAccountMenu(): void { 
    this.openPanel = this.openPanel === 'account' ? null : 'account'; 
    this.isNavOpen = false; 
  }
 openProfile() {
    this.router.navigate(['/profile'], {
      state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile }
    });
  }

  openHelp() {

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

products() {
  return this.productsList;
}
loadTopProducts() {

  this.todoService.getHistory().subscribe({
    next: (history) => {
      this.todoService.getInventory().subscribe({
        next: (inventory) => {
          
      
          const inventoryMap: { [key: string]: string } = {};
          inventory.forEach(item => {
            if (item.product_name && item.picture) {
              inventoryMap[item.product_name] = item.picture;
            }
          });

          const productCount: { [key: string]: { name: string; count: number; image?: string } } = {};

          history.forEach(item => {
            const name = item.product_name; 

            if (name) {
              if (productCount[name]) {
                productCount[name].count += 1;
              } else {
          
                const imageUrl = inventoryMap[name] || item.picture;
                productCount[name] = { name: name, count: 1, image: imageUrl };
              }
            }
          });

          this.productsList = Object.values(productCount)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        }
      });
    },
    error: (err) => console.error('Error loading top products:', err)
  });
}
processSaleOrdersForChart(orders: any[]) {
  const salesByMonth: { [key: string]: number } = {};

  orders.forEach(order => {
  
    if (order.status && order.status.toLowerCase() === 'completed' && order.created_at) {
      
  
      const dateToUse = new Date(order.created_at);
      const monthName = dateToUse.toLocaleString('en-US', { month: 'short' }); 
      

      const amount = Number(order.amount) || 0;
      
      salesByMonth[monthName] = (salesByMonth[monthName] || 0) + amount;
    }
  });


  if (this.data && this.data.length > 0) {
    this.data = this.data.map(item => {
      const newTotal = salesByMonth[item.month] || 0;
      return { ...item, value: newTotal }; 
    });
  }
}

  weeklySalesData: { [key: string]: number } = {};

  processWeeklySales(orders: any[]) {
    this.weeklySalesData = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    orders.forEach(order => {
      if (order.status?.toLowerCase() === 'completed' && order.created_at) {
        const date = new Date(order.created_at);
        const dayName = days[date.getDay()];
        const hour = date.getHours();
        
  
        if (hour >= 10 && hour <= 17) {
          const key = `${dayName}-${hour}`;
          const amount = Number(order.amount) || 0;
          this.weeklySalesData[key] = (this.weeklySalesData[key] || 0) + amount;
        }
      }
    });
  }


  getHeatmapClass(day: string, slotIndex: number): string {
    const hour = 10 + slotIndex;
    const key = `${day}-${hour}`;
    const total = this.weeklySalesData[key] || 0;

    if (total > 50000) return 'heatmap__cell--3';
    if (total > 30000) return 'heatmap__cell--2';
    if (total > 10000) return 'heatmap__cell--1';
    return 'heatmap__cell--0';
  }



    printPage() {
    window.print();
  }

  private suppliersList: { name: string; early: number; onTime: number; late: number }[] = [];

  suppliers() {
    return this.suppliersList;
  }
  loadSuppliers() {
  this.todoService.getSaleOrders().subscribe({
    next: (orders) => {
      this.todoService.getInventory().subscribe({
        next: (inventory) => {
          const brandSales: { [key: string]: number } = {};

          orders.forEach((order: any) => {
            // เช็คสถานะแบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่
            if (order.status?.toLowerCase() === 'completed') {
              
              // ค้นหา Brand จาก Inventory โดยใช้ชื่อสินค้า
              const invItem = inventory.find((inv: any) => inv.product_name === order.product_name);
              const brand = invItem?.brand || order.brand;

              if (brand && brand !== '-' && brand.toLowerCase() !== 'n/a') {
                const qty = Number(order.quantity) || 0;
                brandSales[brand] = (brandSales[brand] || 0) + qty;
              }
            }
          });

          let topBrands = Object.keys(brandSales)
            .map(brand => ({ name: brand, totalQty: brandSales[brand] }))
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, 5);

          const maxQty = topBrands.length > 0 ? topBrands[0].totalQty : 1;

          this.suppliersList = topBrands.map(brand => {
            const percentage = Math.round((brand.totalQty / maxQty) * 100);
            return {
              name: brand.name,
              early: percentage,
              onTime: 0,
              late: 0
            };
          });

          console.log("Final Suppliers List:", this.suppliersList);
        }
      });
    },
    error: (err) => console.error('Error:', err)
  });
}


// 1. เพิ่มตัวแปรสำหรับ Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;

  // 2. เพิ่มฟังก์ชันดึงข้อมูลเฉพาะหน้าปัจจุบัน
  get paginatedSaleOrders() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.saleOrders.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // 3. เพิ่มฟังก์ชันคำนวณหน้าทั้งหมด
  get totalPages() {
    return Math.ceil(this.saleOrders.length / this.itemsPerPage);
  }

  // 4. ฟังก์ชันเปลี่ยนหน้า
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}