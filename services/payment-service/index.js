import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import paymentRoutes from './routes/paymentRoutes.js';
import zalopayRoutes from './routes/zalopayRoutes.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.PAYMENT_SERVICE_PORT || 4005;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Payment Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/zalopay', zalopayRoutes);

app.listen(port, () => {
  console.log(`💳 Payment Service listening on port ${port}`);
});
