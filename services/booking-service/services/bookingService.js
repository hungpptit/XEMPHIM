import { Booking, BookingSeat, Seat, Showtime, Movie, Payment, sequelize, Sequelize, CinemaHall, Cinema } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import amqp from 'amqplib';
import axios from 'axios';

const PAYMENT_SERVICE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4005';

// Initialize Redis client with fallback
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis] REDIS_URL not configured. Distributed locking is disabled; falling back to DB transaction locks.');
}

// RabbitMQ notification publisher helper
async function publishNotification(msg) {
  const mqUrl = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL;
  if (!mqUrl) {
    console.warn('⚠️ [RabbitMQ] CLOUDAMQP_URL/RABBITMQ_URL not configured. Email notification message cannot be published.');
    return;
  }
  try {
    const conn = await amqp.connect(mqUrl);
    const channel = await conn.createChannel();
    const queue = 'ticket.notifications';
    
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), { persistent: true });
    console.log(`📤 [RabbitMQ] Published ticket notification message to queue '${queue}'`);
    
    await channel.close();
    await conn.close();
  } catch (err) {
    console.error('❌ [RabbitMQ] Error publishing notification message:', err.message);
  }
}

// Helper to acquire seat locks via Redis
async function acquireSeatLocks(showtimeId, seatIds, ttlMs = 120000) {
  if (!redis) return true; // fallback to DB lock
  const acquiredKeys = [];
  try {
    for (const seatId of seatIds) {
      const key = `lock:showtime:${showtimeId}:seat:${seatId}`;
      const success = await redis.set(key, 'locked', 'NX', 'PX', ttlMs);
      if (!success) {
        // Release previously acquired keys in this transaction
        for (const k of acquiredKeys) {
          await redis.del(k);
        }
        return false; // Lock conflict
      }
      acquiredKeys.push(key);
    }
    return true;
  } catch (err) {
    console.error('❌ [Redis Lock Error] Failed to acquire locks:', err.message);
    return true; // Proceed with DB fallback lock if Redis fails
  }
}

// Helper to release seat locks via Redis
async function releaseSeatLocks(showtimeId, seatIds) {
  if (!redis || seatIds.length === 0) return;
  try {
    const keys = seatIds.map(seatId => `lock:showtime:${showtimeId}:seat:${seatId}`);
    await redis.del(...keys);
  } catch (err) {
    console.error('❌ [Redis Lock Error] Failed to release locks:', err.message);
  }
}

