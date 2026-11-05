import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import inventoryRoutes from './routes/inventory.routes';
import salesRoutes from './routes/sales.routes';
import suppliersRoutes from './routes/suppliers.routes';
import notificationsRoutes from './routes/notifications.routes';
import chatRoutes from './routes/chat.routes';
import auditRoutes from './routes/audit.routes';
import shopRoutes from './routes/shop.routes';
import settingsRoutes from './routes/settings.routes';

export const app = express();

app.use(cors({
  origin: [
    'https://lamped.netlify.app',
    'http://localhost:4200',
    'https://coruscating-donut-62bb86.netlify.app',
    'https://tamraidee.netlify.app',
    'https://tamraidee.nat-lukkanathiti.workers.dev',
    'https://trd.tamraidee.workers.dev',
    'https://trd2.tamraidee.workers.dev',
    'https://tamraidee.tech'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  credentials: true
}));

/* app.options('*', cors());  */
// เพิ่ม limit เพื่อให้รองรับรูปภาพ Base64 ขนาดใหญ่
// เพิ่ม limit ให้รองรับข้อมูลขนาด 50MB (จากเดิมที่ค่าเริ่มต้นคือ 100KB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.get('/', (req, res) => {
  res.send('Todo API Running');
});

// endpoint ใต้ /api ที่เรียกได้โดยไม่ต้อง login (POST /todos สมัครสมาชิกอยู่นอก /api จึงเป็น public อยู่แล้ว)
const PUBLIC_API_ROUTES = new Set([
  'POST /api/login',
  'POST /api/auth/social',
  'POST /api/request-otp',
  'POST /api/verify-otp',
  'POST /api/check-email',
  'PUT /api/reset-password',
  'GET /api/shop/products',
  'GET /api/shop/best-sellers',
  'GET /api/shop/config',
]);

app.use('/api', (req, res, next) => {
  const route = `${req.method} ${req.originalUrl.split('?')[0]}`;
  if (PUBLIC_API_ROUTES.has(route)) return next();
  return requireAuth(req, res, next);
});

app.use(authRoutes);
app.use(usersRoutes);
app.use(inventoryRoutes);
app.use(salesRoutes);
app.use(suppliersRoutes);
app.use(notificationsRoutes);
app.use(chatRoutes);
app.use(auditRoutes);
app.use(settingsRoutes);
app.use(shopRoutes);
