import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // รหัสสินค้ามาจากฐานข้อมูลตอนใช้งาน จึง prerender ล่วงหน้าไม่ได้ ให้ render ฝั่ง browser
  {
    path: 'shop/:sku',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
