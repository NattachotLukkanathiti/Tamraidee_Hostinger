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

  @ViewChild('chatBody') private chatBody!: ElementRef;

  username = '';
  email = '';
  userRole = '';
  profile = '';

  isTimeOpen = false;
  isNavOpen = false;
  isClosing = false;
  openPanel: HeaderPanel = null;
  currentTime = new Date();
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
    this.profile = state.profile || '';

    this.fetchChatHistory();

    this.chatSubscription = interval(3000).subscribe(() => {
      if (this.isChatOpen()) {
        this.fetchChatHistory();
      }
    });
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
    this.chatSubscription?.unsubscribe();
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
          const updatedMessages = this.chatMessages().map(msg => ({ ...msg, is_read: true }));
          this.chatMessages.set(updatedMessages);
          this.changeDetector.markForCheck();
        }
      });
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  fetchChatHistory() {
    this.todoService.getChatHistory().subscribe({
      next: (data) => {
        const isNewMessage = data.length > this.chatMessages().length;
        this.chatMessages.set(data);
        this.changeDetector.markForCheck();
        
        if (isNewMessage) {
          if (this.isChatOpen()) {
            this.todoService.markChatAsRead(this.username).subscribe();
          }
          setTimeout(() => this.scrollToBottom(), 100);
        }
      }
    });
  }
  
  sendMessage() {
    if (!this.newMessage().trim()) return;

    // ส่ง profile เป็นตัวแปรที่ 4 (โดยเว้นตัวที่ 3 หรือ picture เป็น undefined)
    this.todoService.sendChatMessage(this.username, this.newMessage(), undefined, this.profile).subscribe({
      next: (response) => {
        const newMsg: ChatMessage = {
          id: response.data?.id || Date.now(),
          sender: this.username,
          message: this.newMessage(),
          created_at: new Date().toISOString(),
          profile: this.profile
        };
        
        this.chatMessages.set([...this.chatMessages(), newMsg]);
        this.newMessage.set('');
        this.changeDetector.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  sendImageMessage(base64Image: string) {
    // ส่ง profile เป็นตัวแปรที่ 4 ต่อจาก base64Image
    this.todoService.sendChatMessage(this.username, '[Image]', base64Image, this.profile).subscribe({
      next: (response) => {
        const newMsg: ChatMessage = {
          id: response.data?.id || Date.now(),
          sender: this.username,
          message: '[Image]',
          created_at: new Date().toISOString(),
          profile: this.profile,
          picture: base64Image
        };
        this.chatMessages.set([...this.chatMessages(), newMsg]);
        this.changeDetector.markForCheck();
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

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
        // ส่งรูปภาพไปที่ Backend โดยตรง
        this.sendImageMessage(base64Image);
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
}