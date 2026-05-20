import express from 'express';
import {
  confirmPaymentFromWebhook,
  createOrderHandler,
  refundOrderHandler
} from '../controllers/paymentController.js';

const router = express.Router();

// Webhook forwarder confirm endpoint
router.post('/confirm', confirmPaymentFromWebhook);

// Internal microservices endpoints
router.post('/orders', createOrderHandler);
router.post('/refunds', refundOrderHandler);

export default router;
