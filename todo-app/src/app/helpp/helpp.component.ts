import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { TodoService } from '../services/todo.service';

interface FaqItem {
  title: string;
  subtitle: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  created_at: string;
  is_read?: boolean;
    profile?: string;
    picture?: string;
    
}

type HeaderPanel = 'account' | null;

@Component({
  selector: 'app-help-page',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule, DatePipe],
  templateUrl: './helpp.component.html',
  styleUrl: './helpp.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelppComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private location = inject(Location);
  private todoService = inject(TodoService);

  // ใช้สำหรับอ้างอิงถึงกล่องข้อความเพื่อทำ Auto-scroll
  @ViewChild('chatBody') private chatBody!: ElementRef;

  // --- Navbar Variables ---
  username = '';
  email = '';
  userRole = '';
  profile = '';
  
  // --- Navbar UI & Time State ---
  isTimeOpen = false;
  isNavOpen = false;
  isClosing = false;
  openPanel: HeaderPanel = null;
  currentTime = new Date();
  private timeSubscription!: Subscription;
  private chatSubscription!: Subscription; // ตัวแปรสำหรับ Real-time

  // --- Help Page Signals ---
  readonly faqItems = signal<FaqItem[]>([]);
  readonly helpSearch = signal('');
  readonly helpIssueType = signal('Select');

  // --- Chat Signals ---
  readonly isChatOpen = signal(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly newMessage = signal('');
  readonly typingUsers = signal<string[]>([]);
private typingTimeout: any;
  ngOnInit(): void {
    const state = history.state;
    
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';
    this.profile = state.profile || '';

    this.fetchChatHistory();

    // ตั้งให้ดึงข้อมูลแชทใหม่ทุกๆ 3 วินาที (Real-time จำลอง)
    this.chatSubscription = interval(3000).subscribe(() => {
      if (this.isChatOpen()) {
        this.fetchChatHistory();
      }
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
    this.chatSubscription?.unsubscribe(); // ยกเลิกการดึงข้อมูลเมื่อปิดหน้า
  }
  
  onTyping() {
  this.todoService.sendTypingStatus(this.username, true).subscribe();
  
  clearTimeout(this.typingTimeout);
  this.typingTimeout = setTimeout(() => {
    this.todoService.sendTypingStatus(this.username, false).subscribe();
  }, 3000); // หยุดพิมพ์ถ้าไม่มีการกดปุ่มใน 3 วินาที
}
  // --- Chat Functions ---
  toggleChat() {
    this.isChatOpen.set(!this.isChatOpen());
    
    if (this.isChatOpen()) {
      // เมื่อเปิดแชท ให้ส่งสถานะว่าอ่านแล้วไปที่ Backend ทันที
      this.todoService.markChatAsRead(this.username).subscribe({
        next: () => {
          // อัปเดตสถานะ is_read ของข้อความในหน้าจอให้เป็น true
          const updatedMessages = this.chatMessages().map(msg => ({
            ...msg,
            is_read: true
          }));
          this.chatMessages.set(updatedMessages);
          this.changeDetector.markForCheck();
        },
        error: (err) => console.error('Error marking as read:', err)
      });

      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  fetchChatHistory() {
    this.todoService.getChatHistory().subscribe({
      next: (data) => {
        const isNewMessage = data.length > this.chatMessages().length;
        
        // อัปเดตข้อความลงใน UI
        this.chatMessages.set(data);
        this.changeDetector.markForCheck();
        
        // ถ้ามีข้อความใหม่ และหน้าต่างแชทเปิดอยู่
        if (isNewMessage) {
          if (this.isChatOpen()) {
            // ส่งสถานะไปบอก Backend ว่าอ่านข้อความใหม่แล้ว
            this.todoService.markChatAsRead(this.username).subscribe({
              next: () => {
                // อัปเดต UI ให้ทุกข้อความกลายเป็นอ่านแล้ว
                const updated = this.chatMessages().map(m => ({ ...m, is_read: true }));
                this.chatMessages.set(updated);
                this.changeDetector.markForCheck();
              }
            });
          }
          
          // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่
          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: (err) => console.error('Error fetching chat:', err)
    });
  }
  sendMessage() {
  if (!this.newMessage().trim()) return;

  this.todoService.sendChatMessage(this.username, this.newMessage()).subscribe({
    next: (response) => {
      const newMsg: ChatMessage = {
        id: response.data?.id || Date.now(),
        sender: this.username,
        message: this.newMessage(),
        created_at: new Date().toISOString(),
        profile: this.profile // <--- เพิ่มบรรทัดนี้
      };
      
      this.chatMessages.set([...this.chatMessages(), newMsg]);
      this.newMessage.set('');
      this.changeDetector.markForCheck();
      setTimeout(() => this.scrollToBottom(), 100);
    },
    error: (err) => console.error('Error sending message:', err)
  });
}

  // ฟังก์ชันเลื่อนลงล่างสุด
  private scrollToBottom(): void {
    try {
      this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight;
    } catch(err) { }
  }
  onFileSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64Image = e.target.result;
      
      // ส่งรูปภาพไปที่ Backend (คุณอาจจะต้องปรับฟังก์ชัน sendChatMessage ให้รองรับการส่งรูป)
      this.sendImageMessage(base64Image);
    };
    reader.readAsDataURL(file);
  }
}

sendImageMessage(base64Image: string) {
    this.todoService.sendChatMessage(this.username, '[Image]', base64Image).subscribe({
      next: (response) => {
        const newMsg: ChatMessage = {
          id: response.data?.id || Date.now(),
          sender: this.username,
          message: '[Image]',
          created_at: new Date().toISOString(),
          profile: this.profile,
          picture: base64Image // <--- อย่าลืมเพิ่ม picture ใน Interface ChatMessage ด้วย
        };
        
        this.chatMessages.set([...this.chatMessages(), newMsg]);
        this.changeDetector.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  // --- Navbar Functions ---
  openPro() { this.isClosing = false; this.openPanel = 'account'; }
  toggleAccountMenu(): void { this.openPanel = this.openPanel === 'account' ? null : 'account'; this.isNavOpen = false; }
  closePanel() {
    this.isClosing = true;
    setTimeout(() => { this.openPanel = null; this.isClosing = false; this.changeDetector.markForCheck(); }, 300);
  }
  openProfile() { this.router.navigate(['/profile'], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile } }); }
  openHelp() { this.router.navigate(['/helpp'], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile } }); this.closePanel(); }
  back() { this.location.back(); }
}