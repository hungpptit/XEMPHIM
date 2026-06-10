import bookingService from '../services/bookingService.js';

export const lockSeatHandler = async (req, res) => {
  try {
    const { user_id, showtime_id, seat_ids } = req.body;
    const result = await bookingService.lockSeats({ user_id, showtime_id, seat_ids, holdSeconds: 180 });
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
    const booking_id = req.params.bookingId;
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

export const createZaloPayQRHandler = async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const result = await bookingService.createZaloPayQR({ booking_id: bookingId, expiresIn: 180 });
    res.json(result);
  } catch (err) {
    console.error('Error creating ZaloPay QR:', err && err.stack ? err.stack : err);
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
    
    // Gateway extracts X-User-Id, check header first
    const userId = req.headers['x-user-id'] || req.body.user_id;
    
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

export const getShowtimeSeatsHandler = async (req, res) => {
  try {
    const showtimeId = req.params.showtimeId;
    const { Booking, BookingSeat, Sequelize } = req.app.locals.models;
    const now = new Date().toISOString();

    // 1. Get confirmed seats
    const confirmedSeats = await BookingSeat.findAll({
      include: [{
        model: Booking,
        where: { showtime_id: showtimeId, status: 'confirmed' },
        attributes: []
      }],
      attributes: ['seat_id']
    });

    // 2. Get locked (pending) seats
    const lockedSeats = await BookingSeat.findAll({
      include: [{
        model: Booking,
        where: {
          showtime_id: showtimeId,
          status: 'locked',
          [Sequelize.Op.or]: [
            { expire_at: null },
            { expire_at: { [Sequelize.Op.gt]: Sequelize.literal(`'${now}'`) } }
          ]
        },
        attributes: []
      }],
      attributes: ['seat_id']
    });

    res.json({
      confirmedSeatIds: confirmedSeats.map(s => s.seat_id),
      lockedSeatIds: lockedSeats.map(s => s.seat_id)
    });
  } catch (err) {
    console.error('Error getting showtime seats:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getShowtimeBookingsCountHandler = async (req, res) => {
  try {
    const showtimeId = req.params.showtimeId;
    const { Booking, Sequelize } = req.app.locals.models;
    const count = await Booking.count({
      where: {
        showtime_id: showtimeId,
        status: { [Sequelize.Op.ne]: 'cancelled' }
      }
    });
    res.json({ count });
  } catch (err) {
    console.error('Error getting showtime bookings count:', err);
    res.status(500).json({ message: err.message });
  }
};

export default {
  lockSeatHandler,
  confirmPaymentHandler,
  getUserBookingsHandler,
  createZaloPayQRHandler,
  getBookingStatusHandler,
  cancelBookingHandler,
  refundBookingHandler,
  getShowtimeSeatsHandler,
  getShowtimeBookingsCountHandler
};
