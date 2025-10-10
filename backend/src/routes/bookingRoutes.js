import express from 'express';
import bookingController from '../controllers/bookingController.js';

const router = express.Router();

// POST lock seats
router.post('/lock-seat', bookingController.lockSeatHandler);

// POST confirm payment
router.post('/:bookingId/confirm-payment', bookingController.confirmPaymentHandler);

// GET user bookings
router.get('/user/:userId', bookingController.getUserBookingsHandler);

export default router;
