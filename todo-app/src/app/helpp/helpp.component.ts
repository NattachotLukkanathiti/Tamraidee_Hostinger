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
    // ใน ngOnInit()
this.chatSubscription = interval(3000).subscribe(() => {
  this.fetchChatHistory(); // <--- เอา if ออก
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
        // สั่งดึงข้อมูลใหม่ทันที เพื่อให้ได้สถานะ "Read" ล่าสุดจาก Backend มาแสดงผล
        this.fetchChatHistory(); 
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

    const currentOffset = loadMore ? this.chatMessages().length : 0;

    this.todoService.getChatHistory(this.limit, currentOffset).subscribe({
      next: (data) => {
        if (data.length < this.limit) this.hasMoreMessages = false;

        const existingIds = new Set(this.chatMessages().map(m => m.id));
        const newMessages = data.filter(m => !existingIds.has(m.id));

        if (newMessages.length > 0) {
          if (loadMore) {
            this.chatMessages.set([...newMessages, ...this.chatMessages()]);
          } else {
            // เพิ่มเฉพาะข้อความใหม่ต่อท้าย
            this.chatMessages.set([...this.chatMessages(), ...newMessages]);
          }
           const incomingMessages = newMessages.filter(m => m.sender !== this.username);
  if (incomingMessages.length > 0) {
    if (!this.isChatOpen()) {
      const lastMsg = incomingMessages[incomingMessages.length - 1];
      this.showDesktopNotification(
        `ข้อความใหม่จาก ${lastMsg.sender}`, 
        lastMsg.message
      );
    } else {
      this.todoService.markChatAsRead(this.username).subscribe();
    }
  }
          this.changeDetector.markForCheck();
        }
      }
    });
  }
  
  sendMessage() {
     const imageToSend = this.pendingImage();
      if (imageToSend) {
    this.sendImageMessage(imageToSend);
    this.pendingImage.set(null); // เคลียร์รูปภาพ
    return;
  }

  // ถ้าไม่มีรูปภาพ ให้ส่งข้อความตามปกติ
  if (!this.newMessage().trim()) return;
  
  if (!this.newMessage().trim()) return;
  
  const replyData = this.replyingTo();
  const replyId = replyData?.id || undefined; // <--- เปลี่ยนจาก null เป็น undefined

  this.todoService.sendChatMessage(this.username, this.newMessage(), undefined, replyId).subscribe({
    next: (response) => {
      this.chatMessages.set([...this.chatMessages(), { 
        id: response.data?.id || Date.now(), 
        sender: this.username, 
        message: this.newMessage(), 
        created_at: new Date().toISOString(),
        reply_to_id: replyId,                         
        reply_message: replyData?.message || undefined, 
        reply_sender: replyData?.sender || undefined    
      }]);
      
      this.newMessage.set('');
      this.replyingTo.set(null); 
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
    if (typeof JitsiMeetExternalAPI === 'undefined') return;

    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'flex';

    // เปลี่ยนจาก 8x8.vc เป็น meet.jit.si
    const domain = 'jitsi.riot.im';
    // สร้างชื่อห้องแบบสุ่ม
    const roomName = 'SupportRoom-' + Math.random().toString(36).substring(7);
    
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: container,
      userInfo: { 
        displayName: this.username,
        avatarURL: this.profile
      },
      configOverwrite: { 
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        requireDisplayName: false,
        disableDeepLinking: true,
        startWithVideoMuted: false,
        enableLobby: false 
      }
    };

    new JitsiMeetExternalAPI(domain, options);

    const callLink = `https://${domain}/${roomName}`;
    this.todoService.sendChatMessage(this.username, `📞 ฉันได้เริ่มวิดีโอคอลแล้ว เข้าร่วมได้ที่: ${callLink}`).subscribe({
      next: () => this.fetchChatHistory()
    });
  }

  startCall() {
    if (typeof JitsiMeetExternalAPI === 'undefined') return;

    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'flex';

    // เปลี่ยนจาก 8x8.vc เป็น meet.jit.si
    const domain = 'jitsi.riot.im';
    // สร้างชื่อห้องแบบสุ่ม
    const roomName = 'SupportRoom-' + Math.random().toString(36).substring(7);
    
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: container,
      userInfo: { 
        displayName: this.username,
        avatarURL: this.profile
      },
      configOverwrite: { 
        prejoinPageEnabled: false,
        prejoinConfig: { enabled: false },
        requireDisplayName: false,
        disableDeepLinking: true,
        startWithVideoMuted: false,
        enableLobby: false 
      }
    };

    new JitsiMeetExternalAPI(domain, options);

    const callLink = `https://${domain}/${roomName}`;
    this.todoService.sendChatMessage(this.username, `📞 ฉันได้เริ่มวิดีโอคอลแล้ว เข้าร่วมได้ที่: ${callLink}`).subscribe({
      next: () => this.fetchChatHistory()
    });
  }


  joinVideoCall(url: string) {
    if (url === '#') return;
    
    const domain = 'jitsi.riot.im'; 
    const roomName = url.split(domain + '/')[1]; 

    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'flex';

    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';

    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: container,
      userInfo: { 
        displayName: this.username,
        avatarURL: this.profile
      },
      // เพิ่ม configOverwrite เพื่อบังคับข้ามหน้าจอ
      configOverwrite: { 
        prejoinPageEnabled: false,
        requireDisplayName: false,
        disableDeepLinking: true,
        startWithVideoMuted: true
      },
      // เพิ่ม interfaceConfigOverwrite เพื่อซ่อนปุ่มและหน้าต่างที่ไม่จำเป็น
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_LOCAL_DISPLAY_NAME: this.username
      }
    };

    const api = new JitsiMeetExternalAPI(domain, options);

    // สั่งให้ตั้งชื่อและเข้าห้องทันทีเมื่อโหลดเสร็จ
    api.addEventListener('videoConferenceJoined', () => {
      api.executeCommand('displayName', this.username);
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
closeCall() {
  const modal = document.getElementById('video-call-modal');
  if (modal) modal.style.display = 'none';
  
  const container = document.querySelector('#jitsi-container');
  if (container) container.innerHTML = ''; // เคลียร์ iframe ออก
}

readonly pendingImage = signal<string | null>(null);

// แก้ไขฟังก์ชัน onPaste
onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            // เก็บรูปภาพไว้ในตัวแปรแทนการส่งทันที
            this.pendingImage.set(e.target.result);
            this.changeDetector.markForCheck();
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }
}
cancelImage() {
  this.pendingImage.set(null);
}
// ฟังก์ชันขอสิทธิ์และแสดงแจ้งเตือน
  showDesktopNotification(title: string, body: string) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: 'image/logo.svg' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: 'image/logo.svg' });
        }
      });
    }
  }
}