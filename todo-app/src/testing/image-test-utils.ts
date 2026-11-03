// รูป PNG จริงขนาด width x height สำหรับทดสอบการย่อสลิป
export function pngFile(width: number, height: number, name = 'slip.png'): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob!], name, { type: 'image/png' })), 'image/png'));
}
