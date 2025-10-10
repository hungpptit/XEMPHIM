import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Import các routes
import authRoutes from './routes/auth.js';
import movieRoutes from './routes/movies.js';
import seatRoutes from './routes/seatRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import { startExpireJob } from './jobs/expireBookingsJob.js';

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/showtimes', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/payments', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/users', (req, res) => res.status(501).json({ message: 'Not implemented' }));

// Start server
app.listen(port, () => console.log(`🚀 Backend listening on port ${port}`));

// Start background job to expire locked bookings every 60s
startExpireJob(60);
