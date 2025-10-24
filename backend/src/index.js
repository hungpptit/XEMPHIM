import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import các routes
import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import seatRoutes from './routes/seatRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentsRoutes from './routes/payments.js';
import zalopayRoutes from './routes/zalopayRoutes.js';
import { startExpireJob } from './jobs/expireBookingsJob.js';

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
// Allow webhook calls from anywhere, but restrict browser calls to localhost:3000
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow localhost:3000 (frontend)
    if (origin === 'http://localhost:3000') return callback(null, true);
    // Allow localhost:9090 (webhook forwarder)
    if (origin.startsWith('http://localhost:')) return callback(null, true);
    // Reject other origins
    console.warn(`❌ Blocked by CORS: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} requested`);
  next();
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/showtimes', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/payments', paymentsRoutes);
app.use('/api/zalopay', zalopayRoutes);
app.use('/api/users', (req, res) => res.status(501).json({ message: 'Not implemented' }));

// Start server
app.listen(port, () => console.log(`🚀 Backend listening on port ${port}`));

// Start background job to expire locked bookings every 60s
startExpireJob(60);
