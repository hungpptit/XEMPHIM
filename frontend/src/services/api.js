import axios from 'axios';

// API Configuration
export const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
API.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
API.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Movies API
export const moviesAPI = {
  // Get all movies
  getMovies: (params = {}) => {
    return API.get('/movies', { params });
  },

  // Get movie by ID
  getMovieById: (id) => {
    return API.get(`/movies/${id}`);
  },

  // Get movie showtimes
  getMovieShowtimes: (movieId, date) => {
    return API.get(`/movies/${movieId}/showtimes`, {
      params: { date }
    });
  },

  // Search movies
  searchMovies: (query) => {
    return API.get('/movies/search', {
      params: { q: query }
    });
  },

  // Get movie genres
  getGenres: () => {
    return API.get('/movies/genres');
  }
};

// Booking API
export const bookingAPI = {
  // Get seat map for a showtime
  getSeatMap: (showtimeId) => {
    return API.get(`/showtimes/${showtimeId}/seats`);
  },

  // Create booking
  createBooking: (bookingData) => {
    return API.post('/bookings', bookingData);
  },

  // Get user bookings
  getUserBookings: (userId) => {
    return API.get(`/users/${userId}/bookings`);
  },

  // Cancel booking
  cancelBooking: (bookingId) => {
    return API.delete(`/bookings/${bookingId}`);
  },

  // Get booking details
  getBookingById: (bookingId) => {
    return API.get(`/bookings/${bookingId}`);
  }
};

// Payment API
export const paymentAPI = {
  // Create payment
  createPayment: (paymentData) => {
    return API.post('/payments', paymentData);
  },

  // Verify payment
  verifyPayment: (paymentId) => {
    return API.get(`/payments/${paymentId}/verify`);
  },

  // Get payment methods
  getPaymentMethods: () => {
    return API.get('/payments/methods');
  }
};

// User API
export const userAPI = {
  // Register
  register: (userData) => {
    return API.post('/auth/register', userData);
  },

  // Login
  login: (credentials) => {
    return API.post('/auth/login', credentials);
  },

  // Logout
  logout: () => {
    return API.post('/auth/logout');
  },

  // Get current user
  getCurrentUser: () => {
    return API.get('/auth/me');
  },

  // Update profile
  updateProfile: (userData) => {
    return API.put('/users/profile', userData);
  }
};

// Cinema API
export const cinemaAPI = {
  // Get all cinemas
  getCinemas: () => {
    return API.get('/cinemas');
  },

  // Get cinema by ID
  getCinemaById: (id) => {
    return API.get(`/cinemas/${id}`);
  },

  // Get cinema theaters
  getCinemaTheaters: (cinemaId) => {
    return API.get(`/cinemas/${cinemaId}/theaters`);
  }
};

// Mock data for development (when API is not available)
export const mockData = {
  movies: [
    {
      id: 1,
      title: "Spider-Man: No Way Home",
      description: "Peter Parker phải đối mặt với những thách thức lớn nhất khi danh tính Spider-Man bị tiết lộ.",
      poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1489599185395-bef5ad3c77e1?ixlib=rb-4.0.3&w=1200",
      rating: 8.9,
      duration: 148,
      releaseYear: 2024,
      genres: ["Hành động", "Phiêu lưu", "Sci-Fi"],
      director: "Jon Watts",
      cast: ["Tom Holland", "Zendaya", "Benedict Cumberbatch"],
      trailerUrl: "https://www.youtube.com/embed/JfVOs4VSpmA",
      isAvailable: true
    },
    // Add more mock movies here...
  ],

  showtimes: [
    {
      date: "2024-10-08",
      dateLabel: "Hôm nay",
      times: [
        { time: "09:00", cinema: "Rạp A", availableSeats: 45, totalSeats: 60, id: "1_20241008_0900" },
        { time: "12:30", cinema: "Rạp B", availableSeats: 32, totalSeats: 50, id: "1_20241008_1230" },
        { time: "15:45", cinema: "Rạp A", availableSeats: 18, totalSeats: 60, id: "1_20241008_1545" },
        { time: "19:00", cinema: "Rạp C", availableSeats: 55, totalSeats: 80, id: "1_20241008_1900" },
        { time: "22:15", cinema: "Rạp B", availableSeats: 0, totalSeats: 50, id: "1_20241008_2215" }
      ]
    }
  ]
};

// Helper function to use mock data when API is not available
export const apiWithFallback = {
  getMovies: async () => {
    try {
      return await moviesAPI.getMovies();
    } catch (error) {
      console.warn('API not available, using mock data');
      return { data: mockData.movies };
    }
  },

  getMovieById: async (id) => {
    try {
      return await moviesAPI.getMovieById(id);
    } catch (error) {
      console.warn('API not available, using mock data');
      const movie = mockData.movies.find(m => m.id === parseInt(id));
      return { data: movie };
    }
  },

  getMovieShowtimes: async (movieId) => {
    try {
      return await moviesAPI.getMovieShowtimes(movieId);
    } catch (error) {
      console.warn('API not available, using mock data');
      return { data: mockData.showtimes };
    }
  }
};

export default API;