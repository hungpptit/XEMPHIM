import { Seat, CinemaHall, Showtime, Booking, BookingSeat, Cinema } from '../models/index.js';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

async function getRedisLockedSeatIds(showtimeId) {
  if (!redis) return new Set();

  const lockedSeatIds = new Set();
  const pattern = `lock:showtime:${showtimeId}:seat:*`;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
      cursor = nextCursor;
      for (const key of keys) {
        const seatId = Number(key.split(':').pop());
        if (!Number.isNaN(seatId)) {
          lockedSeatIds.add(seatId);
        }
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Error reading Redis seat locks:', err && err.stack ? err.stack : err);
  }

  return lockedSeatIds;
}

async function getDbLockedSeatIds(showtimeId) {
  const lockedBookingSeats = await BookingSeat.findAll({
    include: [
      {
        model: Booking,
        where: {
          showtime_id: showtimeId,
          status: 'locked'
        },
        attributes: ['id', 'expire_at']
      }
    ],
    attributes: ['seat_id']
  });

  const now = new Date();
  const lockedSeatIds = new Set();

  for (const row of lockedBookingSeats) {
    const booking = row.Booking;
    if (!booking) continue;
    if (!booking.expire_at || new Date(booking.expire_at) > now) {
      lockedSeatIds.add(row.seat_id);
    }
  }

  return lockedSeatIds;
}

export const listSeats = async () => {
  const seats = await Seat.findAll({
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active'],
    include: [
      {
        model: CinemaHall,
        attributes: ['id', 'name', 'cinema_id'],
        include: [
          {
            model: Cinema,
            attributes: ['name']
          }
        ]
      }
    ]
  });

  return seats.map(s => {
    const sj = s.toJSON();
    if (sj.CinemaHall) {
      sj.CinemaHall.cinema_name = sj.CinemaHall.Cinema?.name || '';
      delete sj.CinemaHall.Cinema;
    }
    return sj;
  });
};

export const getSeatById = async (id) => {
  const seat = await Seat.findByPk(id, {
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active'],
    include: [
      {
        model: CinemaHall,
        attributes: ['id', 'name', 'cinema_id'],
        include: [
          {
            model: Cinema,
            attributes: ['name']
          }
        ]
      }
    ]
  });

  if (!seat) return null;
  const sj = seat.toJSON();
  if (sj.CinemaHall) {
    sj.CinemaHall.cinema_name = sj.CinemaHall.Cinema?.name || '';
    delete sj.CinemaHall.Cinema;
  }
  return sj;
};

export const createSeat = async (payload) => {
  const seat = await Seat.create({
    hall_id: payload.hall_id,
    row_name: payload.row_name,
    seat_number: payload.seat_number,
    seat_type: payload.seat_type || 'regular',
    price_modifier: payload.price_modifier ?? 1.0,
    is_active: payload.is_active ?? true
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
    price_modifier: payload.price_modifier ?? seat.price_modifier,
    is_active: payload.is_active ?? seat.is_active
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
  const showtime = await Showtime.findByPk(showtimeId, {
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
  });
  if (!showtime) return null;

  const seats = await Seat.findAll({
    where: { hall_id: showtime.hall_id },
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active'],
    order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
  });

  let lockedSeatIds = await getRedisLockedSeatIds(showtimeId);
  if (lockedSeatIds.size === 0) {
    lockedSeatIds = await getDbLockedSeatIds(showtimeId);
  }
  const confirmedBookingSeatRows = await BookingSeat.findAll({
    include: [
      {
        model: Booking,
        where: {
          showtime_id: showtimeId,
          status: 'confirmed'
        },
        attributes: ['id']
      }
    ],
    attributes: ['seat_id']
  });

  const confirmedSeatIds = new Set(confirmedBookingSeatRows.map(row => row.seat_id));

  const seatMap = [];
  let current = null;
  for (const s of seats) {
    let status = 'available';
    // If the seat itself is inactive, mark it as unavailable/inactive
    if (s.is_active === false) {
      status = 'inactive';
    } else {
      if (lockedSeatIds.has(s.id)) {
        status = 'locked';
      } else if (confirmedSeatIds.has(s.id)) {
        status = 'occupied';
      }
    }

    const seatObj = {
      id: s.id,
      row: s.row_name,
      number: s.seat_number,
      status,
      type: s.seat_type,
      price: (showtime.base_price || 0) * (s.price_modifier || 1),
      is_active: s.is_active ?? true
    };

    if (!current || current.row !== s.row_name) {
      current = { row: s.row_name, seats: [] };
      seatMap.push(current);
    }
    current.seats.push(seatObj);
  }

  return { showtime: showtime.toJSON(), seatMap };
};
