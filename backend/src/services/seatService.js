import { Seat, CinemaHall } from '../models/index.js';

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
