import { pngFile } from '../../testing/image-test-utils';
import { formatPrice, maskPromptPayId, promptPayQr, readSlip } from './shop-format';

const imageSize = (src: string) =>
  new Promise<[number, number]>(resolve => {
    const img = new Image();
    img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
    img.src = src;
  });

describe('shop-format', () => {
  it('formatPrice: แสดงเป็นบาท ทศนิยม 2 ตำแหน่ง ค่าที่ไม่ใช่ตัวเลขเป็น 0', () => {
    expect(formatPrice(1390)).toBe('฿1,390.00');
    expect(formatPrice('25.5')).toBe('฿25.50');
    expect(formatPrice(null)).toBe('฿0.00');
  });

  it('maskPromptPayId: ซ่อนกลางเบอร์โทร / เลขผู้เสียภาษี', () => {
    expect(maskPromptPayId('0811112222')).toBe('081-xxx-2222');
    expect(maskPromptPayId('1234567890123')).toBe('x-xxxx-xxxxx-12-3');
  });

  it('promptPayQr: ได้รูป QR (data URL) จากเบอร์ร้านและยอดเงิน', async () => {
    const url = await promptPayQr('0811112222', 51);
    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it('readSlip: รูปใหญ่ถูกย่อให้ด้านยาวไม่เกิน 1600px และเป็น JPEG / รูปเล็กคงขนาดเดิม', async () => {
    const big = await readSlip(await pngFile(3200, 1000));
    expect(big).toMatch(/^data:image\/jpeg;base64,/);
    expect(await imageSize(big)).toEqual([1600, 500]);

    expect(await imageSize(await readSlip(await pngFile(300, 600)))).toEqual([300, 600]);
  });

  it('readSlip: ไฟล์ที่ไม่ใช่รูปจริงอ่านไม่ได้', async () => {
    await expectAsync(readSlip(new File(['not an image'], 'x.png', { type: 'image/png' }))).toBeRejected();
  });
});
