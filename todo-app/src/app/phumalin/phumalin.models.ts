/// PHUMALIN: ชนิดข้อมูลและค่าคงที่ของระบบวัตถุดิบ ร้านบน / ร้านล่าง (ไม่ใช้ร่วมกับหน้าเดิม)

export type PhumalinStore = 'upper' | 'lower';
export type PhumalinView = 'dashboard' | 'inventory' | 'pos';
export type PhumalinCategory = 'vegetable' | 'meat' | 'dry' | 'packaging';
export type PhumalinMovementType = 'in' | 'out' | 'adjust';

export interface PhumalinItem {
  id: number;
  store: PhumalinStore;
  name: string;
  unit: string;
  category: PhumalinCategory;
  quantity: number;
  note: string | null;
  picture?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PhumalinItemInput {
  name: string;
  unit: string;
  category: PhumalinCategory | '';
  quantity: number | null;
  note: string;
  picture: string;
}

export interface PhumalinMovement {
  id: number;
  store: PhumalinStore;
  item_id: number | null;
  item_name: string;
  unit: string | null;
  category: PhumalinCategory | null;
  type: PhumalinMovementType;
  quantity: number;
  balance: number | null;
  order_code: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PhumalinWithdrawResult {
  success: boolean;
  order_code: string;
  items: PhumalinItem[];
}

export const PHUMALIN_STORES: { id: PhumalinStore; label: string }[] = [
  { id: 'upper', label: 'ร้านบน' },
  { id: 'lower', label: 'ร้านล่าง' }
];

export const PHUMALIN_CATEGORIES: { id: PhumalinCategory; label: string; icon: string }[] = [
  { id: 'vegetable', label: 'ผัก', icon: 'phumalin/vegetable.svg' },
  { id: 'meat', label: 'เนื้อสัตว์', icon: 'phumalin/meat.svg' },
  { id: 'dry', label: 'ของแห้ง', icon: 'phumalin/dry.svg' },
  { id: 'packaging', label: 'บรรจุภัณฑ์', icon: 'phumalin/packaging.svg' }
];

export const PHUMALIN_ALL_ICON = 'phumalin/all.svg';

/// สิทธิ์ของแต่ละหน้า ให้ตรงกับหน้าเดิม (Dashboard / Inventory / POS) และ API /api/phumalin
export const PHUMALIN_VIEW_ROLES: Record<PhumalinView, string[]> = {
  dashboard: ['admin', 'manager'],
  inventory: ['admin', 'manager', 'backend'],
  pos: ['admin', 'manager', 'pos']
};

export function categoryLabel(id: string | null | undefined): string {
  return PHUMALIN_CATEGORIES.find((c) => c.id === id)?.label ?? '-';
}

export function categoryIcon(id: string | null | undefined): string {
  return PHUMALIN_CATEGORIES.find((c) => c.id === id)?.icon ?? PHUMALIN_ALL_ICON;
}

/// รูปของสินค้า: ใช้ลิงก์รูปที่ใส่ไว้ ถ้าไม่มีใช้ไอคอนของหมวด
export function itemImage(item: { picture?: string | null; category?: string | null } | null | undefined): string {
  const picture = item?.picture?.trim();
  return picture && /^https?:\/\//i.test(picture) ? picture : categoryIcon(item?.category);
}

/// รูปโหลดไม่ได้ (ลิงก์เสีย) -> เปลี่ยนเป็นไอคอนหมวดแทน
export function useCategoryIcon(event: Event, category: string | null | undefined): void {
  const img = event.target as HTMLImageElement;
  const icon = categoryIcon(category);
  if (!img.src.endsWith(icon)) img.src = icon;
}

export function storeLabel(id: PhumalinStore): string {
  return PHUMALIN_STORES.find((s) => s.id === id)?.label ?? id;
}

/// วันที่ภาษาไทย เช่น "6 พ.ย. 14:05"
export function thaiDateTime(value: string | Date): string {
  const date = new Date(value);
  const day = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${time}`;
}

/// แสดงจำนวนแบบไม่มีทศนิยมเกินจำเป็น เช่น 2 / 2.5 / 1,250
export function formatQty(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}
