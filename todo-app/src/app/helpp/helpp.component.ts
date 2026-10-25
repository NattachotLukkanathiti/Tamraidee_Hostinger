import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { TodoService } from '../services/todo.service';
import { createClient } from '@supabase/supabase-js';
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
  reply_to_id?: number;
  reply_message?: string;
  reply_sender?: string;
  reply_picture?: string;
  
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

private supabaseUrl = 'https://iemqkiftkhyoalyqpjzj.supabase.co'; 
private supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXFraWZ0a2h5b2FseXFwanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjExODMsImV4cCI6MjEwNzgzNzE4M30.zk_zlo7QSHuNlM943ikEfwS6eWWbRjTYlWEN94kxn7o';
private supabase = createClient(this.supabaseUrl, this.supabaseKey);
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
  // จากเดิม: status = '';
readonly status = signal<string>('active');
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

  // 1. เพิ่มตัวแปร isLoading เพื่อเช็คสถานะการโหลด
  readonly isLoading = signal(true); 

  ngOnInit(): void {
    
           window.scrollTo({ top: 0, behavior: 'smooth' });
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';
    this.todoService.getTodoss().subscribe({
  next: (users) => {
    // เปลี่ยนจาก u.title เป็น u.username
    const currentUser = users.find(u => u.username === this.username); 
    
    if (currentUser && currentUser.status) {
      this.status.set(currentUser.status);
    }
  }
});
      if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
  
    this.fetchChatHistory();
     this.setupRealtime(); 
/*    this.chatSubscription = interval(3000).subscribe(() => {
      // เพิ่มการเช็ค document.hidden ตรงนี้
      if (!document.hidden) {
        this.fetchChatHistory(); 
        this.checkTypingStatus();
        
        if (this.isChatOpen()) {
          this.todoService.markChatAsRead(this.username).subscribe({
            next: () => {
              this.chatMessages.update(messages => 
                messages.map(m => m.sender !== this.username ? { ...m, is_read: true } : m)
              );
              this.changeDetector.markForCheck();
            }
          });
        }
      }
    }); */
    
    if (this.isChatOpen()) {
      this.todoService.markChatAsRead(this.username).subscribe({
        next: () => {
          this.chatMessages.update(messages => 
            messages.map(m => ({ ...m, is_read: true }))
          );
          this.changeDetector.markForCheck();
        }
      });
    }
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
    }, 1000);
  }

  checkTypingStatus() {
    this.todoService.getTypingStatus(this.username).subscribe({
      next: (users: any) => {
        const typing = users
          .map((u: any) => u.username)
          .filter((name: string) => name !== this.username);
        
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
          this.fetchChatHistory(); 
          this.changeDetector.markForCheck();
        }
      });
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  toggleclosed() {
    this.closed = true;
    setTimeout(() => {
      this.isChatOpen.set(false);
      this.closed = false;
      this.changeDetector.markForCheck();
    }, 1000);
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
      this.isLoading.set(false);
      if (data.length < this.limit) this.hasMoreMessages = false;

      const existingIds = new Set(this.chatMessages().map(m => m.id));
      const newMessages = data.filter(m => !existingIds.has(m.id));

      if (newMessages.length > 0) {
        if (loadMore) {
          this.chatMessages.set([...newMessages, ...this.chatMessages()]);
        } else {
          this.chatMessages.set([...this.chatMessages(), ...newMessages]);
        }
        
        const incomingMessages = newMessages.filter(m => m.sender !== this.username);
        
        if (incomingMessages.length > 0) {
          if (!this.isChatOpen() || document.hidden) {
          incomingMessages.forEach(msg => {
              this.showDesktopNotification(
                `${msg.sender}`, 
                msg.message
              );
            });
          }
        }
        this.changeDetector.markForCheck();
      }
    },
    error: () => {
      this.isLoading.set(false);
    }
  });
}
  sendMessage() {
    const imageToSend = this.pendingImage();
    if (imageToSend) {
      this.sendImageMessage(imageToSend);
      this.pendingImage.set(null);
      return;
    }

    if (!this.newMessage().trim()) return;
    
    const replyData = this.replyingTo();
    const replyId = replyData?.id || undefined;

    this.todoService.sendChatMessage(this.username, this.newMessage(), undefined, replyId).subscribe({
      next: (response) => {
        this.chatMessages.set([...this.chatMessages(), { 
          id: response.data?.id || Date.now(), 
          sender: this.username, 
          message: this.newMessage(), 
          created_at: new Date().toISOString(),
          reply_to_id: replyId,                         
          reply_message: replyData?.message || undefined, 
          reply_sender: replyData?.sender || undefined   ,
           reply_picture: replyData?.picture || undefined    
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
          reader.onload = async (e: any) => {
      // บีบอัดรูปภาพก่อนส่ง
      const resizedImage = await this.resizeImage(e.target.result);
      this.sendImageMessage(resizedImage);
    };
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
    const domain = 'jitsi.riot.im';
    const roomName = 'SupportRoom-' + Math.random().toString(36).substring(7);
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';
    const options = {
      roomName: roomName, width: '100%', height: '100%', parentNode: container,
      userInfo: { displayName: this.username, avatarURL: this.profile },
      configOverwrite: { prejoinPageEnabled: false, prejoinConfig: { enabled: false }, requireDisplayName: false, disableDeepLinking: true, startWithVideoMuted: false, enableLobby: false }
    };
    new JitsiMeetExternalAPI(domain, options);
    const callLink = `https://${domain}/${roomName}`;
    this.todoService.sendChatMessage(this.username, `📞 ฉันได้เริ่มวิดีโอคอลแล้ว เข้าร่วมได้ที่: ${callLink}`).subscribe({ next: () => this.fetchChatHistory() });
  }

  startCall() { this.startVideoCall(); }

  joinVideoCall(url: string) {
    if (url === '#') return;
    const domain = 'jitsi.riot.im'; 
    const roomName = url.split(domain + '/')[1]; 
    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'flex';
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';
    const options = {
      roomName: roomName, width: '100%', height: '100%', parentNode: container,
      userInfo: { displayName: this.username, avatarURL: this.profile },
      configOverwrite: { prejoinPageEnabled: false, requireDisplayName: false, disableDeepLinking: true, startWithVideoMuted: true },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, SHOW_WATERMARK_FOR_GUESTS: false, DEFAULT_LOCAL_DISPLAY_NAME: this.username }
    };
    const api = new JitsiMeetExternalAPI(domain, options);
    api.addEventListener('videoConferenceJoined', () => { api.executeCommand('displayName', this.username); });
  }

  extractLink(message: string): string {
    const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
    return urlMatch ? urlMatch[0] : '#';
  }

  selectedImage: string | null = null;
  openImageModal(imageUrl: string) { this.selectedImage = imageUrl; }
  closeImageModal() { this.selectedImage = null; }

  onScroll() {
    const element = this.chatBody.nativeElement;
    if (element.scrollTop === 0 && this.hasMoreMessages) {
      const previousHeight = element.scrollHeight;
      this.fetchChatHistory(true);
      setTimeout(() => { element.scrollTop = element.scrollHeight - previousHeight; }, 100);
    }
  }

  readonly replyingTo = signal<ChatMessage | null>(null);
  replyToMessage(chat: ChatMessage) { this.replyingTo.set(chat); }
  cancelReply() { this.replyingTo.set(null); }
  
  closeCall() {
    const modal = document.getElementById('video-call-modal');
    if (modal) modal.style.display = 'none';
    const container = document.querySelector('#jitsi-container');
    if (container) container.innerHTML = '';
  }

  readonly pendingImage = signal<string | null>(null);
  
  onPaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e: any) => {
            // บีบอัดรูปภาพก่อนเก็บลงตัวแปร
            const resizedImage = await this.resizeImage(e.target.result);
            this.pendingImage.set(resizedImage);
            this.changeDetector.markForCheck();
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }
}
  
  cancelImage() { this.pendingImage.set(null); }

  showDesktopNotification(title: string, body: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: 'image/logo.svg' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") { new Notification(title, { body, icon: 'image/logo.svg' }); }
      });
    }
  }

  // เพิ่มตัวแปรเก็บเวลาล่าสุดที่มีการพิมพ์ (สมมติว่าดึงมาจาก API)
