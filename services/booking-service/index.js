import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bookingRoutes from './routes/bookingRoutes.js';
import { startExpireJob } from './jobs/expireBookingsJob.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.BOOKING_SERVICE_PORT || 4004;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Booking Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/bookings', bookingRoutes);

// Start background expiration worker (every 60 seconds)
startExpireJob(60);

app.listen(port, () => {
  console.log(`🎟 Booking Service listening on port ${port}`);
});
