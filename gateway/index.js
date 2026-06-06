import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import proxy from 'express-http-proxy';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';

const swaggerDocument = JSON.parse(
  readFileSync(new URL('./swagger.json', import.meta.url))
);

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.JWT_SECRET) {
  // Try loading from parent root directory if available
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
}

const app = express();
const port = process.env.GATEWAY_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// CORS configuration (allow frontend localhost:3000)
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origin === 'http://localhost:3000' || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(cookieParser());

// Middleware to extract JWT token and inject user details into headers
app.use((req, res, next) => {
  const token = req.cookies?.access_token;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded && decoded.id) {
        req.headers['x-user-id'] = String(decoded.id);
        req.headers['x-user-email'] = String(decoded.email || '');
        req.headers['x-user-role'] = String(decoded.role || 'user');
        console.log(`🔑 Gateway authenticated user ID: ${decoded.id}`);
      }
    } catch (err) {
      console.warn('⚠️ Invalid access token cookie in gateway');
    }
  }
  next();
});

// Swagger UI mount
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Logging middleware
app.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path} -> forwarding...`);
  next();
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'gateway_ok' }));

// Route definitions pointing to microservices
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';
const SEAT_SERVICE = process.env.SEAT_SERVICE_URL || 'http://localhost:4003';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4005';

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    return proxyReqOpts;
  }
};

// Proxy mount routes
app.use('/api/auth', proxy(USER_SERVICE, proxyOptions));
app.use('/api/users', proxy(USER_SERVICE, proxyOptions));
app.use('/api/movies', proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/showtimes', proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/admin/users', proxy(USER_SERVICE, proxyOptions));
app.use('/api/admin', proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/seats', proxy(SEAT_SERVICE, proxyOptions));
app.use('/api/bookings', proxy(BOOKING_SERVICE, proxyOptions));
app.use('/api/payments', proxy(PAYMENT_SERVICE, proxyOptions));
app.use('/api/zalopay', proxy(PAYMENT_SERVICE, proxyOptions));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err.message);
  res.status(502).json({ message: 'Bad Gateway: Microservice might be down.' });
});

app.listen(port, () => {
  console.log(`🛡️ API Gateway running on port ${port}`);
});
