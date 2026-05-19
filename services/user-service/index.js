import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.USER_SERVICE_PORT || 4001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[User Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', (req, res) => {
  // If request contains gateway-injected headers, we can return the current user info
  const userId = req.headers['x-user-id'];
  if (userId) {
    return res.json({ id: userId, email: req.headers['x-user-email'], role: req.headers['x-user-role'] });
  }
  res.status(501).json({ message: 'Not implemented' });
});

app.listen(port, () => {
  console.log(`👤 User Service listening on port ${port}`);
});
