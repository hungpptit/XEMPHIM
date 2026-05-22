import express from 'express';
import bookingController from '../controllers/bookingController.js';

const router = express.Router();

router.post('/lock-seat', bookingController.lockSeatHandler);
router.post('/:bookingId/confirm-payment', bookingController.confirmPaymentHandler);
router.post('/:bookingId/create-zalopay-qr', bookingController.createZaloPayQRHandler);
router.get('/:bookingId/status', bookingController.getBookingStatusHandler);
router.post('/:bookingId/cancel', bookingController.cancelBookingHandler);
router.post('/:bookingId/refund', bookingController.refundBookingHandler);
router.get('/user/:userId', bookingController.getUserBookingsHandler);

export default router;
