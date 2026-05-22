import express from 'express';
import {
  createOrderHandler,
  refundOrderHandler
} from '../controllers/paymentController.js';

const router = express.Router();

// Internal microservices endpoints (called by booking-service)
router.post('/orders', createOrderHandler);
router.post('/refunds', refundOrderHandler);

export default router;
