import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, signal, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { TodoService } from '../services/todo.service'; // นำเข้า TodoService

interface FaqItem {
  title: string;
  subtitle: string;
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  created_at: string;
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
  private todoService = inject(TodoService); // Inject Service

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

  // --- Help Page Signals ---
  readonly faqItems = signal<FaqItem[]>([]);
  readonly helpSearch = signal('');
  readonly helpIssueType = signal('Select');

  // --- Chat Signals ---
  readonly isChatOpen = signal(false);
  readonly chatMessages = signal<ChatMessage[]>([]);
  readonly newMessage = signal('');

  ngOnInit(): void {
    const state = history.state;
    
    this.username = state.username || '';
    this.email = state.email || '';
    this.userRole = state.role || '';
    this.profile = state.profile || '';

    this.fetchChatHistory(); // โหลดประวัติแชทเมื่อเปิดหน้า
  }

  ngOnDestroy(): void {
    this.timeSubscription?.unsubscribe();
  }

  // --- Chat Functions ---
  toggleChat() {
    this.isChatOpen.set(!this.isChatOpen());
  }

  fetchChatHistory() {
    this.todoService.getChatHistory().subscribe({
      next: (data) => {
        this.chatMessages.set(data);
        this.changeDetector.markForCheck();
      },
      error: (err) => console.error('Error fetching chat:', err)
    });
  }

  sendMessage() {
    if (!this.newMessage().trim()) return;

    this.todoService.sendChatMessage(this.username, this.newMessage()).subscribe({
      next: (response) => {
        // สร้าง Object ข้อความใหม่เพื่อแสดงผลทันที
        const newMsg: ChatMessage = {
          id: response.id || Date.now(),
          sender: this.username,
          message: this.newMessage(),
          created_at: new Date().toISOString()
        };
        
        this.chatMessages.set([...this.chatMessages(), newMsg]);
        this.newMessage.set(''); // ล้างช่องพิมพ์
        this.changeDetector.markForCheck();
      },
      error: (err) => console.error('Error sending message:', err)
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