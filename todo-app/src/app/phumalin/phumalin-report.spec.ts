import { PRINT_ROOT_ID, buildStockReport, buildStockReportHtml, printReport, stockReportTitle } from './phumalin-report';
import { pmItem } from './phumalin-test-utils';

describe('phumalin-report', () => {
  const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

  it('ตาราง ลำดับ / ชื่อสินค้า / จำนวน / หน่วย ตามลำดับที่ส่งมา และหัวรายงานบอกร้าน + ตัวกรอง', () => {
    const doc = parse(buildStockReportHtml([
      pmItem({ id: 1, name: 'กะหล่ำปลี', quantity: 2.5, unit: 'กก.' }),
      pmItem({ id: 2, name: 'ข้าวสาร', quantity: 0, unit: 'ถุง' })
    ], { storeLabel: 'ร้านบน', filterLabel: 'กรอง: หมวด ผัก', printedAt: new Date(2026, 10, 6, 14, 5) }));

    expect(Array.from(doc.querySelectorAll('thead th')).map((th) => th.textContent)).toEqual(['ลำดับ', 'ชื่อสินค้า', 'จำนวน', 'หน่วย']);
    const rows = Array.from(doc.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim()));
    expect(rows).toEqual([['1', 'กะหล่ำปลี', '2.5', 'กก.'], ['2', 'ข้าวสาร', '0', 'ถุง']]);
    expect(doc.querySelector('td.out')?.textContent).toBe('0');
    expect(doc.querySelector('h1')?.textContent).toContain('ร้านบน');
    expect(doc.querySelector('.meta')?.textContent).toContain('2 รายการ');
    expect(doc.querySelector('.meta')?.textContent).toContain('กรอง: หมวด ผัก');
    expect(doc.title).toBe('คลังสินค้า ร้านบน 2026-11-06');
  });

  it('กัน HTML ในชื่อ / หน่วย และไม่มีสินค้าแสดงข้อความแทนตาราง', () => {
    const doc = parse(buildStockReportHtml([pmItem({ name: '<img src=x onerror=alert(1)>', unit: '"kg"' })], { storeLabel: 'ร้านล่าง' }));
    expect(doc.querySelector('tbody img')).toBeNull();
    expect(doc.querySelector('tbody td:nth-child(2)')?.textContent).toBe('<img src=x onerror=alert(1)>');

    const empty = parse(buildStockReportHtml([], { storeLabel: 'ร้านล่าง' }));
    expect(empty.querySelector('td.empty')?.textContent).toBe('ไม่มีสินค้า');
  });

  it('ชื่อไฟล์', () => {
    expect(stockReportTitle('ร้านล่าง', new Date(2026, 0, 9))).toBe('คลังสินค้า ร้านล่าง 2026-01-09');
  });

  it('พิมพ์จากหน้าเดิม (ไม่ใช้ iframe): ใส่รายงานใน body + ซ่อนแอปตอนพิมพ์ ตั้งชื่อไฟล์ แล้วเก็บกวาดหลังพิมพ์', () => {
    const printSpy = spyOn(window, 'print');
    const before = document.title;
    printReport(buildStockReport([pmItem({ name: 'กะหล่ำปลี' })], { storeLabel: 'ร้านบน', printedAt: new Date(2026, 10, 6) }));

    expect(printSpy).toHaveBeenCalled();
    expect(document.querySelector('iframe')).toBeNull();
    const root = document.getElementById(PRINT_ROOT_ID)!;
    expect(root.parentElement).toBe(document.body);
    expect(root.querySelector('tbody td:nth-child(2)')?.textContent).toBe('กะหล่ำปลี');
    expect(root.querySelector('style')?.textContent).toContain('body.pm-printing > *:not(#pm-print-root)');
    expect(document.body.classList).toContain('pm-printing');
    expect(document.title).toBe('คลังสินค้า ร้านบน 2026-11-06');
    expect(getComputedStyle(root).display).toBe('none'); // บนจอไม่เห็น เห็นเฉพาะตอนพิมพ์

    window.dispatchEvent(new Event('afterprint'));
    expect(document.getElementById(PRINT_ROOT_ID)).toBeNull();
    expect(document.body.classList).not.toContain('pm-printing');
    expect(document.title).toBe(before);
  });
});
