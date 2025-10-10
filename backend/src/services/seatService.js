import { Seat, CinemaHall, Showtime, Booking, BookingSeat, Sequelize } from '../models/index.js';

// 🟢 Lấy tất cả ghế
export const listSeats = async () => {
  return Seat.findAll({
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier'],
    include: [
      {
        model: CinemaHall,
        attributes: ['id', 'name', 'cinema_name']
      }
    ]
  });
};

// 🔵 Lấy ghế theo ID
export const getSeatById = async (id) => {
  return Seat.findByPk(id, {
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier'],
    include: [
      {
        model: CinemaHall,
        attributes: ['id', 'name', 'cinema_name']
      }
    ]
  });
};

// 🟠 Tạo ghế mới
export const createSeat = async (payload) => {
  const seat = await Seat.create({
    hall_id: payload.hall_id,
    row_name: payload.row_name,
    seat_number: payload.seat_number,
    seat_type: payload.seat_type || 'regular',
    price_modifier: payload.price_modifier ?? 1.0
  });
  return seat;
};

// 🟣 Cập nhật ghế
export const updateSeat = async (id, payload) => {
  const seat = await Seat.findByPk(id);
  if (!seat) return null;

  await seat.update({
    hall_id: payload.hall_id ?? seat.hall_id,
    row_name: payload.row_name ?? seat.row_name,
    seat_number: payload.seat_number ?? seat.seat_number,
    seat_type: payload.seat_type ?? seat.seat_type,
    price_modifier: payload.price_modifier ?? seat.price_modifier
  });

  return seat;
};

// 🔴 Xóa ghế
export const deleteSeat = async (id) => {
  const seat = await Seat.findByPk(id);
  if (!seat) return false;
  await seat.destroy();
  return true;
};

// Lấy sơ đồ ghế cho 1 showtime, đánh dấu ghế đã được đặt (occupied)
export const getSeatMapForShowtime = async (showtimeId) => {
  // Tìm showtime
  const showtime = await Showtime.findByPk(showtimeId);
  if (!showtime) return null;

  // Lấy ghế của hall
  const seats = await Seat.findAll({
    where: { hall_id: showtime.hall_id },
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier'],
    order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
  });

  // Lấy các booking hiện tại cho showtime (không tính cancelled/expired)
  // Lấy tất cả booking_seat cho showtime này (kèm booking để biết trạng thái)
  const seatIds = seats.map(s => s.id);
  let bookingSeatRows = [];
  if (seatIds.length > 0) {
    bookingSeatRows = await BookingSeat.findAll({
      where: { seat_id: seatIds },
      include: [
        {
          model: Booking,
          where: {
            showtime_id: showtimeId,
            status: { [Sequelize.Op.notIn]: ['cancelled', 'expired'] }
          },
          attributes: ['id', 'status', 'expire_at']
        }
      ],
      attributes: ['seat_id']
    });
  }

  // Build map seatId -> array of booking records (to determine booked vs locked)
  const seatBookingMap = new Map();
  for (const row of bookingSeatRows) {
    const sid = row.seat_id;
    const b = row.Booking;
    if (!b) continue;
    if (!seatBookingMap.has(sid)) seatBookingMap.set(sid, []);
    seatBookingMap.get(sid).push({ status: b.status, expire_at: b.expire_at });
  }

  // Group seats by row
  const seatMap = [];
  let current = null;
  for (const s of seats) {
    // determine seat status: if any booking with status 'confirmed' -> occupied
    // else if any 'locked' and not expired -> locked
    // else available
    let status = 'available';
    const bookingsForSeat = seatBookingMap.get(s.id) || [];
    const now = new Date();
    for (const bk of bookingsForSeat) {
      if (bk.status === 'confirmed') {
        status = 'occupied';  // Ghế đã được thanh toán
        break;
      }
      if (bk.status === 'locked') {
        if (!bk.expire_at || new Date(bk.expire_at) > now) {
          status = 'locked';
          // don't break; continue in case a 'confirmed' exists too (confirmed wins)
        }
      }
    }

    const seatObj = {
      id: s.id,
      row: s.row_name,
      number: s.seat_number,
      status,
      type: s.seat_type,
      price: (showtime.base_price || 0) * (s.price_modifier || 1)
    };

    if (!current || current.row !== s.row_name) {
      current = { row: s.row_name, seats: [] };
      seatMap.push(current);
    }
    current.seats.push(seatObj);
  }

  return { showtime: showtime.toJSON(), seatMap };
};
