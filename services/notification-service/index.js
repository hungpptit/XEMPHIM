import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { startNotificationConsumer } from './consumer.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.NOTIFICATION_SERVICE_PORT || 4006;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Notification Service] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Start consumer
startNotificationConsumer();

app.listen(port, () => {
  console.log(`🔔 Notification Service listening on port ${port}`);
});
