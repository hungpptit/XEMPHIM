import API from './api';

// Lấy seat map cho showtime
export const getSeatMap = (showtimeId) => API.get(`/seats/showtimes/${showtimeId}/seats`);

// CRUD ghế (dùng khi cần quản lý seat từ frontend admin)
export const getAllSeats = () => API.get('/seats');
export const getSeatById = (id) => API.get(`/seats/${id}`);
export const createSeat = (seatData) => API.post('/seats', seatData);
export const updateSeat = (id, seatData) => API.put(`/seats/${id}`, seatData);
export const deleteSeat = (id) => API.delete(`/seats/${id}`);

// Booking lock/confirm wrappers
export const lockSeat = (payload) => API.post('/bookings/lock-seat', payload);
export const confirmPayment = (payload) => API.post('/bookings/confirm-payment', payload);

export default {
  getSeatMap,
  getAllSeats,
  getSeatById,
  createSeat,
  updateSeat,
  deleteSeat,
  lockSeat,
  confirmPayment
};