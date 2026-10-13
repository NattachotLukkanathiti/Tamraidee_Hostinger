import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { interval, Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { TodoService } from '../services/todo.service';

declare var JitsiMeetExternalAPI: any;

interface FaqItem { title: string; subtitle: string; }
interface ChatMessage { id: number; sender: string; message: string; created_at: string; is_read?: boolean; profile?: string; picture?: string; }
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

  private limit = 10;
  private offset = 0;
  ngOnInit(): void {
    const state = history.state;
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';

    this.fetchChatHistory();
    this.chatSubscription = interval(3000).subscribe(() => {
      if (this.isChatOpen()) this.fetchChatHistory();
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

   fetchChatHistory() {
  this.todoService.getChatHistory(this.limit, 0).subscribe({
    next: (data) => {
      // เรียงลำดับและตัดให้เหลือ 10 ข้อความล่าสุด
      const latestMessages = data.slice(-10); 
      this.chatMessages.set(latestMessages);
      this.changeDetector.markForCheck();
      setTimeout(() => this.scrollToBottom(), 100);
    }
  });
}
  
  sendMessage() {
  if (!this.newMessage().trim()) return;
  this.todoService.sendChatMessage(this.username, this.newMessage()).subscribe({
    next: (response) => {
      const newMsg = { 
        id: response.data?.id || Date.now(), 
        sender: this.username, 
        message: this.newMessage(), 
        created_at: new Date().toISOString() 
      };
      
      // รวมข้อความเก่ากับข้อความใหม่ แล้วตัดให้เหลือ 10 ข้อความล่าสุด
      const updatedMessages = [...this.chatMessages(), newMsg].slice(-10);
      
      this.chatMessages.set(updatedMessages);
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
  if (element.scrollTop === 0) {
    this.loadMoreMessages();
  }
}

loadMoreMessages() {
    this.offset += this.limit; // เพิ่ม offset ทีละ 10
    const element = this.chatBody.nativeElement;
    const previousScrollHeight = element.scrollHeight;

    this.todoService.getChatHistory(this.limit, this.offset).subscribe({
      next: (olderMessages) => {
        if (olderMessages.length > 0) {
          // นำข้อความเก่ามาต่อด้านบน
          this.chatMessages.set([...olderMessages, ...this.chatMessages()]);
          this.changeDetector.markForCheck();
          
          // คงตำแหน่ง Scroll ให้ผู้ใช้อ่านข้อความเดิมได้ต่อเนื่อง
          setTimeout(() => {
            element.scrollTop = element.scrollHeight - previousScrollHeight;
          }, 0);
        } else {
          // ถ้าไม่มีข้อความเก่าแล้ว ให้ลบ offset กลับ เพื่อไม่ให้ยิง API ซ้ำ
          this.offset -= this.limit;
        }
      }
    });
  }
}