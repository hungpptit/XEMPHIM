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

import crypto from 'crypto';

const app = express();
const port = process.env.GATEWAY_PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Correlation ID / Request ID middleware for Distributed Tracing
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

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
        console.log(`[Gateway][${req.id}] 🔑 Authenticated user ID: ${decoded.id}`);
      }
    } catch (err) {
      console.warn(`[Gateway][${req.id}] ⚠️ Invalid access token cookie in gateway`);
    }
  }
  next();
});

// Swagger UI mount
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Logging middleware with Trace ID
app.use((req, res, next) => {
  console.log(`[Gateway][${req.id}] ${req.method} ${req.originalUrl || req.path} -> forwarding...`);
  next();
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'gateway_ok' }));

import CircuitBreaker from 'opossum';

// Route definitions pointing to microservices
const USER_SERVICE = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';
const SEAT_SERVICE = process.env.SEAT_SERVICE_URL || 'http://localhost:4003';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';
const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4005';

// Circuit Breaker configuration for resilience
const breakerOptions = {
  timeout: 6000,
  errorThresholdPercentage: 50,
  resetTimeout: 10000
};

const createBreaker = (serviceName) => {
  const breaker = new CircuitBreaker(async (fn) => fn(), breakerOptions);
  breaker.on('open', () => console.warn(`🔴 [Circuit Breaker] Circuit OPEN for ${serviceName}`));
  breaker.on('halfOpen', () => console.log(`🟡 [Circuit Breaker] Circuit HALF-OPEN for ${serviceName}`));
  breaker.on('close', () => console.log(`🟢 [Circuit Breaker] Circuit CLOSED for ${serviceName}`));
  return breaker;
};

const breakers = {
  user: createBreaker('user-service'),
  movie: createBreaker('movie-service'),
  seat: createBreaker('seat-service'),
  booking: createBreaker('booking-service'),
  payment: createBreaker('payment-service')
};

const withCircuitBreaker = (serviceKey) => (req, res, next) => {
  const breaker = breakers[serviceKey];
  if (breaker && breaker.opened) {
    return res.status(503).json({
      success: false,
      message: `Dịch vụ tạm thời không khả dụng (${serviceKey}-service circuit breaker đang mở). Vui lòng thử lại sau giây lát.`
    });
  }
  next();
};

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl;
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    if (srcReq.id) {
      proxyReqOpts.headers['x-request-id'] = srcReq.id;
    }
    return proxyReqOpts;
  },
  proxyErrorHandler: (err, res, next) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ message: 'Bad Gateway: Microservice might be down.', error: err.message });
  }
};

// Proxy mount routes with Circuit Breaker protection
app.use('/api/auth', withCircuitBreaker('user'), proxy(USER_SERVICE, proxyOptions));
app.use('/api/users', withCircuitBreaker('user'), proxy(USER_SERVICE, proxyOptions));
app.use('/api/movies', withCircuitBreaker('movie'), proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/showtimes', withCircuitBreaker('movie'), proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/admin/users', withCircuitBreaker('user'), proxy(USER_SERVICE, proxyOptions));
app.use('/api/admin/stats', withCircuitBreaker('booking'), proxy(BOOKING_SERVICE, proxyOptions));
app.use('/api/admin/seats', withCircuitBreaker('seat'), proxy(SEAT_SERVICE, proxyOptions));
app.use('/api/admin', withCircuitBreaker('movie'), proxy(MOVIE_SERVICE, proxyOptions));
app.use('/api/seats', withCircuitBreaker('seat'), proxy(SEAT_SERVICE, proxyOptions));
app.use('/api/bookings', withCircuitBreaker('booking'), proxy(BOOKING_SERVICE, proxyOptions));
app.use('/api/payments', withCircuitBreaker('payment'), proxy(PAYMENT_SERVICE, proxyOptions));
app.use('/api/zalopay', withCircuitBreaker('payment'), proxy(PAYMENT_SERVICE, proxyOptions));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err.message);
  res.status(502).json({ message: 'Bad Gateway: Microservice might be down.' });
});


app.listen(port, () => {
  console.log(`🛡️ API Gateway running on port ${port}`);
});
