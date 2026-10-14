import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { TodoService } from '../services/todo.service';

declare var JitsiMeetExternalAPI: any;

interface FaqItem { title: string; subtitle: string; }
interface ChatMessage { 
  id: number; 
  sender: string; 
  message: string; 
  created_at: string; 
  is_read?: boolean; 
  profile?: string; 
  picture?: string;
  reply_to_id?: number;      // <--- เพิ่มบรรทัดนี้
  reply_message?: string;    // <--- เพิ่มบรรทัดนี้
  reply_sender?: string;     // <--- เพิ่มบรรทัดนี้
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

  @ViewChild('chatBody') private chatBody!: ElementRef;

  username = ''; email = ''; userRole = ''; profile = '';
  isTimeOpen = false; isNavOpen = false; isClosing = false;
  openPanel: HeaderPanel = null; currentTime = new Date();
  open = false;
  closed = false;
  private timeSubscription!: Subscription;
  private chatSubscription!: Subscription;

  readonly faqItems = signal<FaqItem[]>([]);
  readonly helpSearch = signal('');
  readonly helpIssueType = signal('Select');
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

    this.fetchChatHistory();
    this.chatSubscription = interval(3000).subscribe(() => {
      if (this.isChatOpen()) this.fetchChatHistory();
        this.checkTypingStatus();
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
    this.chatSubscription?.unsubscribe();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
  }
  
  onTyping() {
    this.todoService.sendTypingStatus(this.username, true).subscribe();
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.todoService.sendTypingStatus(this.username, false).subscribe();
    }, 3000);
  }
