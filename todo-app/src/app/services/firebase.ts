import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { environment } from '../../environments/environment';

// Firebase app ตัวเดียวของทั้งแอป (เดิมถูก initialize ซ้ำในหน้า Login และ Register)
const app = getApps().length ? getApp() : initializeApp(environment.firebase);

export const firebaseAuth = getAuth(app);
