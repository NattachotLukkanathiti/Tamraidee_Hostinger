import { TestBed } from '@angular/core/testing';
import { waitFor } from '../../testing/page-test-utils';
import { HIDDEN_CLASS, REVEAL_CLASS, ScrollRevealService } from './scroll-reveal.service';

describe('ScrollRevealService', () => {
  let service: ScrollRevealService;
  let root: HTMLElement;

  // หน้าจำลอง: ส่วนบนสูงเท่าจอ (เห็นอยู่แล้ว) ตามด้วยการ์ดที่อยู่ใต้ขอบจอ
  const block = (height: number, id: string) => {
    const el = document.createElement('div');
    el.id = id;
    el.style.height = `${height}px`;
    return el;
  };
  const byId = (id: string) => document.getElementById(id)!;

  beforeEach(() => {
    root = document.createElement('div');
    const page = document.createElement('app-page'); // host ของ component (inline ไม่มีขนาด)
    page.style.display = 'inline';
    const list = document.createElement('section');
    list.id = 'list';
    list.append(block(window.innerHeight - 50, 'top'), block(200, 'below-1'), block(200, 'below-2'));
    page.append(list);

    const fixed = block(40, 'fixed');
    fixed.style.position = 'fixed';
    fixed.style.top = `${window.innerHeight + 100}px`;
    const navbar = document.createElement('app-navbar');
    navbar.append(block(40, 'in-navbar'));

    root.append(page, fixed, navbar);
    document.body.append(root);
    window.scrollTo(0, 0);
    service = TestBed.inject(ScrollRevealService);
  });

  afterEach(() => {
    service.ngOnDestroy();
    root.remove();
    window.scrollTo(0, 0);
  });

  it('ซ่อนเฉพาะก้อนที่อยู่ใต้ขอบจอ ส่วนที่เห็นอยู่แล้ว / fixed / navbar ไม่ถูกซ่อน', () => {
    service.start(root);

    expect(byId('below-1').classList).toContain(HIDDEN_CLASS);
    expect(byId('below-2').classList).toContain(HIDDEN_CLASS);
    expect(byId('top').classList).not.toContain(HIDDEN_CLASS);
    expect(byId('list').classList).not.toContain(HIDDEN_CLASS); // คร่อมขอบจอ: ซ่อนลูกแทน
    expect(byId('fixed').classList).not.toContain(HIDDEN_CLASS);
    expect(byId('in-navbar').classList).not.toContain(HIDDEN_CLASS);
  });

  it('เลื่อนลงจนเห็น: เฟดเข้ามาแล้วเอา class ของการเฟดออกเมื่อจบ', async () => {
    service.start(root);

    window.scrollTo(0, 400);

    await waitFor(() => !byId('below-1').classList.contains(HIDDEN_CLASS));
    expect(byId('below-1').classList).toContain(REVEAL_CLASS);
    await waitFor(() => !byId('below-1').classList.contains(REVEAL_CLASS), 1500);
  });

  it('เนื้อหาที่เพิ่มเข้ามาทีหลัง (เช่นโหลดข้อมูลเสร็จ) ใต้ขอบจอก็ถูกซ่อนรอเฟดด้วย', async () => {
    service.start(root);

    byId('list').append(block(100, 'late'));

    await waitFor(() => byId('late').classList.contains(HIDDEN_CLASS));
    expect(byId('late').classList).toContain(HIDDEN_CLASS);
  });

  it('สิ่งที่เคยแสดงแล้วไม่ถูกซ่อนซ้ำ แม้เลื่อนกลับขึ้นแล้วสแกนใหม่', () => {
    byId('top').style.height = '10px'; // ให้ทุกก้อนอยู่ในจอตั้งแต่แรก
    service.start(root);
    expect(byId('below-1').classList).not.toContain(HIDDEN_CLASS);

    byId('top').style.height = `${window.innerHeight * 2}px`; // ดัน below-1 ลงไปใต้ขอบจอ
    service.scan();

    expect(byId('below-1').classList).not.toContain(HIDDEN_CLASS);
  });

  it('ผู้ใช้ตั้งค่าลดการเคลื่อนไหว: ไม่ซ่อนอะไรเลย', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    service.start(root);

    expect(byId('below-1').classList).not.toContain(HIDDEN_CLASS);
  });

  it('เรียก start ซ้ำไม่สร้าง observer ซ้ำ และ scan ก่อน start ไม่ทำอะไร', () => {
    service.scan();
    expect(byId('below-1').classList).not.toContain(HIDDEN_CLASS);

    service.start(root);
    const other = document.createElement('div');
    service.start(other);

    expect(byId('below-1').classList).toContain(HIDDEN_CLASS);
  });
});
