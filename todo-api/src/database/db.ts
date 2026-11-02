import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Production (Supabase) ใช้ DATABASE_URL
// ถ้าไม่มี จะใช้ DB_HOST/DB_PORT/... แทน (เช่นรัน local กับ docker-compose)
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
