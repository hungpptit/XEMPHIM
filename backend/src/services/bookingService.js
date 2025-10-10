import { Booking, BookingSeat, Seat, Showtime, Payment, sequelize, Sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

// Lock seats: create a booking with status='locked' and booking_seats
export const lockSeats = async ({ user_id, showtime_id, seat_ids = [], holdSeconds = 120 }) => {
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw new Error('seat_ids required');
  }

  // validate seat_ids are integers (DB expects numeric ids)
  const normalizedSeatIds = seat_ids.map(s => {
    // allow numeric strings like '12' but not labels like 'A1' or 'C8'
    const n = Number(s);
    return Number.isNaN(n) ? null : Math.trunc(n);
  });
  if (normalizedSeatIds.some(x => x === null)) {
    // client provided invalid seat identifiers (probably label strings like 'C8')
    const err = new Error('Invalid seat_ids: must be numeric database seat ids');
    err.code = 'INVALID_SEAT_IDS';
    throw err;
  }
  // use normalized numeric ids from here on
  seat_ids = normalizedSeatIds;

  const t = await sequelize.transaction();
  let rolledBack = false;
  try {
    // Refresh bookings that conflict: any booking for same showtime and seat where status='booked' OR (status='locked' AND not expired)
    const now = new Date();

    const conflictBookings = await Booking.findAll({
      where: {
        showtime_id,
        status: { [Sequelize.Op.notIn]: ['cancelled', 'expired'] }
      },
      include: [{ model: BookingSeat, where: { seat_id: seat_ids }, attributes: ['seat_id'] }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    // Filter conflicts where booking is 'confirmed' OR (locked and not expired)
    const conflicts = [];
    for (const b of conflictBookings) {
      if (b.status === 'confirmed') {
        conflicts.push(...b.BookingSeats?.map(x => x.seat_id) || []);
      } else if (b.status === 'locked') {
        if (!b.expire_at || new Date(b.expire_at) > now) {
          conflicts.push(...b.BookingSeats?.map(x => x.seat_id) || []);
        }
      }
    }

    if (conflicts.length > 0) {
      if (!rolledBack) { await t.rollback(); rolledBack = true; }
      return { success: false, conflicts: Array.from(new Set(conflicts)) };
    }

    // Create booking (locked)
    // Use server-side datetime to avoid timezone-formatted strings which SQL Server
    // may not parse correctly (e.g. '2025-10-10 11:41:56.279 +00:00')
    const booking = await Booking.create({
      user_id,
      showtime_id,
      booking_code: uuidv4(),
      total_price: 0,
      status: 'locked',
      created_at: Sequelize.literal('SYSUTCDATETIME()'),
      expire_at: Sequelize.literal(`DATEADD(SECOND, ${Number(holdSeconds)}, SYSUTCDATETIME())`)
    }, { transaction: t });

    // load showtime base price
    const showtime = await Showtime.findByPk(showtime_id, { transaction: t });

    // Insert booking_seats with price
    const seatRows = await Seat.findAll({ where: { id: seat_ids }, transaction: t });
    const bookingSeatCreates = seatRows.map(s => ({
      booking_id: booking.id,
      seat_id: s.id,
      price: (showtime?.base_price || 0) * (s.price_modifier || 1)
    }));

    await BookingSeat.bulkCreate(bookingSeatCreates, { transaction: t });

    // update total price
    const total = bookingSeatCreates.reduce((acc, x) => acc + Number(x.price || 0), 0);
    booking.total_price = total;
    await booking.save({ transaction: t });

    await t.commit();
    return { success: true, booking: booking.toJSON() };
  } catch (err) {
    if (!rolledBack) {
      try { await t.rollback(); } catch (e) { /* ignore rollback error */ }
      rolledBack = true;
    }
    throw err;
  }
};

// Confirm payment: convert locked booking to booked and create payment record
export const confirmPayment = async ({ booking_id, payment_method = 'unknown', payment_payload = {} }) => {
  const t = await sequelize.transaction();
  let rolledBack = false;
  try {
    const booking = await Booking.findByPk(booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) {
      if (!rolledBack) { await t.rollback(); rolledBack = true; }
      return { success: false, message: 'Booking not found' };
    }

    const now = new Date();
    if (booking.status !== 'locked') {
      if (!rolledBack) { await t.rollback(); rolledBack = true; }
      return { success: false, message: 'Booking not in locked state' };
    }
    if (booking.expire_at && new Date(booking.expire_at) <= now) {
      booking.status = 'expired';
      await booking.save({ transaction: t });
      await t.commit();
      return { success: false, message: 'Booking expired' };
    }

    // create payment record
    const payment = await Payment.create({
      booking_id: booking.id,
      payment_method,
      payment_code: uuidv4(),
      amount: booking.total_price,
      qr_url: null,
      expire_at: null,
      status: 'paid',
      transaction_ref: payment_payload.transaction_ref || null,
      response_code: payment_payload.response_code || null,
      secure_hash: null,
      created_at: now
    }, { transaction: t });

    // update booking status
    booking.status = 'confirmed';
    await booking.save({ transaction: t });

    await t.commit();
    return { success: true, booking: booking.toJSON(), payment: payment.toJSON() };
  } catch (err) {
    if (!rolledBack) {
      try { await t.rollback(); } catch (e) { /* ignore rollback error */ }
      rolledBack = true;
    }
    throw err;
  }
};

// Expire locked bookings whose expire_at < now
export const expireLockedBookings = async () => {
  try {
    // Use server-side datetime to avoid client-side string formatting issues
    // SQL Server can fail to parse timezone-formatted strings, so compare
    // expire_at < SYSUTCDATETIME() on the server instead of passing a JS Date
    const [updated] = await Booking.update(
      { status: 'expired' },
      {
        where: {
          status: 'locked',
          expire_at: { [Sequelize.Op.lt]: Sequelize.literal('SYSUTCDATETIME()') }
        }
      }
    );
    return updated; // number of rows updated
  } catch (err) {
    console.error('Error expiring bookings', err && err.stack ? err.stack : err);
    return 0;
  }
};

// Get user bookings with related data
export const getUserBookings = async (userId) => {
  try {
    console.log('Getting bookings for user:', userId);
    
    // Back to Showtime-only join + manual Movie lookup
    const bookings = await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Showtime,
          attributes: ['id', 'movie_id', 'hall_id', 'start_time', 'end_time', 'base_price']
        },
        {
          model: BookingSeat,
          include: [{
            model: Seat,
            attributes: ['id', 'row_name', 'seat_number', 'seat_type', 'price_modifier']
          }],
          attributes: ['id', 'seat_id', 'price']
        }
      ],
      attributes: ['id', 'booking_code', 'total_price', 'status', 'created_at', 'expire_at'],
      order: [['created_at', 'DESC']]
    });

    console.log('Found bookings with showtimes:', bookings.length);

    // Get unique movie IDs and fetch movies separately
    const { Movie } = await import('../models/index.js');
    const movieIds = [...new Set(bookings.map(b => b.Showtime?.movie_id).filter(Boolean))];
    console.log('Loading movies for IDs:', movieIds);
    
    const movies = await Movie.findAll({
      where: { id: movieIds },
      attributes: ['id', 'title', 'poster_url', 'duration_minutes'] // Use correct DB column names
    });
    
    const movieMap = movies.reduce((acc, movie) => {
      acc[movie.id] = {
        id: movie.id,
        title: movie.name,      // Map name to title for frontend
        poster: movie.poster_url, // Map poster_url to poster
        duration: movie.duration_minutes // Map duration_minutes to duration
      };
      return acc;
    }, {});
    
    console.log('Loaded movies:', Object.keys(movieMap));

    // Return with manual movie lookup (avoid join issues)
    return bookings.map(booking => ({
      id: booking.id,
      booking_code: booking.booking_code,
      total_price: booking.total_price,
      status: booking.status,
      created_at: booking.created_at,
      expire_at: booking.expire_at,
      movie: booking.Showtime?.movie_id && movieMap[booking.Showtime.movie_id] ? {
        id: movieMap[booking.Showtime.movie_id].id,
        title: movieMap[booking.Showtime.movie_id].title,
        poster: movieMap[booking.Showtime.movie_id].poster,
        duration: movieMap[booking.Showtime.movie_id].duration
      } : {
        id: booking.Showtime?.movie_id || 1,
        title: `Movie ${booking.Showtime?.movie_id || 'Unknown'}`,
        poster: '/placeholder.jpg',
        duration: 120
      },
      showtime: booking.Showtime ? {
        id: booking.Showtime.id,
        hall_id: booking.Showtime.hall_id,
        start_time: booking.Showtime.start_time,
        end_time: booking.Showtime.end_time,
        base_price: booking.Showtime.base_price
      } : null,
      seats: booking.BookingSeats ? booking.BookingSeats.map(bookingSeat => ({
        id: bookingSeat.Seat?.id || bookingSeat.seat_id,
        row: bookingSeat.Seat?.row_name || 'A',
        number: bookingSeat.Seat?.seat_number || 1,
        type: bookingSeat.Seat?.seat_type || 'regular',
        price: bookingSeat.price || 0,
        displayName: bookingSeat.Seat ? `${bookingSeat.Seat.row_name}${bookingSeat.Seat.seat_number}` : `A${bookingSeat.seat_id}`
      })) : [],
      payment: null
    }));
  } catch (err) {
    console.error('Error getting user bookings:', err);
    throw err;
  }
};

