import bookingService from '../services/bookingService.js';

export const lockSeatHandler = async (req, res) => {
  try {
    const { user_id, showtime_id, seat_ids } = req.body;
    const result = await bookingService.lockSeats({ user_id, showtime_id, seat_ids, holdSeconds: 120 });
    if (!result.success) {
      return res.status(409).json({ 
        success: false, 
        message: 'Seat(s) conflict', 
        conflicts: result.conflicts 
      });
    }
    res.status(201).json({ 
      success: true, 
      booking: result.booking 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const confirmPaymentHandler = async (req, res) => {
  try {
    const { booking_id, payment_method, payment_payload } = req.body;
    const result = await bookingService.confirmPayment({ booking_id, payment_method, payment_payload });
    if (!result.success) return res.status(400).json({ message: result.message });
    res.json({ booking: result.booking, payment: result.payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

export const getUserBookingsHandler = async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    const result = await bookingService.getUserBookings(userId);
    res.json({ bookings: result });
  } catch (err) {
    console.error('Error getting user bookings:', err);
    res.status(500).json({ message: err.message });
  }
};

export default {
  lockSeatHandler,
  confirmPaymentHandler,
  getUserBookingsHandler
};
