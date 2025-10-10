import jwt from 'jsonwebtoken';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ✅ Giải pháp thay thế __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '1h';

export const sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
export const verify = (token) => jwt.verify(token, SECRET);
