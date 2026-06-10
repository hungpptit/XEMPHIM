import express from 'express';
import {
  createOrderHandler,
  refundOrderHandler,
  getPaymentByBooking,
  createPaymentRecord,
  updatePaymentRecord,
  voidPendingPayments,
  expirePendingPaymentsRecord
} from '../controllers/paymentController.js';

const router = express.Router();

// Internal microservices endpoints (called by booking-service)
router.post('/orders', createOrderHandler);
router.post('/refunds', refundOrderHandler);

// DB management endpoints
router.get('/booking/:booking_id', getPaymentByBooking);
router.post('/record', createPaymentRecord);
router.put('/record/:id', updatePaymentRecord);
router.post('/void-pending', voidPendingPayments);
router.post('/expire-pending-records', expirePendingPaymentsRecord);

export default router;
