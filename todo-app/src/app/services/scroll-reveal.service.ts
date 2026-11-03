import { Injectable, OnDestroy } from '@angular/core';

export const HIDDEN_CLASS = 'sr-hidden';
export const REVEAL_CLASS = 'sr-reveal';
const REVEAL_MS = 700;
const RESCAN_DELAY_MS = 100;

// ไม่เดินเข้าไปใน element เหล่านี้ (navbar หลังร้าน / กราฟิก / ฟอร์ม)
const SKIP_TAGS = new Set(['APP-NAVBAR', 'SCRIPT', 'STYLE', 'svg', 'CANVAS', 'SELECT', 'OPTION', 'ROUTER-OUTLET']);

// เฟดเนื้อหาเข้ามาตอนเลื่อนลง ใช้กับทุกหน้าอัตโนมัติ (ไม่ต้องแก้ template ของแต่ละหน้า)
// - ตอนหน้าแสดงผล/มีเนื้อหาเพิ่ม: หา "ก้อนใหญ่สุด" ที่อยู่ใต้ขอบจอทั้งก้อน แล้วซ่อนไว้ (sr-hidden)
// - เลื่อนจนก้อนนั้นโผล่เข้ามา: เอา sr-hidden ออก ให้ค่อย ๆ เฟดขึ้นมา (sr-reveal)
// - สิ่งที่เห็นอยู่แล้ว / เคยแสดงไปแล้ว / position fixed (navbar, popup, ตะกร้า) จะไม่ถูกซ่อน
@Injectable({ providedIn: 'root' })
export class ScrollRevealService implements OnDestroy {
  private readonly seen = new WeakSet<Element>();
  private intersection?: IntersectionObserver;
  private mutation?: MutationObserver;
  private root?: HTMLElement;
  private rescanTimer?: ReturnType<typeof setTimeout>;

  start(root: HTMLElement): void {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (this.root || reducedMotion || typeof IntersectionObserver === 'undefined') return;

    this.root = root;
    this.intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.reveal(entry.target as HTMLElement);
      }
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });

    // เปลี่ยนหน้า / โหลดข้อมูลเสร็จแล้วมี element ใหม่ ให้สแกนใหม่ (รวบหลายครั้งเป็นครั้งเดียว)
    this.mutation = new MutationObserver(() => {
      clearTimeout(this.rescanTimer);
      this.rescanTimer = setTimeout(() => this.scan(), RESCAN_DELAY_MS);
    });
    this.mutation.observe(root, { childList: true, subtree: true });
    this.scan();
  }

  scan(): void {
    if (this.root) this.visit(this.root, window.innerHeight);
  }

  ngOnDestroy(): void {
    clearTimeout(this.rescanTimer);
    this.intersection?.disconnect();
    this.mutation?.disconnect();
    this.root = undefined;
  }

  private visit(el: HTMLElement, viewportBottom: number): void {
    for (const child of Array.from(el.children) as HTMLElement[]) {
      if (SKIP_TAGS.has(child.tagName) || child.classList.contains(HIDDEN_CLASS)) continue;

      const rect = child.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        // host ของ component มักไม่มีขนาด (display: inline) แต่ลูกข้างในมี ให้เดินต่อ
        this.visit(child, viewportBottom);
        continue;
      }
      if (getComputedStyle(child).position === 'fixed') continue;

      if (rect.top >= viewportBottom) {
        this.hide(child); // อยู่ใต้ขอบจอทั้งก้อน: ซ่อนทั้งก้อนแล้วค่อยเฟดเข้ามา
      } else {
        this.seen.add(child); // เห็นอยู่แล้ว (หรือเลื่อนผ่านไปแล้ว) ไม่ต้องซ่อน
        if (rect.bottom > viewportBottom) this.visit(child, viewportBottom); // คร่อมขอบจอ: ดูลูกข้างใน
      }
    }
  }

  private hide(el: HTMLElement): void {
    if (this.seen.has(el)) return;
    this.seen.add(el);
    el.classList.add(HIDDEN_CLASS);
    this.intersection?.observe(el);
  }

  private reveal(el: HTMLElement): void {
    this.intersection?.unobserve(el);
    el.classList.add(REVEAL_CLASS);
    el.classList.remove(HIDDEN_CLASS);
    // เอา transition ของเราออกเมื่อเฟดเสร็จ ไม่ให้ไปทับ transition เดิมของ element (เช่น hover)
    setTimeout(() => el.classList.remove(REVEAL_CLASS), REVEAL_MS);
  }
}
