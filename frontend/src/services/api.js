import axios from 'axios';
import { getFallbackResponse } from '../mock/mockFallback';

const rawBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
const API_BASE_URL = rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`;

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkError = !error.response;
    const status = error.response?.status;
    const isServerError = [404, 500, 502, 503, 504].includes(status);

    if (isNetworkError || isServerError) {
      const url = error.config?.url || '';
      const method = error.config?.method || 'get';
      const fallback = getFallbackResponse(url, method, error.config?.data);
      if (fallback !== null) {
        return Promise.resolve({
          data: fallback,
          status: 200,
          statusText: 'OK (Live Demo Fallback)',
          headers: {},
          config: error.config,
        });
      }
    }

    // Do NOT redirect window.location.href on 401 - it causes infinite reload loops when unauthenticated
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

