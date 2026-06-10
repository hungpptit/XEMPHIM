import { Seat } from '../models/index.js';
import Redis from 'ioredis';
import axios from 'axios';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';

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

export const listSeats = async () => {
  const seats = await Seat.findAll({
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active']
  });
  return seats.map(s => s.toJSON());
};

export const getSeatById = async (id) => {
  const seat = await Seat.findByPk(id, {
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active']
  });
  return seat ? seat.toJSON() : null;
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
  // 1. Fetch showtime details from movie-service
  let showtime = null;
  try {
    const res = await axios.get(`${MOVIE_SERVICE}/api/showtimes/${showtimeId}`);
    showtime = res.data;
  } catch (err) {
    console.error(`Failed to fetch showtime ${showtimeId} from movie-service:`, err.message);
    return null;
  }

  if (!showtime) return null;

  // Note: showtime from movie-service already contains nested CinemaHall/Cinema details

  // 2. Fetch seats in the showtime's hall
  const seats = await Seat.findAll({
    where: { hall_id: showtime.hall_id },
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active'],
    order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
  });

  // 3. Fetch locked and confirmed seat IDs from booking-service
  let confirmedSeatIds = new Set();
  let lockedSeatIds = new Set();

  try {
    const seatsRes = await axios.get(`${BOOKING_SERVICE}/api/bookings/showtimes/${showtimeId}/seats`);
    confirmedSeatIds = new Set(seatsRes.data.confirmedSeatIds || []);
    lockedSeatIds = new Set(seatsRes.data.lockedSeatIds || []);
  } catch (err) {
    console.error('Failed to fetch showtime seat reservations from booking-service:', err.message);
  }

  // Also query Redis locks locally
  try {
    const redisLocked = await getRedisLockedSeatIds(showtimeId);
    for (const id of redisLocked) {
      lockedSeatIds.add(id);
    }
  } catch (redisErr) {
    console.error('Redis lock fetch error:', redisErr.message);
  }

  const seatMap = [];
  let current = null;
  for (const s of seats) {
    let status = 'available';
    if (s.is_active === false) {
      status = 'inactive';
    } else {
      if (lockedSeatIds.has(s.id)) {
        status = 'locked';
      } else if (confirmedSeatIds.has(s.id)) {
        status = 'occupied';
      }
    }

    const modifier = Number(s.price_modifier) || 1.0;
    const seatObj = {
      id: s.id,
      row: s.row_name,
      number: s.seat_number,
      status,
      type: s.seat_type === 'VIP' ? 'vip' : (s.seat_type === 'Standard' ? 'regular' : s.seat_type.toLowerCase()),
      price: Math.round((showtime.base_price || 0) * modifier),
      is_active: s.is_active ?? true
    };

    if (!current || current.row !== s.row_name) {
      current = { row: s.row_name, seats: [] };
      seatMap.push(current);
    }
    current.seats.push(seatObj);
  }

  return { showtime, seatMap };
};

export const bulkCreateSeats = async (seatsArray) => {
  const created = await Seat.bulkCreate(seatsArray);
  return created.map(s => s.toJSON());
};
