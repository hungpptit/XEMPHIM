import { Booking, BookingSeat, Seat, Showtime, Payment, sequelize, Sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';
import zalopayService from './zalopayService.js';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import path from 'path';

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

      // Find existing pending payment or create new one
      let payment = await Payment.findOne({
        where: { booking_id: booking.id, status: 'pending' },
        order: [['created_at', 'DESC']],
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (payment) {
        // Update existing pending payment to paid
        payment.status = 'paid';
        payment.payment_method = payment_method;
        // Update transaction_ref with zp_trans_id from callback (important for refunds!)
        if (payment_payload.transaction_ref) {
          payment.transaction_ref = payment_payload.transaction_ref;
        }
        // Update app_trans_id if provided (always overwrite to ensure it matches the successful transaction)
        if (payment_payload.app_trans_id) {
          payment.payment_code = payment_payload.app_trans_id;
        }
        payment.response_code = payment_payload.response_code || null;
        payment.amount = booking.total_price;
        await payment.save({ transaction: t });
      } else {
        // Create new payment record (fallback for old bookings)
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

      // update booking status
      booking.status = 'confirmed';
      await booking.save({ transaction: t });

      // --- New: generate QR data, save to booking.qr_data and send email ---
      // --- Generate QR data and send ticket email ---
      try {
        if (!booking.qr_token) booking.qr_token = uuidv4();

        const qrJson = JSON.stringify({ booking_id: booking.id, token: booking.qr_token });
        booking.qr_data = qrJson;
        await booking.save({ transaction: t }); // save 1 lần duy nhất

        // ✅ Tạo QR code dạng buffer (thay vì base64)
        const qrBuffer = await QRCode.toBuffer(qrJson, { errorCorrectionLevel: 'H' });

        // ✅ Lấy thông tin vé
        const user = await booking.getUser({ transaction: t });
        const showtime = await booking.getShowtime({ transaction: t });
        const movie = await showtime.getMovie({ transaction: t });
        const seats = await BookingSeat.findAll({
          where: { booking_id: booking.id },
          include: [{ model: Seat }],
          transaction: t
        });
        const seatList = seats.map(s => `${s.Seat.row_name}${s.Seat.seat_number}`).join(', ');

        const formattedTime = new Date(showtime.start_time)
          .toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' });
        const formattedPrice = Number(booking.total_price).toLocaleString('vi-VN') + ' ₫';

        // ✅ HTML mail có ảnh QR inline (cid)
        const mailHtml = `
          <h2>🎟 Vé xem phim - ${movie.title}</h2>
          <img src="${movie.poster_url}" alt="Poster phim" width="200" style="border-radius:10px; margin-bottom:10px;">
          
          <p><strong>Phim:</strong> ${movie.title}</p>
          <p><strong>Suất chiếu:</strong> ${formattedTime}</p>
          <p><strong>Rạp:</strong> ${showtime.hall_id}</p>
          <p><strong>Ghế:</strong> ${seatList}</p>
          <p><strong>Tổng tiền:</strong> ${formattedPrice}</p>
          <p><strong>Mã vé:</strong> ${booking.booking_code}</p>
          
          <p><img src="cid:ticket_qr_${booking.id}" alt="QR code" width="180" height="180"/></p>
          <p><i>Vui lòng xuất trình mã QR này tại quầy soát vé.</i></p>
        `;

        // ✅ Gửi mail qua Gmail
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_FROM || `"XemPhim PTIT" <${process.env.EMAIL_USER}>`,
          to: user?.email || process.env.DEV_MAIL_TO || 'user@example.com',
          subject: `🎟 Vé xem phim - ${movie.title}`,
          html: mailHtml,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrBuffer,
              cid: `ticket_qr_${booking.id}` // 👈 phải trùng với src="cid:..."
            }
          ]
        };

        transporter.sendMail(mailOptions)
          .then(info => console.log(`📧 [Email] Ticket sent to ${user?.email}:`, info.response))
          .catch(err => console.error('❌ [Email] Send failed:', err.message));

      } catch (emailErr) {
        console.error('❌ [Booking] QR/email error:', emailErr.message);
        // Không rollback nếu lỗi mail
      }

      // --- End QR + email block ---
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
      attributes: ['id', 'booking_code', 'total_price', 'status', 'created_at', 'expire_at','qr_token','qr_data','checked_in'],
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
        title: movie.title,      // Map name to title for frontend
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

// Create ZaloPay QR Dynamic Order
export const createZaloPayQR = async ({ booking_id, expiresIn = 300 }) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) throw new Error('Booking not found');
    
    const amount = Number(booking.total_price || 0);
    const now = new Date();
    
    // Lock and check for existing pending Payment
    let payment = await Payment.findOne({
      where: { booking_id: booking.id, status: 'pending' },
      order: [['created_at', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    // Create ZaloPay order
    const zalopayResult = await zalopayService.createOrder({
      booking_id: booking.id,
      booking_code: booking.booking_code,
      amount: amount,
      description: `Thanh toan ve phim ${booking.booking_code}`
    });
    
    if (!zalopayResult.success) {
      await t.rollback();
      throw new Error(`ZaloPay order creation failed: ${zalopayResult.return_message}`);
    }
    
    const expireAt = new Date(Date.now() + expiresIn * 1000);
    
    if (payment && payment.expire_at && new Date(payment.expire_at) > now) {
      // Reuse existing payment record
      payment.qr_url = zalopayResult.order_url;
      payment.payment_code = zalopayResult.app_trans_id;
      payment.transaction_ref = zalopayResult.zp_trans_token;
      payment.expire_at = expireAt;
      await payment.save({ transaction: t });
    } else {
      // Create new pending payment record
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
          // Another transaction created a pending payment concurrently
          payment = await Payment.findOne({
            where: { booking_id: booking.id, status: 'pending' },
            order: [['created_at', 'DESC']],
            transaction: t
          });
        } else {
          throw err;
        }
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
    await t.rollback();
    console.error('Error creating ZaloPay QR:', err);
    throw err;
  }
};

// Keep old function for backward compatibility (deprecated)
export const createSepayQR = createZaloPayQR;

export const getBookingStatus = async ({ booking_id }) => {
  const booking = await Booking.findByPk(booking_id, { attributes: ['id', 'status', 'booking_code'] });
  if (!booking) return null;
  return { id: booking.id, status: booking.status, booking_code: booking.booking_code };
};

// Cancel a booking (user action before payment)
export const cancelBooking = async ({ booking_id }) => {
  const t = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(booking_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!booking) { await t.rollback(); return { success: false, message: 'Booking not found' }; }
    if (booking.status === 'confirmed') { await t.rollback(); return { success: false, message: 'Cannot cancel a confirmed booking' }; }
  // Mark booking as cancelled
  booking.status = 'cancelled';
    await booking.save({ transaction: t });
    // Mark any pending payments as cancelled as well
    await Payment.update(
      { status: 'cancelled' },
      { where: { booking_id: booking.id, status: 'pending' }, transaction: t }
    );
    await t.commit();
    return { success: true, booking: booking.toJSON() };
  } catch (err) {
    try { await t.rollback(); } catch (e) { }
    throw err;
  }
};

// Refund a booking (after paid) - với ZaloPay integration
export const refundBooking = async ({ booking_id, user_id, reason = null }) => {
  const t = await sequelize.transaction();
  try {
    // 1. Validate booking exists và thuộc về user
    const booking = await Booking.findByPk(booking_id, { 
      include: [
        {
          model: Showtime,
          attributes: ['id', 'start_time', 'movie_id', 'hall_id']
        },
        {
          model: BookingSeat,
          include: [{
            model: Seat,
            attributes: ['id', 'row_name', 'seat_number']
          }]
        }
      ],
      transaction: t, 
      lock: t.LOCK.UPDATE 
    });
    
    if (!booking) { 
      await t.rollback(); 
      return { success: false, message: 'Booking not found' }; 
    }
    
    // Check ownership
    if (booking.user_id !== user_id) {
      await t.rollback();
      return { success: false, message: 'Unauthorized: This booking does not belong to you' };
    }
    
    // 2. Validate booking status = 'confirmed' (đã thanh toán)
    if (booking.status !== 'confirmed') { 
      await t.rollback(); 
      return { success: false, message: 'Only confirmed (paid) bookings can be refunded' }; 
    }

    // 3. Check showtime exists
    if (!booking.Showtime) {
      await t.rollback();
      return { success: false, message: 'Showtime not found for this booking' };
    }

    // 4. Validate thời gian: phải trước showtime ít nhất 2 tiếng (7200 seconds)
    const showtimeStart = new Date(booking.Showtime.start_time);
    const now = new Date();
    const timeDiffSeconds = (showtimeStart - now) / 1000;
    
    if (timeDiffSeconds < 7200) {
      await t.rollback();
      return { 
        success: false, 
        message: `Cannot refund: Showtime starts in less than 2 hours. Refund must be requested at least 2 hours before showtime.`,
        showtime_start: showtimeStart,
        time_remaining_seconds: Math.max(0, Math.floor(timeDiffSeconds))
      };
    }

    // 5. Find original payment (paid) - MUST have transaction_ref (zp_trans_id from callback)
    console.log('🔍 [Refund] Looking for paid payment with transaction_ref for booking:', booking_id);
    
    const originalPayment = await Payment.findOne({
      where: { 
        booking_id: booking.id, 
        status: 'paid',
        transaction_ref: { [Sequelize.Op.ne]: null } // Must have zp_trans_id
      },
      order: [['created_at', 'DESC']], // Get LATEST paid payment with callback
      transaction: t
    });

    console.log('🔍 [Refund] Found payment:', originalPayment ? {
      id: originalPayment.id,
      payment_code: originalPayment.payment_code,
      transaction_ref: originalPayment.transaction_ref,
      status: originalPayment.status,
      created_at: originalPayment.created_at
    } : null);

    if (!originalPayment) {
      await t.rollback();
      
      // Debug: Check if there are ANY paid payments
      const anyPaidPayment = await Payment.findOne({
        where: { booking_id: booking.id, status: 'paid' },
        order: [['created_at', 'DESC']]
      });
      
      console.log('⚠️ [Refund] Any paid payment (even without transaction_ref):', anyPaidPayment ? {
        id: anyPaidPayment.id,
        payment_code: anyPaidPayment.payment_code,
        transaction_ref: anyPaidPayment.transaction_ref,
        status: anyPaidPayment.status
      } : 'NONE');
      
      return { 
        success: false, 
        message: 'No valid paid payment found for this booking. Payment may not have been completed through ZaloPay callback.' 
      };
    }

    // 6. Check if payment was via ZaloPay (có transaction_ref = zp_trans_id)
    const isZaloPay = originalPayment.payment_method === 'zalopay' && originalPayment.transaction_ref;
    let zalopayRefundResult = null;

    if (isZaloPay) {
      // Validate zp_trans_id format (should be like "251024000113499")
      const zpTransId = String(originalPayment.transaction_ref); // Convert to string in case it's number
      const appTransId = originalPayment.payment_code; // app_trans_id used to create the order
      
      console.log('🔍 [Refund] Payment details:', {
        payment_id: originalPayment.id,
        payment_method: originalPayment.payment_method,
        payment_code: appTransId,
        transaction_ref: zpTransId,
        amount: originalPayment.amount,
        created_at: originalPayment.created_at
      });
      
      if (!zpTransId || zpTransId.length < 10) {
        await t.rollback();
        return { 
          success: false, 
          message: 'Invalid ZaloPay transaction ID. This booking may not have been paid through ZaloPay properly.',
          hint: 'Please contact support for manual refund processing.'
        };
      }

      // IMPORTANT: Query ZaloPay using app_trans_id (not zp_trans_id) to verify transaction
      try {
        console.log('🔍 [Refund] Verifying transaction with ZaloPay using app_trans_id:', appTransId);
        const queryResult = await zalopayService.queryOrder(appTransId);
        
        console.log('📊 [Refund] ZaloPay query result:', queryResult);
        
        if (queryResult.return_code !== 1) {
          await t.rollback();
          return {
            success: false,
            message: `Cannot refund: Original transaction not found or not successful in ZaloPay system.`,
            zalopay_query: queryResult,
            hint: 'This transaction may not have been completed successfully. Please verify payment status first.'
          };
        }
        
        // Verify zp_trans_id from query matches our stored value
        const queryZpTransId = String(queryResult.zp_trans_id);
        if (queryZpTransId && queryZpTransId !== zpTransId) {
          console.warn(`⚠️ [Refund] zp_trans_id mismatch! Stored: ${zpTransId}, ZaloPay: ${queryZpTransId}`);
          // Update our stored value to match ZaloPay's
          console.log(`🔄 [Refund] Updating transaction_ref to: ${queryZpTransId}`);
        }
        
      } catch (queryError) {
        console.error('❌ [Refund] Error querying ZaloPay:', queryError);
        await t.rollback();
        return {
          success: false,
          message: 'Failed to verify transaction status with ZaloPay. Please try again later.',
          error: queryError.message
        };
      }

      // Call ZaloPay refund API using zp_trans_id
      try {
        console.log('💸 [Refund] Calling ZaloPay refund API with zp_trans_id:', zpTransId);
        
        zalopayRefundResult = await zalopayService.refundOrder({
          zp_trans_id: zpTransId,
          amount: booking.total_price,
          description: reason || `Refund booking ${booking.booking_code}`,
          booking_id: booking.id
        });

        if (!zalopayRefundResult.success) {
          await t.rollback();
          return { 
            success: false, 
            message: `ZaloPay refund failed: ${zalopayRefundResult.return_message || 'Unknown error'}`,
            zalopay_error: {
              return_code: zalopayRefundResult.return_code,
              sub_return_code: zalopayRefundResult.sub_return_code,
              sub_return_message: zalopayRefundResult.sub_return_message
            },
            hint: zalopayRefundResult.sub_return_code === -401 
              ? 'Invalid transaction data. This booking may not have been paid through ZaloPay.'
              : 'Please try again later or contact support.'
          };
        }
      } catch (error) {
        await t.rollback();
        console.error('ZaloPay refund API error:', error);
        return { 
          success: false, 
          message: `ZaloPay refund request failed: ${error.message}`,
          error: error.message
        };
      }
    } else {
      // Non-ZaloPay payment (manual refund required)
      console.warn(`⚠️ Booking ${booking_id} was not paid via ZaloPay. Payment method: ${originalPayment.payment_method}. Manual refund required.`);
    }

    // 7. Create refund record as Payment with status 'refunded'
    const refund = await Payment.create({
      booking_id: booking.id,
      payment_method: isZaloPay ? 'zalopay_refund' : 'refund',
      payment_code: zalopayRefundResult?.m_refund_id || `REFUND-${uuidv4()}`,
      amount: -(booking.total_price || 0), // Negative amount for refund
      qr_url: null,
      expire_at: null,
      status: 'refunded',
      transaction_ref: zalopayRefundResult?.refund_id ? String(zalopayRefundResult.refund_id) : null,
      response_code: zalopayRefundResult?.return_code ? String(zalopayRefundResult.return_code) : null,
      secure_hash: reason || 'User requested refund',
      created_at: new Date()
    }, { transaction: t });

    // 8. Mark original payment as refunded
    originalPayment.status = 'refunded';
    await originalPayment.save({ transaction: t });

    // 9. Update booking status to 'refunded'
    booking.status = 'refunded';
    await booking.save({ transaction: t });

    await t.commit();
    
    // Message based on ZaloPay refund status
    let refundMessage = 'Booking refunded successfully.';
    if (isZaloPay && zalopayRefundResult) {
      if (zalopayRefundResult.return_code === 1) {
        refundMessage = 'Hoàn tiền thành công! Tiền đã được hoàn vào tài khoản ZaloPay của bạn.';
      } else if (zalopayRefundResult.return_code === 3) {
        refundMessage = 'Yêu cầu hoàn tiền đã được gửi đến ZaloPay! Tiền sẽ được hoàn vào tài khoản ZaloPay của bạn trong vòng 1-3 ngày làm việc.';
      } else {
        refundMessage = 'Refund request sent to ZaloPay. Please check your ZaloPay account.';
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

// Expire pending payments (called by cron job)
export const expirePendingPayments = async () => {
  try {
    const now = new Date();
    // Set payments with expire_at < now and status='pending' -> 'expired'
    const [updatedPayments] = await Payment.update({ status: 'expired' }, { where: { status: 'pending', expire_at: { [Sequelize.Op.lt]: now } } });

    // For each affected booking, if booking still locked, mark booking expired
    if (updatedPayments > 0) {
      await Booking.update({ status: 'expired' }, { where: { status: 'locked' }, transaction: null });
    }
    return updatedPayments;
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
  createSepayQR,
  createZaloPayQR,
  getBookingStatus,
  cancelBooking,
  refundBooking,
  expirePendingPayments
};






