import { Seat, CinemaHall, Showtime, Booking, BookingSeat, Sequelize } from '../models/index.js';

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

export const deleteSeat = async (id) => {
  const seat = await Seat.findByPk(id);
  if (!seat) return false;
  await seat.destroy();
  return true;
};

export const getSeatMapForShowtime = async (showtimeId) => {
  const showtime = await Showtime.findByPk(showtimeId);
  if (!showtime) return null;

  const seats = await Seat.findAll({
    where: { hall_id: showtime.hall_id },
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier'],
    order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
  });

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

  const seatBookingMap = new Map();
  for (const row of bookingSeatRows) {
    const sid = row.seat_id;
    const b = row.Booking;
    if (!b) continue;
    if (!seatBookingMap.has(sid)) seatBookingMap.set(sid, []);
    seatBookingMap.get(sid).push({ status: b.status, expire_at: b.expire_at });
  }

  const seatMap = [];
  let current = null;
  for (const s of seats) {
    let status = 'available';
    const bookingsForSeat = seatBookingMap.get(s.id) || [];
    const now = new Date();
    for (const bk of bookingsForSeat) {
      if (bk.status === 'confirmed') {
        status = 'occupied';
        break;
      }
      if (bk.status === 'locked') {
        if (!bk.expire_at || new Date(bk.expire_at) > now) {
          status = 'locked';
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
