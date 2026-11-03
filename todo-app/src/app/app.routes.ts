import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotComponent } from './forgot/forgot.component';
import { OtpComponent } from './otp/otp.component';   
import { DashboardComponent } from './dashboard/dashboard.component';
import { InventoryComponent } from './inventory/inventory.component';
import { ResetComponent } from './reset/reset.component';
import { SaleComponent } from './sale/sale.component';
import { HistoryComponent } from './history/history.component';
import { EmployeeComponent } from './employee/employee.component';
import { SuppliersComponent } from './suppliers/suppliers.component';
import { ConfirmemployeeComponent } from './confirmemployee/confirmemployee.component';
import { PosComponent } from './pos/pos.component';
import { AuditComponent } from './audit/audit.component';
import { NotificationComponent } from './notification/notification.component';
import { ProfileComponent } from './profile/profile.component';
import { HelppComponent } from './helpp/helpp.component';
import { EditComponent } from './edit/edit.component';
import { SettingsPageComponent } from './setting/setting.component';
import { ReceiptComponent } from './receipt/receipt.component';
import { PrivacyPolicyComponent } from './privacy-policy/privacy-policy.component';
import { DeleteDataComponent } from './delete-data/delete-data.component';
import { ShopComponent } from './shop/shop.component';
import { authGuard } from './services/auth.guard';


const ADMIN = ['admin', 'manager'];
const STAFF = [...ADMIN, 'pos', 'backend']; // คนอื่นเข้าได้เฉพาะหน้าร้าน

export const routes: Routes = [
  { path: '', component: ShopComponent }, // หน้าแรกของเว็บ = หน้าร้าน (เข้าได้เลยไม่ต้อง login)
  { path: 'register', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot', component: ForgotComponent },
  { path: 'otp', component: OtpComponent},
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { roles: ADMIN } },
  { path: 'inventory', component: InventoryComponent, canActivate: [authGuard], data: { roles: [...ADMIN, 'backend'] } },
  { path: 'reset', component: ResetComponent},
  { path: 'step', component: OtpComponent, data: { mode: 'forget' } },
  { path: 'sale', component: SaleComponent, canActivate: [authGuard], data: { roles: [...ADMIN, 'pos'] } },
  { path : 'history', component: HistoryComponent, canActivate: [authGuard], data: { roles: [...ADMIN, 'backend'] } },
  { path: 'employee', component: EmployeeComponent, canActivate: [authGuard], data: { roles: ADMIN } },
  { path: 'suppliers', component: SuppliersComponent, canActivate: [authGuard], data: { roles: ADMIN } },
  { path: 'confirmemployee', component: ConfirmemployeeComponent},
  { path: 'pos' , component: PosComponent, canActivate: [authGuard], data: { roles: [...ADMIN, 'pos'] } },
  { path: 'audit' ,component: AuditComponent, canActivate: [authGuard], data: { roles: ADMIN } },
  { path: 'notification', component: NotificationComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'helpp', component: HelppComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'edit' , component: EditComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'setting' , component: SettingsPageComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'receipt' , component: ReceiptComponent, canActivate: [authGuard], data: { roles: STAFF } },
  { path: 'privacy-policy' ,component:PrivacyPolicyComponent},
  { path: 'delete-data' ,component:DeleteDataComponent},
  // หน้าร้านสำหรับลูกค้า ไม่ต้อง login
  { path: 'shop', component: ShopComponent },
  { path: 'shop/:sku', component: ShopComponent }
];