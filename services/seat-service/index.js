import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import seatRoutes from './routes/seatRoutes.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.SEAT_SERVICE_PORT || 4003;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Seat Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/seats', seatRoutes);

app.listen(port, () => {
  console.log(`💺 Seat Service listening on port ${port}`);
});
