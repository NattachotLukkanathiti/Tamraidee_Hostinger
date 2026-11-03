import promptpay from 'promptpay-qr';
import * as QRCode from 'qrcode';

const priceFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'THB',
  currencyDisplay: 'narrowSymbol'
});

// ราคาในหน้าร้านทั้งหมด เช่น ฿1,390.00
export function formatPrice(value: number | string | null | undefined): string {
  return priceFormat.format(Number(value) || 0);
}

// QR พร้อมเพย์แบบเดียวกับหน้า POS: payload ตามมาตรฐาน PromptPay (เบอร์ร้าน + ยอดเงิน) แล้วแปลงเป็นรูป
// (qrcode เวอร์ชันเบราว์เซอร์ต้องส่ง callback แบบเดียวกับที่หน้า POS เรียก)
export function promptPayQr(promptpayId: string, amount: number): Promise<string> {
  const payload = promptpay(promptpayId, { amount });
  return new Promise((resolve, reject) => {
    QRCode.toDataURL(payload, { width: 480, margin: 1 }, (err, url) => (err ? reject(err) : resolve(url)));
  });
}

// แสดงบัญชีรับเงินแบบปิดบางส่วน เช่น 081-xxx-2222
export function maskPromptPayId(id: string): string {
  return id.length === 10 ? `${id.slice(0, 3)}-xxx-${id.slice(6)}` : `x-xxxx-xxxxx-${id.slice(10, 12)}-${id.slice(12)}`;
}

const SLIP_MAX_SIDE = 1600;
const SLIP_QUALITY = 0.85;

// ย่อรูปสลิปให้ด้านยาวไม่เกิน 1600px แล้วบันทึกเป็น JPEG (ขนาดไม่เกินที่ API รับ และยังอ่านตัวเลขได้ชัด)
export async function readSlip(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unreadable file'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unreadable image'));
    img.src = source;
  });

  const scale = Math.min(1, SLIP_MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return source;
  context.fillStyle = '#fff'; // PNG โปร่งใสจะไม่กลายเป็นพื้นดำ
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', SLIP_QUALITY);
}
