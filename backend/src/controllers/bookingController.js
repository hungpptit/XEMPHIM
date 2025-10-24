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
    const booking_id = req.params.bookingId; // Get from URL params
    const { payment_method, payment_payload } = req.body;
    console.log('Confirming payment for booking:', booking_id);
    
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

export const createSepayQRHandler = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const result = await bookingService.createSepayQR({ booking_id: bookingId, expiresIn: 60 });
    res.json(result);
  } catch (err) {
    console.error('Error creating Sepay QR:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: err.message });
  }
};

export const getBookingStatusHandler = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const result = await bookingService.getBookingStatus({ booking_id: bookingId });
    if (!result) return res.status(404).json({ message: 'Booking not found' });
    res.json(result);
  } catch (err) {
    console.error('Error getting booking status:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: err.message });
  }
};

export const cancelBookingHandler = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const result = await bookingService.cancelBooking({ booking_id: bookingId });
    if (!result.success) return res.status(400).json({ message: result.message });
    res.json({ success: true, booking: result.booking });
  } catch (err) {
    console.error('Error cancelling booking:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: err.message });
  }
};

export const refundBookingHandler = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const { reason } = req.body;
    
    // Get user_id from authenticated user (assuming req.user from auth middleware)
    // If no auth middleware, get from body (less secure, for development only)
    const userId = req.user?.id || req.body.user_id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    const result = await bookingService.refundBooking({ 
      booking_id: bookingId, 
      user_id: userId,
      reason 
    });
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false,
        message: result.message,
        showtime_start: result.showtime_start,
        time_remaining_seconds: result.time_remaining_seconds,
        zalopay_error: result.zalopay_error
      });
    }
    
    res.json({ 
      success: true, 
      booking: result.booking, 
      refund: result.refund,
      zalopay_refund: result.zalopay_refund,
      message: result.message
    });
  } catch (err) {
    console.error('Error refunding booking:', err && err.stack ? err.stack : err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

export default {
  lockSeatHandler,
  confirmPaymentHandler,
  getUserBookingsHandler,
  createSepayQRHandler,
  getBookingStatusHandler,
  cancelBookingHandler,
  refundBookingHandler
};




