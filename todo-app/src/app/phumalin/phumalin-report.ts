/// PHUMALIN: รายงานสต็อกแบบตาราง (คล้าย Excel) สำหรับ export เป็น PDF จากหน้าคลังสินค้า
/// ใช้หน้าต่างพิมพ์ของเบราว์เซอร์ ("บันทึกเป็น PDF") แทนไลบรารี PDF เพราะต้องฝังฟอนต์ไทยเองไม่งั้นภาษาไทยเพี้ยน
import { PhumalinItem, formatQty } from './phumalin.models';

export interface StockReportOptions {
  storeLabel: string;
  /// คำอธิบายตัวกรองที่ใช้อยู่ (ว่าง = ทั้งหมด)
  filterLabel?: string;
  printedAt?: Date;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/// ชื่อไฟล์ PDF ที่เบราว์เซอร์เสนอ (มาจาก <title>) เช่น "คลังสินค้า ร้านบน 2026-11-06"
export function stockReportTitle(storeLabel: string, date = new Date()): string {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `คลังสินค้า ${storeLabel} ${day}`;
}

/// เนื้อรายงาน: ลำดับ / ชื่อสินค้า / จำนวน / หน่วย (เส้นตารางแบบ Excel, หัวตารางซ้ำทุกหน้าเวลาพิมพ์)
export interface StockReport {
  title: string;
  body: string;
}

export function buildStockReport(items: PhumalinItem[], options: StockReportOptions): StockReport {
  const printedAt = options.printedAt ?? new Date();
  const printedText = printedAt.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
  const rows = items.map((item, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(item.name)}</td>
        <td class="qty${item.quantity <= 0 ? ' out' : ''}">${formatQty(item.quantity)}</td>
        <td>${escapeHtml(item.unit)}</td>
      </tr>`).join('');
  const empty = `<tr><td class="empty" colspan="4">ไม่มีสินค้า</td></tr>`;

  const body = `
  <h1>คลังสินค้า · ${escapeHtml(options.storeLabel)}</h1>
  <p class="meta">พิมพ์เมื่อ ${escapeHtml(printedText)} · ${items.length} รายการ${options.filterLabel ? ' · ' + escapeHtml(options.filterLabel) : ''}</p>
  <table>
    <thead>
      <tr><th class="num">ลำดับ</th><th>ชื่อสินค้า</th><th class="qty">จำนวน</th><th class="unit">หน่วย</th></tr>
    </thead>
    <tbody>${items.length ? rows : empty}
    </tbody>
  </table>`;
  return { title: stockReportTitle(options.storeLabel, printedAt), body };
}

export const PRINT_ROOT_ID = 'pm-print-root';
const R = `#${PRINT_ROOT_ID}`;

/// สไตล์ของรายงาน (ขึ้นต้นด้วย #pm-print-root ทั้งหมด ไม่กระทบหน้าอื่น)
/// + ตอนพิมพ์: ซ่อนทั้งแอป แสดงเฉพาะรายงาน (ใช้ได้ทั้งคอม / iPhone Safari / Android Chrome)
const REPORT_CSS = `
${R} { display: none; }
${R}, ${R} * { box-sizing: border-box; }
${R} { color: #1d1d1f; background: #fff; font-family: 'Sarabun', 'Tahoma', 'Leelawadee UI', 'Thonburi', sans-serif; font-size: 13px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${R} h1 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: #1d1d1f; }
${R} .meta { margin: 0 0 12px; color: #48505e; font-size: 12px; }
${R} table { width: 100%; border-collapse: collapse; table-layout: auto; }
${R} thead { display: table-header-group; }
${R} tr { break-inside: avoid; page-break-inside: avoid; }
${R} th, ${R} td { padding: 6px 10px; border: 1px solid #c9cdd2; text-align: left; vertical-align: top; font-size: 13px; color: #1d1d1f; }
${R} th { background: #e9ecef; font-weight: 700; }
${R} th.num, ${R} td.num { width: 52px; background: #f3f4f6; color: #6b7280; text-align: center; }
${R} th.qty, ${R} td.qty { width: 120px; text-align: right; font-variant-numeric: tabular-nums; }
${R} th.unit { width: 120px; }
${R} td.out { color: #c0392b; }
${R} td.empty { padding: 18px; color: #6b7280; text-align: center; }
${R} tbody tr:nth-child(even) td:not(.num) { background: #fafbfc; }
@media print {
  @page { size: A4; margin: 14mm 12mm; }
  html, body.pm-printing { width: auto !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; }
  body.pm-printing > *:not(${R}) { display: none !important; }
  body.pm-printing > ${R} { display: block !important; position: static !important; }
}`;

/// HTML ทั้งหน้า (ใช้ดูตัวอย่าง / test)
export function buildStockReportHtml(items: PhumalinItem[], options: StockReportOptions): string {
  const report = buildStockReport(items, options);
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<title>${escapeHtml(report.title)}</title>
<style>${REPORT_CSS}
${R} { display: block; }</style>
</head>
<body><div id="${PRINT_ROOT_ID}">${report.body}</div></body>
</html>`;
}

/// พิมพ์รายงานจากหน้าเดิมโดยตรง (ไม่ใช้ iframe / แท็บใหม่):
/// มือถือ (iPhone Safari / Android Chrome) ไม่พิมพ์เนื้อหาใน iframe แต่พิมพ์ทั้งหน้าแทน
/// จึงใส่รายงานไว้ใน body แล้วใช้ @media print ซ่อนทุกอย่างยกเว้นรายงาน
export function printReport(report: StockReport, doc: Document = document): void {
  doc.getElementById(PRINT_ROOT_ID)?.remove();
  const root = doc.createElement('div');
  root.id = PRINT_ROOT_ID;
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<style>${REPORT_CSS}</style>${report.body}`;
  doc.body.appendChild(root);

  const win = doc.defaultView;
  const previousTitle = doc.title;
  doc.title = report.title; // ชื่อไฟล์ PDF ที่เบราว์เซอร์เสนอ
  doc.body.classList.add('pm-printing');

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    doc.title = previousTitle;
    doc.body.classList.remove('pm-printing');
    root.remove();
  };
  // คอมส่วนใหญ่ print() รอจนปิดหน้าต่าง / มือถือบางรุ่นไม่รอ จึงเก็บกวาดตอน afterprint
  // (ถ้า afterprint ไม่ยิง รายงานซ่อนอยู่บนจอเพราะแสดงเฉพาะตอนพิมพ์ ไม่กระทบการใช้งาน และจะถูกแทนที่ตอนกดครั้งถัดไป)
  win?.addEventListener('afterprint', cleanup, { once: true });
  win?.print();
}