readonly lastActiveTime = signal<Date | null>(new Date());

// ฟังก์ชันเช็คว่าออนไลน์อยู่หรือไม่ (ภายใน 1 นาที)
isUserActive(): boolean {
  const last = this.lastActiveTime();
  if (!last) return false;
  const diffMs = new Date().getTime() - new Date(last).getTime();
  return diffMs < 60000; // 60,000 ms = 1 นาที
}

// ฟังก์ชันแสดงข้อความสถานะ
getStatusText(): string {
  if (this.isUserActive()) {
    return 'กำลังใช้งาน';
  }
  
  const last = this.lastActiveTime();
  if (!last) return 'ออฟไลน์';

  const diffMs = new Date().getTime() - new Date(last).getTime();
  const minutes = Math.floor(diffMs / 60000);
  
  if (minutes < 60) return `ใช้งานล่าสุดเมื่อ ${minutes} นาทีที่แล้ว`;
  return 'ออฟไลน์';
}
getChatPartnerName(): string {
  if (this.userRole === 'admin') {
    // หาข้อความที่ไม่ได้ส่งโดยตัวเราเอง เพื่อเอาชื่อคนอื่นมาแสดง
    const otherMessage = this.chatMessages().find(chat => chat.sender !== this.username);
    return otherMessage ? otherMessage.sender : 'User';
  }
  return 'Admin'; // ถ้าเราเป็น User ให้แสดงว่าคุยกับ Admin
}


