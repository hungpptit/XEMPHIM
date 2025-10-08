// Date and time utilities
export const formatDate = (date) => {
  if (!date) return '';
  
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('vi-VN', options);
};

export const formatTime = (time) => {
  if (!time) return '';
  return time;
};

export const formatDateTime = (date, time) => {
  return `${formatDate(date)} ${formatTime(time)}`;
};

export const isDateInPast = (date, time) => {
  const now = new Date();
  const showDateTime = new Date(`${date} ${time}`);
  return showDateTime < now;
};

export const getTimeUntilShow = (date, time) => {
  const now = new Date();
  const showDateTime = new Date(`${date} ${time}`);
  const timeDiff = showDateTime.getTime() - now.getTime();
  
  return {
    milliseconds: timeDiff,
    hours: timeDiff / (1000 * 60 * 60),
    minutes: timeDiff / (1000 * 60),
    days: timeDiff / (1000 * 60 * 60 * 24)
  };
};

// Price formatting
export const formatPrice = (price) => {
  if (typeof price !== 'number') return '0đ';
  return price.toLocaleString('vi-VN') + 'đ';
};

export const calculateTotalPrice = (seats) => {
  if (!Array.isArray(seats)) return 0;
  return seats.reduce((total, seat) => total + (seat.price || 0), 0);
};

// Seat utilities
export const generateSeatId = (row, number) => {
  return `${row}${number}`;
};

export const parseSeatId = (seatId) => {
  const match = seatId.match(/([A-Z])(\d+)/);
  if (match) {
    return {
      row: match[1],
      number: parseInt(match[2])
    };
  }
  return null;
};

export const sortSeats = (seats) => {
  return seats.sort((a, b) => {
    const aParsed = parseSeatId(a.id);
    const bParsed = parseSeatId(b.id);
    
    if (!aParsed || !bParsed) return 0;
    
    if (aParsed.row !== bParsed.row) {
      return aParsed.row.localeCompare(bParsed.row);
    }
    
    return aParsed.number - bParsed.number;
  });
};

// Storage utilities
export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromLocalStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[0-9]{10,11}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];
    
    if (rule.required && (!value || value.toString().trim() === '')) {
      errors[field] = rule.message || `${field} is required`;
      return;
    }
    
    if (value && rule.type === 'email' && !validateEmail(value)) {
      errors[field] = rule.message || 'Invalid email format';
      return;
    }
    
    if (value && rule.type === 'phone' && !validatePhone(value)) {
      errors[field] = rule.message || 'Invalid phone number';
      return;
    }
    
    if (value && rule.minLength && value.length < rule.minLength) {
      errors[field] = rule.message || `Minimum length is ${rule.minLength}`;
      return;
    }
    
    if (value && rule.maxLength && value.length > rule.maxLength) {
      errors[field] = rule.message || `Maximum length is ${rule.maxLength}`;
      return;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// URL utilities
export const createQueryString = (params) => {
  const searchParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      searchParams.append(key, params[key].toString());
    }
  });
  
  return searchParams.toString();
};

export const parseQueryString = (queryString) => {
  const params = {};
  const searchParams = new URLSearchParams(queryString);
  
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  
  return params;
};

// Movie utilities
export const getMovieRatingStars = (rating) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return {
    full: fullStars,
    half: hasHalfStar ? 1 : 0,
    empty: emptyStars
  };
};

export const getMovieGenreColor = (genre) => {
  const genreColors = {
    'Hành động': '#ef4444',
    'Phiêu lưu': '#f59e0b',
    'Hoạt hình': '#8b5cf6',
    'Hài': '#10b981',
    'Tội phạm': '#374151',
    'Tài liệu': '#6b7280',
    'Chính kịch': '#3b82f6',
    'Gia đình': '#ec4899',
    'Fantasy': '#7c3aed',
    'Lịch sử': '#92400e',
    'Kinh dị': '#1f2937',
    'Nhạc': '#db2777',
    'Bí ẩn': '#4338ca',
    'Lãng mạn': '#e11d48',
    'Sci-Fi': '#0ea5e9',
    'Gây cấn': '#dc2626',
    'Chiến tranh': '#6b7280',
    'Miền Tây': '#a3a3a3'
  };
  
  return genreColors[genre] || '#6b7280';
};

// Booking utilities
export const generateBookingId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `BK${timestamp.slice(-6)}${random}`;
};

export const getBookingStatus = (booking) => {
  if (booking.status === 'cancelled') return 'cancelled';
  
  const now = new Date();
  const showDateTime = new Date(`${booking.showtime.date} ${booking.showtime.time}`);
  
  if (showDateTime < now) {
    return 'expired';
  }
  
  return 'confirmed';
};

// Error handling utilities
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return { message: data.message || 'Dữ liệu không hợp lệ' };
      case 401:
        return { message: 'Bạn cần đăng nhập để thực hiện thao tác này' };
      case 403:
        return { message: 'Bạn không có quyền thực hiện thao tác này' };
      case 404:
        return { message: 'Không tìm thấy dữ liệu' };
      case 500:
        return { message: 'Lỗi máy chủ, vui lòng thử lại sau' };
      default:
        return { message: data.message || 'Đã xảy ra lỗi' };
    }
  } else if (error.request) {
    // Network error
    return { message: 'Không thể kết nối đến máy chủ' };
  } else {
    // Other error
    return { message: error.message || 'Đã xảy ra lỗi không xác định' };
  }
};

// Debounce utility
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Throttle utility
export const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(null, args);
    }
  };
};