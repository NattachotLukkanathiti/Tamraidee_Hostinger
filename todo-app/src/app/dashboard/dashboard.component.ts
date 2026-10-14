
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
  
  readonly suppliers = input<{ name: string; early: number; onTime: number; late: number }[]>([]);
// เปลี่ยนจาก quantity เป็น count
private productsList: { name: string; count: number; image?: string }[] = [];
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
    // เรียกใช้ Service โดยส่ง filterValue ไปดึงข้อมูลชุดใหม่
    console.log('Selected filter:', filterValue);
    // this.todoService.getSaleOrdersByFilter(filterValue).subscribe(...);
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
 loadTodos() {
  
  this.todoService.getTodoss().subscribe({
    next: (res) => {
      console.log("Todos Data:", res);
      
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
loadSaleOrders() {
  this.todoService.getSaleOrders().subscribe({
    next: (res) => {
            this.saleOrders = res.filter(order => order.status?.toLowerCase() === 'completed');
      
      // เรียกใช้ฟังก์ชันประมวลผลข้อมูลสำหรับกราฟ
      this.processSaleOrdersForChart(this.saleOrders);
      // กรองเอาเฉพาะสถานะ Completed (หรือเอา filter ออกถ้าต้องการแสดงทั้งหมด)
      this.saleOrders = res.filter(order => {
        const status = order.status ? order.status.toLowerCase() : '';
        return status === 'completed'; 
      });
    },
    error: (err) => console.error('Error loading sale orders:', err)
  });
}
  loadChartData() {
    this.loader = true; // Set to true before fetching data
    this.todoService.getMonth().subscribe({
      next: (res) => {
        this.data = res;
        this.months = res.map(item => item.month);
        this.loader = false; // Set to false once data is ready
                this.loadSaleOrders(); 
      },
      error: (err) => {
        console.error(err);
        this.loader = false; // Also set to false on error
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
    // ปิด Sidebar หากอยู่ที่หน้า Help อยู่แล้ว หรือจะสั่ง reload ก็ได้
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
  // 1. ดึงข้อมูลทั้ง History และ Inventory พร้อมกัน
  this.todoService.getHistory().subscribe({
    next: (history) => {
      this.todoService.getInventory().subscribe({
        next: (inventory) => {
          
          // 2. สร้าง Map สำหรับค้นหารูปภาพจาก Inventory โดยใช้ชื่อสินค้าเป็น Key
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
                // 3. ดึงรูปภาพจาก Inventory ถ้าไม่มีให้ใช้รูปจาก History (ถ้ามี)
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
    // ตรวจสอบสถานะ Completed และต้องมี created_at
    if (order.status && order.status.toLowerCase() === 'completed' && order.created_at) {
      
      // ใช้ created_at ในการดึงเดือน
      const dateToUse = new Date(order.created_at);
      const monthName = dateToUse.toLocaleString('en-US', { month: 'short' }); 
      
      // ใช้คอลัมน์ amount
      const amount = Number(order.amount) || 0;
      
      salesByMonth[monthName] = (salesByMonth[monthName] || 0) + amount;
    }
  });

  // อัปเดตข้อมูลลงในกราฟ
  if (this.data && this.data.length > 0) {
    this.data = this.data.map(item => {
      const newTotal = salesByMonth[item.month] || 0;
      return { ...item, value: newTotal }; 
    });
  }
}

}