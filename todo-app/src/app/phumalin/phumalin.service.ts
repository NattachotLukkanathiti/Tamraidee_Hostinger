import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PhumalinItem, PhumalinItemInput, PhumalinMovement, PhumalinStore, PhumalinWithdrawResult
} from './phumalin.models';

/// ///////////////////////////////////////////////////////////////////////////
/// PHUMALIN API (ฝั่งเว็บ) — เรียก /api/phumalin/:store/... ใน todo-api/src/routes/phumalin.routes.ts
/// แยกจาก TodoService เดิม เลิกใช้ก็ลบทั้งโฟลเดอร์ src/app/phumalin ได้เลย
/// JWT แนบให้อัตโนมัติจาก authInterceptor เดิม
/// ///////////////////////////////////////////////////////////////////////////
@Injectable({ providedIn: 'root' })
export class PhumalinService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/api/phumalin`;

  /// GET /api/phumalin/:store/items
  getItems(store: PhumalinStore): Observable<PhumalinItem[]> {
    return this.http.get<PhumalinItem[]>(`${this.base}/${store}/items`);
  }

  /// POST /api/phumalin/:store/items
  addItem(store: PhumalinStore, item: PhumalinItemInput): Observable<{ success: boolean; data: PhumalinItem }> {
    return this.http.post<{ success: boolean; data: PhumalinItem }>(`${this.base}/${store}/items`, item);
  }

  /// PUT /api/phumalin/:store/items/:id
  updateItem(store: PhumalinStore, id: number, item: PhumalinItemInput): Observable<{ success: boolean; data: PhumalinItem }> {
    return this.http.put<{ success: boolean; data: PhumalinItem }>(`${this.base}/${store}/items/${id}`, item);
  }

  /// DELETE /api/phumalin/:store/items/:id
  deleteItem(store: PhumalinStore, id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${store}/items/${id}`);
  }

  /// POST /api/phumalin/:store/items/:id/stock-in
  stockIn(store: PhumalinStore, id: number, quantity: number, note?: string): Observable<{ success: boolean; data: PhumalinItem }> {
    return this.http.post<{ success: boolean; data: PhumalinItem }>(`${this.base}/${store}/items/${id}/stock-in`, { quantity, note });
  }

  /// POST /api/phumalin/:store/restock (หน้า POS: เพิ่มสินค้าหลายรายการ)
  restock(store: PhumalinStore, items: { id: number; quantity: number }[], note?: string): Observable<PhumalinWithdrawResult> {
    return this.http.post<PhumalinWithdrawResult>(`${this.base}/${store}/restock`, { items, note });
  }

  /// POST /api/phumalin/:store/withdraw (ไม่ได้ใช้ในหน้าแล้ว เก็บไว้เผื่อใช้)
  withdraw(store: PhumalinStore, items: { id: number; quantity: number }[], note?: string): Observable<PhumalinWithdrawResult> {
    return this.http.post<PhumalinWithdrawResult>(`${this.base}/${store}/withdraw`, { items, note });
  }

  /// GET /api/phumalin/:store/movements
  getMovements(store: PhumalinStore, limit = 500): Observable<PhumalinMovement[]> {
    return this.http.get<PhumalinMovement[]>(`${this.base}/${store}/movements`, { params: { limit } });
  }
}
