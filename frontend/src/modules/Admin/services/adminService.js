import api from '../../../services/api';

export const adminService = {
  // ============= CINEMA APIs =============
  
  getCinemas: () => api.get('/api/admin/cinemas'),
  
  getCinemaById: (id) => api.get(`/api/admin/cinemas/${id}`),
  
  createCinema: (data) => api.post('/api/admin/cinemas', data),
  
  updateCinema: (id, data) => api.put(`/api/admin/cinemas/${id}`, data),
  
  deleteCinema: (id) => api.delete(`/api/admin/cinemas/${id}`),
  
  // ============= HALL APIs =============
  
  getHallsByCinema: (cinemaId) => api.get(`/api/admin/cinemas/${cinemaId}/halls`),
  
  createHall: (cinemaId, data) => api.post(`/api/admin/cinemas/${cinemaId}/halls`, data),
  
  updateHall: (hallId, data) => api.put(`/api/admin/halls/${hallId}`, data),
  
  deleteHall: (hallId) => api.delete(`/api/admin/halls/${hallId}`)
};
