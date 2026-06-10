import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  getProfile: () => API.get('/auth/profile'),
  updateProfile: (userData) => API.put('/auth/profile', userData),
};

export const moviesAPI = {
  getAll: () => API.get('/movies'),
  getById: (id) => API.get(`/movies/${id}`),
  getByGenre: (genreId) => API.get(`/movies/genre/${genreId}`),
  search: (query) => API.get(`/movies/search?q=${query}`),
  getShowtimes: (movieId) => API.get(`/movies/${movieId}/showtimes`),
  getMovieShowtimes: (movieId) => API.get(`/movies/${movieId}/showtimes`),
};

export const bookingAPI = {
  getSeatMap: (showtimeId) => API.get(`/seats/showtimes/${showtimeId}/seats`),
  lockSeats: (bookingData) => API.post('/bookings/lock-seat', bookingData),
  confirmPayment: (bookingId, paymentData) => API.post(`/bookings/${bookingId}/confirm-payment`, paymentData),
  createZaloPayQR: (bookingId) => API.post(`/bookings/${bookingId}/create-zalopay-qr`),
  cancelBooking: (bookingId) => API.post(`/bookings/${bookingId}/cancel`),
  refundBooking: (bookingId, refundData) => API.post(`/bookings/${bookingId}/refund`, refundData),
  getBooking: (bookingId) => API.get(`/bookings/${bookingId}`),
  getBookingStatus: (bookingId) => API.get(`/bookings/${bookingId}/status`),
  getUserBookings: (userId) => API.get(`/bookings/user/${userId}`),
};

export default API;

