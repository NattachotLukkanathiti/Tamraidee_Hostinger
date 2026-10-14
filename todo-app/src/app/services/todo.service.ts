import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Todo {
  id: number;
  title: string;
  password: string;
  completed: boolean;
}
// ประกาศและ Export Interface ที่นี่
export interface ChatMessage { 
  id: number; 
  sender: string; 
  message: string; 
  created_at: string; 
  is_read?: boolean; 
  profile?: string; 
  picture?: string; 
  
}
@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private http = inject(HttpClient);

  private apiUrl = 'https://api.tamraidee.tech/api';

  private headers = new HttpHeaders({
    'ngrok-skip-browser-warning': 'true'
  });

  logAudit(auditData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/audit`, auditData, { headers: this.headers });
  }

  getAudit() {
    return this.http.get<any[]>(`${this.apiUrl}/audit`, { headers: this.headers });
  }

  getTodos() {
    return this.http.get<Todo[]>(`${this.apiUrl}/todos`, { headers: this.headers });
  }

  addTodo(username: string, title: string, password: string, confirmPassword: string) {
    return this.http.post<Todo>(
      `${this.apiUrl}/todos`,
      { username, title, confirmPassword, password, completed: false },
      { headers: this.headers }
    );
  }

  updateTodo(todo: Todo) {
    return this.http.put<Todo>(
      `${this.apiUrl}/todos/${todo.id}`,
      { completed: todo.completed },
      { headers: this.headers }
    );
  }

  deleteTodo(id: number) {
    return this.http.delete(`${this.apiUrl}/todos/${id}`, { headers: this.headers });
  }

  login(title: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/login`, { title, password }, { headers: this.headers });
  }

  verifyOtp(title: string, otp: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/verify-otp`, { title, otp }, { headers: this.headers });
  }

  sendOtp(title: string) {
    return this.http.post(`${this.apiUrl}/request-otp`, { title }, { headers: this.headers });
  }

  getMonth() {
    return this.http.get<any[]>(`${this.apiUrl}/months`, { headers: this.headers });
  }

  resetPassword(title: string, password: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/reset-password`, { title, password }, { headers: this.headers });
  }

  getSaleOrders() {
    return this.http.get<any[]>(`${this.apiUrl}/sale_order`, { headers: this.headers });
  }

  getInventory() {
    return this.http.get<any[]>(`${this.apiUrl}/inventory`, { headers: this.headers });
  }

  getHistory() {
    return this.http.get<any[]>(`${this.apiUrl}/history`, { headers: this.headers });
  }

  getEmployee() {
    return this.http.get<any[]>(`${this.apiUrl}/employee`, { headers: this.headers });
  }

  getTodoss() {
    return this.http.get<any[]>(`${this.apiUrl}/todos`, { headers: this.headers });
  }

  getSuppliers() {
    return this.http.get<any[]>(`${this.apiUrl}/suppliers`, { headers: this.headers });
  }

  addInventory(productData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/inventory`, productData, { headers: this.headers });
  }

  deleteInventory(sku: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/inventory/${sku}`);
  }

  updateInventory(sku: string, productData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/inventory/${sku}`, productData, { headers: this.headers });
  }

  updateEmployee(username: string, employeeData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/employee/${username}`, employeeData, { headers: this.headers });
  }

  getSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/summary`, { headers: this.headers });
  }

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inventory`, { headers: this.headers });
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/categories`, { headers: this.headers });
  }

  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notification`, { headers: this.headers });
  }

  addNotification(title: string, description: string, type: string, timeAgo: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/notification`,
      { title, description, type, time_ago: timeAgo },
      { headers: this.headers }
    );
  }

  updateProfile(id: number, profileData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/todos/${id}`, profileData, { headers: this.headers });
  }

  getLastSku(): Observable<{ lastSku: string }> {
    return this.http.get<{ lastSku: string }>(`${this.apiUrl}/inventory/last-sku`, { headers: this.headers });
  }

  addSupplier(supplierData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/suppliers`, supplierData, { headers: this.headers });
  }

  addHistory(historyData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/history`, historyData, { headers: this.headers });
  }

  updateSupplier(id: number, supplierData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/suppliers/${id}`, supplierData, { headers: this.headers });
  }

  saveSalesOrder(orderData: any) {
    return this.http.post(`${this.apiUrl}/sale_order`, orderData, { headers: this.headers });
  }

  updateInventoryStock(sku: string, productData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/inventory/${sku}`, productData, { headers: this.headers });
  }

  updateSaleOrderStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/sale_order/${id}`, { status: status }, { headers: this.headers });
  }

  addRequestHistory(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/request_history`, data, { headers: this.headers });
  }

  getRequestHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/request_history`, { headers: this.headers });
  }

  getRequestHistoryById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/request_history/${id}`, { headers: this.headers });
  }

  updateRequestStatus(id: number, data: { status: string, admin_note?: string }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/request_history/${id}`, data, { headers: this.headers });
  }

  updateHistoryStatusBySku(sku: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/history/status/${sku}`, { status }, { headers: this.headers });
  }

  updateNotificationStatus(id: number, data: { read_by: string[] }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/notification/${id}`, data, { headers: this.headers });
  }

  updateNotificationReadStatus(id: number, readStatus: number) {
    return this.http.put(`${this.apiUrl}/notifications/${id}`, { read: readStatus }, { headers: this.headers });
  }

  getNotificationStatus(username: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notification_status/${username}`, { headers: this.headers });
  }

  markNotificationAsRead(notificationId: number, username: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/notification_status`,
      { notification_id: notificationId, username: username },
      { headers: this.headers }
    );
  }
   getChatHistory(limit: number, offset: number) {
  return this.http.get<ChatMessage[]>(`${this.apiUrl}/chat?limit=${limit}&offset=${offset}`, { headers: this.headers });
}

  // เพิ่ม picture?: string เข้าไปเป็นตัวที่ 3
  sendChatMessage(sender: string, message: string, picture?: string, profile?: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/chat`, 
      { sender, message, picture, profile }, // <--- เพิ่ม profile ตรงนี้
      { headers: this.headers }
    );
  }

  // --- Chat Typing & Read Status ---

  // ส่งสถานะกำลังพิมพ์
  sendTypingStatus(username: string, isTyping: boolean): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/chat/typing`, 
      { username, is_typing: isTyping }, 
      { 
        headers: this.headers,
        responseType: 'text' as 'json' // <--- เพิ่มบรรทัดนี้เพื่อแก้ปัญหา Error "OK" is not valid JSON
      }
    );
  }
  // ดึงสถานะคนอื่นที่กำลังพิมพ์
  getTypingStatus(username: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/chat/typing/${username}`, 
      { headers: this.headers }
    );
  }

  // อัปเดตสถานะว่าอ่านข้อความแล้ว
  markChatAsRead(username: string): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}/chat/read`, 
      { username }, 
      { headers: this.headers }
    );
  }
}