// เพิ่มตัวแปรสถานะและรายการสติกเกอร์
readonly isStickerMenuOpen = signal(false);
// อัปเดตรายการสติกเกอร์ให้ตรงกับชื่อไฟล์ในโฟลเดอร์ public/sticker
readonly stickers = signal<string[]>([
  // กลุ่มไฟล์ main
  'sticker/main.png',
  ...Array.from({ length: 18 }, (_, i) => `sticker/main (${i + 1}).png`),
  
  // กลุ่มไฟล์ sticker
  ...Array.from({ length: 39 }, (_, i) => `sticker/sticker (${i + 1}).png`)
]);

// ฟังก์ชันเปิด/ปิด ป๊อปอัพ
toggleStickerMenu() {
  this.isStickerMenuOpen.set(!this.isStickerMenuOpen());
}

// ฟังก์ชันส่งสติกเกอร์
sendSticker(stickerUrl: string) {
  this.sendImageMessage(stickerUrl); // ใช้ฟังก์ชันส่งรูปเดิม
  this.isStickerMenuOpen.set(false); // ปิดป๊อปอัพเมื่อส่งแล้ว
}
resizeImage(base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // คำนวณสัดส่วนใหม่หากความกว้างเกินที่กำหนด
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      // แปลงกลับเป็น Base64 โดยลดคุณภาพลง (0.7 = 70%)
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}
isFirstUnread(chatId: number): boolean {
  const unreadMessages = this.chatMessages().filter(m => !m.is_read && m.sender !== this.username);
  if (unreadMessages.length === 0) return false;
  return unreadMessages[0].id === chatId;
}
hasUnreadMessages(): boolean {
  return this.chatMessages().some(m => !m.is_read && m.sender !== this.username);
}


  formatMessage(message: string): string {
    if (!message) return '';
    // Regex ตรวจหา URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // แปลง URL ให้เป็นลิงก์สีฟ้าและขีดเส้นใต้
    return message.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" style="color: #0066cc; text-decoration: underline;">${url}</a>`;
    });
  }

toggleFullScreen() {
 
  const elem = document.querySelector('.con_live') as HTMLElement;
  
  if (!elem) return;

  if (!document.fullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) { 
      (elem as any).webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { 
      (document as any).webkitExitFullscreen();
    }
  }
}

setupRealtime() {
 
  this.supabase
    .channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, (payload: any) => {
      this.fetchChatHistory(); 
      this.changeDetector.markForCheck();
      setTimeout(() => this.scrollToBottom(), 200);

      if (this.isChatOpen()) {
        this.todoService.markChatAsRead(this.username).subscribe({
          next: () => {
             this.chatMessages.update(messages => 
              messages.map(m => m.sender !== this.username ? { ...m, is_read: true } : m)
            );
                  setTimeout(() => this.scrollToBottom(), 200);
            this.changeDetector.markForCheck();
          }
        });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing' }, () => {
      this.checkTypingStatus();
            setTimeout(() => this.scrollToBottom(), 200);
      this.changeDetector.markForCheck();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat' }, () => {
      this.fetchChatHistory();
      this.changeDetector.markForCheck();
      
    })
    .subscribe();

  this.supabase
    .channel('user-status-realtime')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, (payload: any) => {
      if (payload.new.username === this.username) {
        this.status.set(payload.new.status);
        if (payload.new.status.toLowerCase() === 'inactive') {
          this.isChatOpen.set(false);
        }
        this.changeDetector.markForCheck();
      }
    })
    .subscribe();
}
/* setupRealtime() {
  this.supabase
    .channel('chat-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' }, (payload: any) => {
      console.log('New message received:', payload);
      
      // 1. ดึงข้อมูลใหม่จาก API เพื่อให้ได้ข้อมูลที่ถูกต้องที่สุด
      this.fetchChatHistory();
      
      // 2. สั่งให้ Angular อัปเดตหน้าจอทันที
      this.changeDetector.markForCheck();
      
      // 3. เลื่อนลงล่างสุด
      setTimeout(() => this.scrollToBottom(), 200);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_typing' }, () => {
      this.checkTypingStatus();
    })
    .subscribe((status) => {
      console.log('Realtime connection status:', status);
    });
} */
}