checkTypingStatus() {
    this.todoService.getTypingStatus(this.username).subscribe({
      next: (users: any) => {
        // Backend ส่งมาเป็น [{ username: "..." }] 
        // เราดึงเอาเฉพาะชื่อออกมาได้เลย
        const typing = users
          .map((u: any) => u.username)
          .filter((name: string) => name !== this.username); // กรองชื่อตัวเองออก
        
        this.typingUsers.set(typing);
        this.changeDetector.markForCheck();
      }
    });
  }
  toggleChat() {
   
    this.isChatOpen.set(!this.isChatOpen());
    if (this.isChatOpen()) {
      this.todoService.markChatAsRead(this.username).subscribe({
        next: () => {
          this.chatMessages.set(this.chatMessages().map(msg => ({ ...msg, is_read: true })));
          this.changeDetector.markForCheck();
        }
      });
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }
  toggleclosed() {
  this.closed = true; // เริ่มเล่นแอนิเมชัน
  setTimeout(() => {
    this.isChatOpen.set(false); // ปิดหน้าต่างเมื่อแอนิเมชันจบ
    this.closed = false; // รีเซ็ตค่า
    this.changeDetector.markForCheck();
  }, 1000); // <--- เปลี่ยนจาก 300 เป็น 1000 ให้ตรงกับ CSS 1s
}
  private limit = 10;
  private offset = 0;
  private hasMoreMessages = true;
  readonly isLoadingMore = signal(false); 
 fetchChatHistory(loadMore = false) {
  if (!this.hasMoreMessages && loadMore) return;

  // ถ้าโหลดเพิ่ม ให้ใช้ offset เท่ากับจำนวนข้อความทั้งหมดที่มีอยู่ตอนนี้
  const currentOffset = loadMore ? this.chatMessages().length : 0;

  this.todoService.getChatHistory(this.limit, currentOffset).subscribe({
    next: (data) => {
      if (data.length < this.limit && loadMore) {
        this.hasMoreMessages = false;
      }

      if (loadMore) {
        // กรองเอาเฉพาะข้อความที่ยังไม่มีในรายการ (ป้องกันการดึงซ้ำ)
        const existingIds = new Set(this.chatMessages().map(m => m.id));
        const newMessages = data.filter(m => !existingIds.has(m.id));
        
        if (newMessages.length > 0) {
          this.chatMessages.set([...newMessages, ...this.chatMessages()]);
        } else {
          this.hasMoreMessages = false; // ถ้าไม่มีข้อความใหม่เลย แปลว่าหมดแล้ว
        }
      } else {
        // กรณี Polling (ดึงข้อมูลปกติ)
        const existingIds = new Set(this.chatMessages().map(m => m.id));
        const newMessages = data.filter(m => !existingIds.has(m.id));
        
        if (newMessages.length > 0) {
          this.chatMessages.set([...this.chatMessages(), ...newMessages]);
        }
      }
      
      this.changeDetector.markForCheck();
    }
  });
}
  
  sendMessage() {
    if (!this.newMessage().trim()) return;
    this.todoService.sendChatMessage(this.username, this.newMessage()).subscribe({
      next: (response) => {
        this.chatMessages.set([...this.chatMessages(), { id: response.data?.id || Date.now(), sender: this.username, message: this.newMessage(), created_at: new Date().toISOString() }]);
        this.newMessage.set('');
        this.changeDetector.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  sendImageMessage(base64Image: string) {
    this.todoService.sendChatMessage(this.username, '[Image]', base64Image).subscribe({
      next: (response) => {
        this.chatMessages.set([...this.chatMessages(), { id: response.data?.id || Date.now(), sender: this.username, message: '[Image]', created_at: new Date().toISOString(), picture: response.data?.picture || base64Image }]);
        this.changeDetector.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  private scrollToBottom(): void {
    try { this.chatBody.nativeElement.scrollTop = this.chatBody.nativeElement.scrollHeight; } catch(err) { }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => this.sendImageMessage(e.target.result);
      reader.readAsDataURL(file);
    }
  }

  openPro() { this.isClosing = false; this.openPanel = 'account'; }
  toggleAccountMenu(): void { this.openPanel = this.openPanel === 'account' ? null : 'account'; this.isNavOpen = false; }
  closePanel() {
    this.isClosing = true;
    setTimeout(() => { this.openPanel = null; this.isClosing = false; this.changeDetector.markForCheck(); }, 300);
  }
  openProfile() { this.router.navigate(['/profile'], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile } }); }
  openHelp() { this.router.navigate(['/helpp'], { state: { username: this.username, email: this.email, role: this.userRole, profile: this.profile } }); this.closePanel(); }
  back() { this.location.back(); }

  startVideoCall() {
    if (typeof JitsiMeetExternalAPI === 'undefined') {
      alert('กำลังโหลดระบบวิดีโอคอล กรุณาลองใหม่อีกครั้งในไม่ช้า');
      return;
    }

    // สั่งเปิด Pop-up
    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'flex';

        const domain = 'meet.jit.si'; 
    const roomName = 'SupportRoom-' + Math.random().toString(36).substring(7);
    
    // ล้าง iframe เก่าก่อนสร้างใหม่
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: container,
      userInfo: { displayName: this.username },
      configOverwrite: { prejoinPageEnabled: false },
      interfaceConfigOverwrite: { filmStripOnly: false }
    };

    new JitsiMeetExternalAPI(domain, options);

        const callLink = `https://${domain}/${roomName}`;
    this.todoService.sendChatMessage(this.username, `📞 ฉันได้เริ่มวิดีโอคอลแล้ว เข้าร่วมได้ที่: ${callLink}`).subscribe({
      next: () => this.fetchChatHistory()
    });
  }
  // เพิ่มฟังก์ชันนี้ใน class HelppComponent
  extractLink(message: string): string {
    const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[0] : '#';
  }


  // เพิ่มตัวแปรนี้ใน Class
selectedImage: string | null = null;

// เพิ่มฟังก์ชันเหล่านี้
openImageModal(imageUrl: string) {
    this.selectedImage = imageUrl;
}

closeImageModal() {
    this.selectedImage = null;
}
onScroll() {
  const element = this.chatBody.nativeElement;
  if (element.scrollTop === 0 && this.hasMoreMessages) {
    const previousHeight = element.scrollHeight;
    
    this.fetchChatHistory(true); // โหลดข้อมูลเพิ่ม
    
    // ปรับตำแหน่ง Scroll ให้คงที่ ไม่เด้งไปบนสุด
    setTimeout(() => {
      element.scrollTop = element.scrollHeight - previousHeight;
    }, 100);
  }
}
readonly replyingTo = signal<ChatMessage | null>(null);

replyToMessage(chat: ChatMessage) {
  this.replyingTo.set(chat);
}

cancelReply() {
  this.replyingTo.set(null);
}
}