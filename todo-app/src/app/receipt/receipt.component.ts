import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

/** One product line displayed in a receipt. Amounts are formatted by the API layer. */
export interface ReceiptLine {
  skuOrName: string;
  quantity: string | number;
  unitPrice: string | number;
  amount: string | number;
}

export interface ReceiptData {
  companyName: string;
  companyAddress: string[];
  taxId: string;
  receiptNumber: string;
  orderCode: string;
  cashier: string;
  items: ReceiptLine[];
  subtotal: string | number;
  productInsurancePremium: string | number;
  discount: string | number;
  grandTotal: string | number;
}

const RECEIPT_PLACEHOLDER: ReceiptData = {
  companyName: 'Tam rai dee Company Limited (Head Office)',
  companyAddress: ['123/45 Gayson Tower, 15th Floor,', 'Ratchadamri Road,', 'Lumpini, Pathum Wan, Bangkok 10330'],
  taxId: '',
  receiptNumber: '',
  orderCode: '',
  cashier: '',
  items: [
    { skuOrName: '', quantity: '', unitPrice: '', amount: '' },
    { skuOrName: '', quantity: '', unitPrice: '', amount: '' },
    { skuOrName: '', quantity: '', unitPrice: '', amount: '' }
  ],
  subtotal: '',
  productInsurancePremium: '',
  discount: '',
  grandTotal: ''
};

@Component({
  selector: 'app-receipt-page',
  standalone: true,
  templateUrl: './receipt.component.html',
  styleUrl: './receipt.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptComponent implements OnInit {
  private router = inject(Router);
  readonly openedAt = new Date();
  readonly receipt = signal<ReceiptData>(RECEIPT_PLACEHOLDER);
  
  private userData: any = null; // เก็บข้อมูลผู้ใช้ที่จะส่งกลับ

  ngOnInit(): void {
    const state = history.state;

    if (state && state.receiptData) {
      this.receipt.set(state.receiptData);
      this.userData = state.userData || null;

      setTimeout(() => {
        // สร้างตัวแปรเช็คสถานะ เพื่อไม่ให้เด้งกลับซ้ำสองรอบ
        let hasNavigated = false;

        const navigateBack = () => {
          if (!hasNavigated) {
            hasNavigated = true;
            this.goBackToPos();
          }
        };

        // วิธีที่ 1: ดักจับ event เมื่อหน้าต่างพิมพ์ปิดลง (รองรับเบราว์เซอร์ทั่วไป)
        window.onafterprint = navigateBack;

        // วิธีที่ 2: ดักจับเมื่อหน้าต่างหลักกลับมาได้รับ Focus (รองรับกรณีผู้ใช้กด Cancel)
        const onFocus = () => {
          window.removeEventListener('focus', onFocus);
          // หน่วงเวลาเล็กน้อยเพื่อให้แน่ใจว่า UI ของ Print ปิดสนิทแล้ว
          setTimeout(navigateBack, 300);
        };
        window.addEventListener('focus', onFocus);

        // สั่งเปิดหน้าต่างพิมพ์
        window.print();

      }, 500);

    } else {
      console.warn('No receipt data found, redirecting to POS...');
      this.goBackToPos();
    }
  }

  // ฟังก์ชันสำหรับย้อนกลับพร้อมแนบ State กลับไปด้วย
  private goBackToPos(): void {
    this.router.navigate(['/pos'], {
      state: this.userData ? {
        username: this.userData.username,
        email: this.userData.email,
        role: this.userData.role,
        profile: this.userData.profile
      } : {}
    });
  }

  formatOpenedAt(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear() + 543;
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    return `${day} / ${month} / ${year} ${hours}:${minutes}`;
  }
}