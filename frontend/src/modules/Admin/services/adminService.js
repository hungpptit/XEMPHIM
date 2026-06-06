import axios from 'axios';

/**
 * Admin API - Go through the API Gateway using cookie-based auth
 */
const adminAPI = axios.create({
  baseURL: 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send httpOnly cookies automatically
});

// ============= CINEMA Management =============
const cinemaAPI = {
  list: () => adminAPI.get('/api/admin/cinemas'),
  getById: (cinemaId) => adminAPI.get(`/api/admin/cinemas/${cinemaId}`),
  create: (data) => adminAPI.post('/api/admin/cinemas', data),
  update: (cinemaId, data) => adminAPI.put(`/api/admin/cinemas/${cinemaId}`, data),
  delete: (cinemaId) => adminAPI.delete(`/api/admin/cinemas/${cinemaId}`),
  getHalls: (cinemaId) => adminAPI.get(`/api/admin/cinemas/${cinemaId}/halls`),
  getOverview: () => adminAPI.get('/api/admin/cinemas/stats/overview')
};

// ============= HALL Management =============
const hallAPI = {
  list: () => adminAPI.get('/api/admin/halls'),
  getById: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}`),
  getDetail: (hallId) => adminAPI.get(`/api/admin/halls/${hallId}/detail`),
  create: (data) => adminAPI.post('/api/admin/halls', data),
  update: (hallId, data) => adminAPI.put(`/api/admin/halls/${hallId}`, data),
  delete: (hallId) => adminAPI.delete(`/api/admin/halls/${hallId}`)
};



// ============= MOVIE Management =============
// Use the public /api/movies endpoints implemented in movie-service
const movieAPI = {
  list: (params = {}) => adminAPI.get('/api/movies', { params }),
  delete: (movieId) => adminAPI.delete(`/api/movies/${movieId}`)
};




// ============= SHOWTIME Management =============
const showtimeAPI = {
  list: () => adminAPI.get('/api/admin/showtimes'),
  create: (data) => adminAPI.post('/api/admin/showtimes', data),
  delete: (id) => adminAPI.delete(`/api/admin/showtimes/${id}`)
};

// ============= USER Management =============
const userAPI = {
  list: () => adminAPI.get('/api/admin/users'),
  update: (userId, data) => adminAPI.put(`/api/admin/users/${userId}`, data),
  delete: (userId) => adminAPI.delete(`/api/admin/users/${userId}`)
};

// Combine all services
export const adminService = {
  cinema: cinemaAPI,
  hall: hallAPI,
  movie: movieAPI,
  showtime: showtimeAPI,
  user: userAPI,
  
  // Legacy support for existing code
  createHall: (data) => hallAPI.create(data),
  updateHall: (hallId, data) => hallAPI.update(hallId, data),
  deleteHall: (hallId) => hallAPI.delete(hallId),
  getHallDetail: (hallId) => hallAPI.getDetail(hallId)
};

export default adminService;
