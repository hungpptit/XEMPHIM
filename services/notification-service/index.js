import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { startNotificationConsumer, sendTicketEmail } from './consumer.js';
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

// Send notification via HTTP endpoint (as fallback if RabbitMQ is not running)
app.post('/api/notifications/send', async (req, res) => {
  try {
    const info = await sendTicketEmail(req.body);
    res.json({ success: true, message: 'Email sent successfully', info });
  } catch (err) {
    console.error('❌ [Notification Service] HTTP send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
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
