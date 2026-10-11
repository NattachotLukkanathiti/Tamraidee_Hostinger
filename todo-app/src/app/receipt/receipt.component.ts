
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

  ngOnInit(): void {
    // ดึงข้อมูลที่ส่งมาจากหน้า POS
    const state = history.state;
    if (state && state.receiptData) {
      this.receipt.set(state.receiptData);
    } else {
      // ถ้าไม่มีข้อมูล (เช่น เปิดหน้านี้ตรงๆ) อาจจะให้ย้อนกลับไปหน้า POS
      console.warn('No receipt data found, redirecting to POS...');
      // this.router.navigate(['/pos']);
    }
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