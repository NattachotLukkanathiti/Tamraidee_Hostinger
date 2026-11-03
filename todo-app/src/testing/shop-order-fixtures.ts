import { ShopOrder } from '../app/services/todo.service';

// ออเดอร์หน้าร้านตัวอย่างสำหรับ unit test
export function shopOrder(overrides: Partial<ShopOrder> = {}): ShopOrder {
  return {
    id: 7,
    order_code: 'WEB-000007',
    customer_name: 'สมชาย',
    phone: '0812345678',
    address: 'กรุงเทพฯ',
    note: null,
    items: [{ sku: 'A1', product_name: 'Apple', price: 25.5, quantity: 2 }],
    total: 51,
    status: 'Awaiting Payment',
    created_at: '2026-11-04T10:00:00Z',
    has_slip: false,
    slip_uploaded_at: null,
    reject_reason: null,
    reviewed_by: null,
    reviewed_at: null,
    ...overrides
  };
}
