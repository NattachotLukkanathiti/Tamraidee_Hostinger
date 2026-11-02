// ค่าตั้งค่าของแอปรวมไว้ที่เดียว (ค่าทั้งหมดในไฟล์นี้เป็นค่าฝั่ง client ที่เปิดเผยได้ ห้ามใส่ secret)
export const environment = {
  // Backend API (ไม่มี /api ต่อท้าย)
  apiBase: 'https://api.tamraidee.tech',

  firebase: {
    apiKey: 'AIzaSyDX97-QwdseS6C9vYZ8PQTUFsLTn-3oxQU',
    authDomain: 'tamraidee.firebaseapp.com',
    projectId: 'tamraidee',
    storageBucket: 'tamraidee.firebasestorage.app',
    messagingSenderId: '393168837647',
    appId: '1:393168837647:web:35588c991e76a38b2ed77a',
    measurementId: 'G-VHEHJMBK45'
  },

  // anon key ใช้ได้ฝั่ง client แต่ต้องเปิด RLS ใน Supabase ทุกตาราง
  supabase: {
    url: 'https://iemqkiftkhyoalyqpjzj.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXFraWZ0a2h5b2FseXFwanpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyNjExODMsImV4cCI6MjEwNzgzNzE4M30.zk_zlo7QSHuNlM943ikEfwS6eWWbRjTYlWEN94kxn7o'
  }
};