// Create a Sepay QR (mock) and store a pending Payment record with qr_url and expire_at
export const createSepayQR = async ({ booking_id, expiresIn = 60 }) => {
  const booking = await Booking.findByPk(booking_id);
  if (!booking) throw new Error('Booking not found');
  // generate a VietQR-like image URL if account configured, otherwise fallback to Google Charts
  const sepayAccount = process.env.SEPAY_ACCOUNT || '02042004666';
  const amount = Number(booking.total_price || 0);
  // Example: https://img.vietqr.io/image/TPB-02042004666-compact2.png?amount=120000&addInfo=BOOK456
  let qrUrl;
  if (sepayAccount) {
    // Use numeric booking id in addInfo so webhook regex like /BOOK\d+/ can extract it
    const addInfo = encodeURIComponent(`BOOK${booking.id}`);
    qrUrl = `https://img.vietqr.io/image/TPB-${sepayAccount}-compact2.png?amount=${amount}&addInfo=${addInfo}`;
  } else {
    const qrData = encodeURIComponent(`PAY:${booking.booking_code};AMT:${amount}`);
    qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${qrData}`;
  }
  const expireAt = new Date(Date.now() + expiresIn * 1000);

  // create or update a pending payment record
  const payment = await Payment.create({
    booking_id: booking.id,
    payment_method: 'sepay',
    payment_code: uuidv4(),
    amount: booking.total_price,
    qr_url: qrUrl,
    expire_at: expireAt,
    status: 'pending',
    created_at: new Date()
  });

  return { qr_url: qrUrl, expires_in: expiresIn, expires_at: expireAt.toISOString(), payment_id: payment.id };
};

export const getBookingStatus = async ({ booking_id }) => {
  const booking = await Booking.findByPk(booking_id, { attributes: ['id', 'status', 'booking_code'] });
  if (!booking) return null;
  return { id: booking.id, status: booking.status, booking_code: booking.booking_code };
};

export default {
  lockSeats,
  confirmPayment,
  expireLockedBookings,
  getUserBookings,
  createSepayQR,
  getBookingStatus
};




