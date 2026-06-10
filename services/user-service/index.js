import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import adminUserRoutes from './routes/adminUserRoutes.js';
import * as db from './models/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.USER_SERVICE_PORT || 4001;

// Initialize Database Models
app.locals.models = db;

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
app.use('/api/admin/users', adminUserRoutes);

app.get('/api/users/:id', async (req, res) => {
  try {
    const { User } = req.app.locals.models;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ id: user.id, email: user.email, full_name: user.full_name, phone_number: user.phone_number, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