// Lock seats: create a booking with status='locked' and booking_seats
export const lockSeats = async ({ user_id, showtime_id, seat_ids = [], holdSeconds = 120 }) => {
  if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw new Error('seat_ids required');
  }

  const normalizedSeatIds = seat_ids.map(s => {
    const n = Number(s);
    return Number.isNaN(n) ? null : Math.trunc(n);
  });
  if (normalizedSeatIds.some(x => x === null)) {
    const err = new Error('Invalid seat_ids: must be numeric database seat ids');
    err.code = 'INVALID_SEAT_IDS';
    throw err;
  }
  const targetSeatIds = normalizedSeatIds;

  // 1. Try to acquire distributed locks in Redis
  const lockedInRedis = await acquireSeatLocks(showtime_id, targetSeatIds, holdSeconds * 1000);
  if (!lockedInRedis) {
    // Conflict immediately
    return { success: false, conflicts: targetSeatIds };
  }

  const t = await sequelize.transaction();
  let rolledBack = false;
  try {
    const now = new Date();

    // 2. Perform DB checks (conflict verification & backup lock)
    const conflictBookings = await Booking.findAll({
      where: {
        showtime_id,
        status: { [Sequelize.Op.notIn]: ['cancelled', 'expired'] }
      },
      include: [{ model: BookingSeat, where: { seat_id: targetSeatIds }, attributes: ['seat_id'] }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

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
      await releaseSeatLocks(showtime_id, targetSeatIds);
      if (!rolledBack) { await t.rollback(); rolledBack = true; }
      return { success: false, conflicts: Array.from(new Set(conflicts)) };
    }

    // Create booking (locked)
    const booking = await Booking.create({
      user_id,
      showtime_id,
      booking_code: uuidv4(),
      total_price: 0,
      status: 'locked',
      created_at: Sequelize.literal('SYSUTCDATETIME()'),
      expire_at: Sequelize.literal(`DATEADD(SECOND, ${Number(holdSeconds)}, SYSUTCDATETIME())`)
    }, { transaction: t });

    const showtime = await Showtime.findByPk(showtime_id, { transaction: t });

    const seatRows = await Seat.findAll({ where: { id: targetSeatIds }, transaction: t });
    const bookingSeatCreates = seatRows.map(s => ({
      booking_id: booking.id,
      seat_id: s.id,
      price: (showtime?.base_price || 0) + (Number(s.price_modifier) || 0)
    }));

    await BookingSeat.bulkCreate(bookingSeatCreates, { transaction: t });

    const total = bookingSeatCreates.reduce((acc, x) => acc + Number(x.price || 0), 0);
    booking.total_price = total;
    await booking.save({ transaction: t });

    await t.commit();
    return { success: true, booking: booking.toJSON() };
  } catch (err) {
    await releaseSeatLocks(showtime_id, targetSeatIds);
    if (!rolledBack) {
      try { await t.rollback(); } catch (e) { }
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

    let payment = await Payment.findOne({
      where: { booking_id: booking.id, status: 'pending' },
      order: [['created_at', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (payment) {
      payment.status = 'paid';
      payment.payment_method = payment_method;
      if (payment_payload.transaction_ref) {
        payment.transaction_ref = payment_payload.transaction_ref;
      }
      if (payment_payload.app_trans_id) {
        payment.payment_code = payment_payload.app_trans_id;
      }
      payment.response_code = payment_payload.response_code || null;
      payment.amount = booking.total_price;
      await payment.save({ transaction: t });
    } else {
      payment = await Payment.create({
        booking_id: booking.id,
        payment_method,
        payment_code: payment_payload.app_trans_id || uuidv4(),
        amount: booking.total_price,
        qr_url: null,
        expire_at: null,
        status: 'paid',
        transaction_ref: payment_payload.transaction_ref || null,
        response_code: payment_payload.response_code || null,
        secure_hash: null,
        created_at: now
      }, { transaction: t });
    }

    booking.status = 'confirmed';
    if (!booking.qr_token) booking.qr_token = uuidv4();
    const qrJson = JSON.stringify({ booking_id: booking.id, token: booking.qr_token });
    booking.qr_data = qrJson;
    await booking.save({ transaction: t });

    // Fetch related detail info for email notification
    const user = await booking.getUser({ transaction: t });
    const showtime = await booking.getShowtime({ transaction: t });
    const movie = await showtime.getMovie({ transaction: t });
    const seats = await BookingSeat.findAll({
      where: { booking_id: booking.id },
      include: [{ model: Seat }],
      transaction: t
    });
    const seatList = seats.map(s => `${s.Seat.row_name}${s.Seat.seat_number}`).join(', ');

    // Release Redis lock since booking is completed successfully
    const seatIds = seats.map(s => s.seat_id);
    await releaseSeatLocks(booking.showtime_id, seatIds);

    await t.commit();

    // Publish to notification service queue
    const formattedTime = new Date(showtime.start_time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });
    const formattedPrice = Number(booking.total_price).toLocaleString('vi-VN') + ' ₫';

    const notificationPayload = {
      booking_id: booking.id,
      booking_code: booking.booking_code,
      user_email: user?.email || 'user@example.com',
      movie_title: movie?.title || 'Phim mới',
      poster_url: movie?.poster_url,
      formatted_time: formattedTime,
      hall_name: String(showtime.hall_id),
      seat_list: seatList,
      total_price: formattedPrice,
      qr_data: qrJson
    };
    await publishNotification(notificationPayload);

    return { success: true, booking: booking.toJSON(), payment: payment.toJSON() };
  } catch (err) {
    if (!rolledBack) {
      try { await t.rollback(); } catch (e) { }
      rolledBack = true;
    }
    throw err;
  }
};

// Expire locked bookings whose expire_at < now
export const expireLockedBookings = async () => {
  try {
    // 1. Find bookings that are about to expire to release their locks in Redis
    const expiredBookings = await Booking.findAll({
      where: {
        status: 'locked',
        expire_at: { [Sequelize.Op.lt]: Sequelize.literal('SYSUTCDATETIME()') }
      },
      include: [{ model: BookingSeat, attributes: ['seat_id'] }]
    });

    for (const b of expiredBookings) {
      const seatIds = b.BookingSeats?.map(x => x.seat_id) || [];
      await releaseSeatLocks(b.showtime_id, seatIds);
    }

    // 2. Mark them as expired in SQL Server
    const [updated] = await Booking.update(
      { status: 'expired' },
      {
        where: {
          status: 'locked',
          expire_at: { [Sequelize.Op.lt]: Sequelize.literal('SYSUTCDATETIME()') }
        }
      }
    );
    return updated;
  } catch (err) {
    console.error('Error expiring bookings', err && err.stack ? err.stack : err);
    return 0;
  }
};

// Get user bookings with related data
export const getUserBookings = async (userId) => {
  try {
    console.log('Getting bookings for user:', userId);
    
    const bookings = await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Showtime,
          attributes: ['id', 'movie_id', 'hall_id', 'start_time', 'end_time', 'base_price'],
          include: [
            {
              model: CinemaHall,
              attributes: ['id', 'name', 'cinema_id'],
              include: [
                {
                  model: Cinema,
                  attributes: ['id', 'name', 'address', 'city']
                }
              ]
            }
          ]
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
      attributes: ['id', 'booking_code', 'total_price', 'status', 'created_at', 'expire_at','qr_token','qr_data','checked_in'],
      order: [['created_at', 'DESC']]
    });

    const movieIds = [...new Set(bookings.map(b => b.Showtime?.movie_id).filter(Boolean))];
    const movies = await Movie.findAll({
      where: { id: movieIds },
      attributes: ['id', 'title', 'poster_url']
    });
    
    const movieMap = movies.reduce((acc, movie) => {
      acc[movie.id] = {
        id: movie.id,
        title: movie.title,
        poster: movie.poster_url,
        duration: 120
      };
      return acc;
    }, {});
    
    return bookings.map(booking => ({
      id: booking.id,
      booking_code: booking.booking_code,
      total_price: booking.total_price,
      status: booking.status,
      created_at: booking.created_at,
      expire_at: booking.expire_at,
      qr_token: booking.qr_token || null,
      qr_data: booking.qr_data || null,
      checked_in: booking.checked_in || false,
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

// Create ZaloPay QR Order (integrates with Payment Service HTTP REST call)
// Lưu ý: return_code: 1 từ ZaloPay = tạo ORDER thành công (không phải thanh toán thành công)
// Mỗi lần gọi (kể cả refresh) sẽ tạo 1 app_trans_id mới — đây là bình thường.
export const createZaloPayQR = async ({ booking_id, expiresIn = 300 }) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) throw new Error('Booking not found');

    // Không tạo QR nếu booking đã hết hạn hoặc đã bị cancel/confirmed
    if (booking.status === 'expired' || booking.status === 'cancelled') {
      await t.rollback();
      throw new Error(`Booking is ${booking.status}, cannot create new QR`);
    }

    const amount = Number(booking.total_price || 0);
    const now = new Date();

    // Void các payment pending cũ nếu có (để tránh rác trong DB khi refresh nhiều lần)
    await Payment.update(
      { status: 'void' },
      { where: { booking_id: booking.id, status: 'pending' }, transaction: t }
    );

    // Call external Payment Service to create NEW ZaloPay order
    let zalopayResult;
    try {
      const response = await axios.post(`${PAYMENT_SERVICE}/api/payments/orders`, {
        booking_id: booking.id,
        booking_code: booking.booking_code,
        amount: amount,
        description: `Thanh toan ve phim ${booking.booking_code}`
      });
      zalopayResult = response.data;
      // return_code: 1 từ ZaloPay = tạo order thành công (KHÔNG phải đã thanh toán)
      console.log(`ℹ️ [ZaloPay] Order created (return_code=1 means order created, not paid). app_trans_id: ${zalopayResult.app_trans_id}`);
    } catch (apiErr) {
      console.error('❌ Failed calling payment service orders API:', apiErr.message);
      throw new Error(`Payment Gateway Service offline: ${apiErr.message}`);
    }

    if (!zalopayResult.success) {
      await t.rollback();
      throw new Error(`ZaloPay order creation failed: ${zalopayResult.return_message}`);
    }

    const expireAt = new Date(Date.now() + expiresIn * 1000);

    // Tạo payment record mới cho order này
    let payment;
    try {
      payment = await Payment.create({
        booking_id: booking.id,
        payment_method: 'zalopay',
        payment_code: zalopayResult.app_trans_id,
        amount: booking.total_price,
        qr_url: zalopayResult.order_url,
        transaction_ref: zalopayResult.zp_trans_token,
        expire_at: expireAt,
        status: 'pending',
        created_at: now
      }, { transaction: t });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        payment = await Payment.findOne({
          where: { booking_id: booking.id, status: 'pending' },
          order: [['created_at', 'DESC']],
          transaction: t
        });
      } else {
        throw err;
      }
    }

    await t.commit();

    return {
      qr_url: zalopayResult.order_url,
      order_token: zalopayResult.zp_trans_token,
      app_trans_id: zalopayResult.app_trans_id,
      expires_in: expiresIn,
      expires_at: expireAt.toISOString(),
      payment_id: payment.id
    };
  } catch (err) {
    try { await t.rollback(); } catch (e) {}
    console.error('Error creating ZaloPay QR:', err);
    throw err;
  }
};


export const getBookingStatus = async ({ booking_id }) => {
  const booking = await Booking.findByPk(booking_id, { attributes: ['id', 'status', 'booking_code'] });
  if (!booking) return null;
  return { id: booking.id, status: booking.status, booking_code: booking.booking_code };
};

// Cancel booking
export const cancelBooking = async ({ booking_id }) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) { await t.rollback(); return { success: false, message: 'Booking not found' }; }
    if (booking.status === 'confirmed') { await t.rollback(); return { success: false, message: 'Cannot cancel a confirmed booking' }; }
    
    booking.status = 'cancelled';
    await booking.save({ transaction: t });
    
    // Release Redis lock as it is cancelled
    const bookingSeats = await BookingSeat.findAll({ where: { booking_id }, transaction: t });
    const seatIds = bookingSeats.map(s => s.seat_id);
    await releaseSeatLocks(booking.showtime_id, seatIds);

    await Payment.update(
      { status: 'void' },
      { where: { booking_id: booking.id, status: 'pending' }, transaction: t }
    );
    await t.commit();
    return { success: true, booking: booking.toJSON() };
  } catch (err) {
    try { await t.rollback(); } catch (e) { }
    throw err;
  }
};

// Refund booking (after paid)
export const refundBooking = async ({ booking_id, user_id, reason = null }) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(booking_id, { 
      include: [
        { model: Showtime, attributes: ['id', 'start_time'] },
        { model: BookingSeat, attributes: ['id', 'seat_id'] }
      ],
      transaction: t, 
      lock: t.LOCK.UPDATE 
    });
    
    if (!booking) {
      await t.rollback();
      return { success: false, message: 'Booking not found' };
    }
    
    if (booking.status !== 'confirmed') {
      await t.rollback();
      return { success: false, message: 'Only confirmed bookings can be refunded' };
    }
    
    const originalPayment = await Payment.findOne({
      where: { booking_id: booking.id, status: 'paid' },
      order: [['created_at', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!originalPayment) {
      await t.rollback();
      return { 
        success: false, 
        message: 'No successful payment record found for this booking.' 
      };
    }
    
    const isZaloPay = originalPayment.payment_method === 'zalopay';
    let zalopayRefundResult = null;
    
    if (isZaloPay) {
      const zpTransId = String(originalPayment.transaction_ref);
      const appTransId = originalPayment.payment_code;
      
      if (!zpTransId || zpTransId.length < 10) {
        await t.rollback();
        return { 
          success: false, 
          message: 'Invalid ZaloPay transaction ID. This booking may not have been paid through ZaloPay properly.'
        };
      }

      // Call external Payment Service to initiate refund
      try {
        const response = await axios.post(`${PAYMENT_SERVICE}/api/payments/refunds`, {
          zp_trans_id: zpTransId,
          app_trans_id: appTransId,
          amount: booking.total_price,
          description: reason || `Refund booking ${booking.booking_code}`,
          booking_id: booking.id
        });
        zalopayRefundResult = response.data;
      } catch (apiErr) {
        console.error('❌ Failed calling payment service refunds API:', apiErr.message);
        await t.rollback();
        return {
          success: false,
          message: `Payment Gateway Service offline. Cannot process refund: ${apiErr.message}`
        };
      }

      if (!zalopayRefundResult.success) {
        await t.rollback();
        return { 
          success: false, 
          message: `ZaloPay refund failed: ${zalopayRefundResult.return_message || 'Unknown error'}`,
          zalopay_error: zalopayRefundResult.zalopay_error || zalopayRefundResult
        };
      }
    }
    
    const refund = await Payment.create({
      booking_id: booking.id,
      payment_method: isZaloPay ? 'zalopay_refund' : 'refund',
      payment_code: zalopayRefundResult?.m_refund_id || `REFUND-${uuidv4()}`,
      amount: -(booking.total_price || 0),
      qr_url: null,
      expire_at: null,
      status: 'refunded',
      transaction_ref: zalopayRefundResult?.refund_id ? String(zalopayRefundResult.refund_id) : null,
      response_code: zalopayRefundResult?.return_code ? String(zalopayRefundResult.return_code) : null,
      secure_hash: reason || 'User requested refund',
      created_at: new Date()
    }, { transaction: t });
    
    originalPayment.status = 'refunded';
    await originalPayment.save({ transaction: t });
    
    booking.status = 'refunded';
    await booking.save({ transaction: t });
    
    await t.commit();
    
    let refundMessage = 'Booking refunded successfully.';
    if (isZaloPay && zalopayRefundResult) {
      if (zalopayRefundResult.return_code === 1) {
        refundMessage = 'Hoàn tiền thành công! Tiền đã được hoàn vào tài khoản ZaloPay của bạn.';
      } else if (zalopayRefundResult.return_code === 3) {
        refundMessage = 'Yêu cầu hoàn tiền đã được gửi đến ZaloPay! Tiền sẽ được hoàn vào tài khoản ZaloPay của bạn.';
      }
    }
    
    return { 
      success: true, 
      booking: booking.toJSON(), 
      refund: refund.toJSON(),
      zalopay_refund: zalopayRefundResult,
      message: refundMessage
    };
  } catch (err) {
    try { await t.rollback(); } catch (e) { }
    console.error('Error refunding booking:', err);
    throw err;
  }
};

// Expire pending payments
export const expirePendingPayments = async () => {
  try {
    const now = new Date();
    // 1. Find pending payments that have expired
    const expiredPayments = await Payment.findAll({
      where: {
        status: 'pending',
        expire_at: { [Sequelize.Op.lt]: now }
      }
    });

    if (expiredPayments.length === 0) return 0;

    const bookingIds = expiredPayments.map(p => p.booking_id);
    const paymentIds = expiredPayments.map(p => p.id);

    // 2. Mark payments as expired
    await Payment.update(
      { status: 'expired' },
      { where: { id: paymentIds } }
    );

    // 3. Find the bookings associated with these expired payments that are still locked
    const bookingsToExpire = await Booking.findAll({
      where: {
        id: bookingIds,
        status: 'locked'
      },
      include: [{ model: BookingSeat, attributes: ['seat_id'] }]
    });

    // 4. Release Redis seat locks for each booking
    for (const b of bookingsToExpire) {
      const seatIds = b.BookingSeats?.map(x => x.seat_id) || [];
      await releaseSeatLocks(b.showtime_id, seatIds);
    }

    // 5. Mark bookings as expired
    if (bookingsToExpire.length > 0) {
      const idsToUpdate = bookingsToExpire.map(b => b.id);
      await Booking.update(
        { status: 'expired' },
        { where: { id: idsToUpdate } }
      );
    }

    return expiredPayments.length;
  } catch (err) {
    console.error('Error expiring pending payments', err && err.stack ? err.stack : err);
    return 0;
  }
};

export default {
  lockSeats,
  confirmPayment,
  expireLockedBookings,
  getUserBookings,
  createZaloPayQR,
  getBookingStatus,
  cancelBooking,
  refundBooking,
  expirePendingPayments
};
