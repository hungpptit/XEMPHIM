import axios from 'axios';

/**
 * Admin API - Go through the API Gateway so auth cookies/headers are injected
 */
const adminAPI = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send httpOnly cookies automatically
});

// Add auth interceptor
adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Admin Service - Hall and Seat Management
 * Các API endpoints để quản lý phòng chiếu và ghế
 */

// ============= HALL Management =============
const hallAPI = {
  list: () => adminAPI.get('/api/admin/halls'),
  getById: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}`),
  getDetail: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}/detail`),
  create: (data) => adminAPI.post('/api/admin/halls', data),
  update: (hallId, data) => adminAPI.put(`/api/admin/halls/${hallId}`, data),
  delete: (hallId) => adminAPI.delete(`/api/admin/halls/${hallId}`)
};

// ============= SEAT Management =============
const seatAPI = {
  create: (data) => adminAPI.post('/api/admin/seats', data),
  getByHall: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}/seats`),
  getLayout: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}/seats/layout`),
  update: (seatId, data) => adminAPI.put(`/api/admin/seats/${seatId}`, data),
  updateType: (hallId, data) => adminAPI.put(`/api/admin/halls/${hallId}/seats/type`, data),
  delete: (seatId) => adminAPI.delete(`/api/admin/seats/${seatId}`)
};

// ============= MOVIE Management =============
// Use the public /api/movies endpoints implemented in movie-service
const movieAPI = {
  list: (params = {}) => adminAPI.get('/api/movies', { params }),
  getById: (movieId) => adminAPI.get(`/api/movies/${movieId}`),
  create: (data) => adminAPI.post('/api/movies', data),
  update: (movieId, data) => adminAPI.put(`/api/movies/${movieId}`, data),
  delete: (movieId) => adminAPI.delete(`/api/movies/${movieId}`)
};

// Combine all services
export const adminService = {
  hall: hallAPI,
  seat: seatAPI,
  movie: movieAPI,
  
  // Legacy support for existing code
  createHall: (data) => hallAPI.create(data),
  updateHall: (hallId, data) => hallAPI.update(hallId, data),
  deleteHall: (hallId) => hallAPI.delete(hallId),
  getHallDetail: (hallId) => hallAPI.getDetail(hallId),
  
  getSeatsByHall: (hallId) => seatAPI.getByHall(hallId),
  getSeatLayout: (hallId) => seatAPI.getLayout(hallId)
};

export default adminService;
