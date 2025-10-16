import express from 'express';
import bookingController from '../controllers/bookingController.js';

const router = express.Router();

// POST lock seats
router.post('/lock-seat', bookingController.lockSeatHandler);

// POST confirm payment
router.post('/:bookingId/confirm-payment', bookingController.confirmPaymentHandler);

// Create Sepay QR (mock)
router.post('/:bookingId/create-sepay-qr', bookingController.createSepayQRHandler);

// Get booking status
router.get('/:bookingId/status', bookingController.getBookingStatusHandler);

// Cancel booking (user cancels before payment)
router.post('/:bookingId/cancel', bookingController.cancelBookingHandler);

// Refund booking (admin or user requests refund after paid)
router.post('/:bookingId/refund', bookingController.refundBookingHandler);

// GET user bookings
router.get('/user/:userId', bookingController.getUserBookingsHandler);

export default router;
