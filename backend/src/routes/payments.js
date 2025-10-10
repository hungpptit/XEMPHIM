import express from 'express';
import * as paymentsController from '../controllers/paymentsController.js';

const router = express.Router();

console.log('✅ paymentsRoutes loaded'); // log khi router được import

// Endpoint for webhook forwarder to call
router.post('/confirm', (req, res, next) => {
  console.log('📩 Route hit: POST /api/payments/confirm');
  next();
}, paymentsController.confirmPaymentFromWebhook);

export default router;
