import { Seat } from '../models/index.js';
import Redis from 'ioredis';
import axios from 'axios';

// Khởi tạo Redis client phục vụ cho việc kiểm tra trạng thái khóa ghế thời gian thực (Real-time seat locks)
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';

// Truy vấn danh sách ID các ghế đang bị khóa (tạm giữ) trên Redis cho một lịch chiếu
// Thiết kế: Quét qua tất cả các khóa tạm giữ dạng 'lock:showtime:${showtimeId}:seat:*' để lấy ra các ghế đang bị khóa tạm thời 120s.
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

// Lấy bản đồ trạng thái ghế ngồi cho một lịch chiếu
// Thiết kế: Kết hợp dữ liệu từ SQL Server (ghế trống, ghế đã thanh toán thành công)
// và Redis (các ghế đang bị giữ tạm thời do tiến trình đặt vé đang diễn ra)
export const getSeatMapForShowtime = async (showtimeId) => {
  // 1. Lấy thông tin lịch chiếu từ movie-service
  let showtime = null;
  try {
    const res = await axios.get(`${MOVIE_SERVICE}/api/showtimes/${showtimeId}`);
    showtime = res.data;
  } catch (err) {
    console.error(`Failed to fetch showtime ${showtimeId} from movie-service:`, err.message);
    return null;
  }

  if (!showtime) return null;

  // 2. Lấy danh sách toàn bộ ghế có trong phòng chiếu đó
  const seats = await Seat.findAll({
    where: { hall_id: showtime.hall_id },
    attributes: ['id', 'hall_id', 'row_name', 'seat_number', 'seat_type', 'price_modifier', 'is_active'],
    order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
  });

  // 3. Lấy thông tin ghế đã đặt (confirmed) và bị khóa (locked) từ DB của booking-service
  let confirmedSeatIds = new Set();
  let lockedSeatIds = new Set();

  try {
    const seatsRes = await axios.get(`${BOOKING_SERVICE}/api/bookings/showtimes/${showtimeId}/seats`);
    confirmedSeatIds = new Set(seatsRes.data.confirmedSeatIds || []);
    lockedSeatIds = new Set(seatsRes.data.lockedSeatIds || []);
  } catch (err) {
    console.error('Failed to fetch showtime seat reservations from booking-service:', err.message);
  }

  // 4. Lấy thêm các ghế đang bị khóa tạm thời trên Redis (Real-time locks) và gộp lại
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
        status = 'locked'; // Ghế đang bị giữ tạm thời
      } else if (confirmedSeatIds.has(s.id)) {
        status = 'occupied'; // Ghế đã được mua thành công
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
