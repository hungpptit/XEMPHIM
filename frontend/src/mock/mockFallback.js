import {
  mockMovies,
  mockShowtimes,
  mockSeatMaps,
  mockUser,
  mockBookings
} from './mockData';

// Giữ trạng thái polling demo để sau 2-3 lần kiểm tra sẽ báo "confirmed"
const demoPollCounters = new Map();

/**
 * Xử lý dữ liệu fallback tự động khi Backend offline hoặc deploy trên Vercel
 * Đảm bảo 100% các màn hình (Home, Chi tiết phim, Chọn ghế, Thanh toán, Vé của tôi) hoạt động trơn tru
 */
export function getFallbackResponse(url = '', method = 'get', body = null) {
  const cleanUrl = url.split('?')[0].replace('/api/', '/');
  const normalizedMethod = method.toLowerCase();

  console.info(`[Live Demo Fallback] Cung cấp dữ liệu mẫu: ${normalizedMethod.toUpperCase()} ${cleanUrl}`);

  // 1. Danh sách phim & tìm kiếm
  if (cleanUrl.endsWith('/movies') || cleanUrl === '/movies') {
    return { movies: mockMovies };
  }

  // /movies/:id/showtimes
  const showtimesMatch = cleanUrl.match(/\/movies\/(\d+)\/showtimes/);
  if (showtimesMatch) {
    const movieId = showtimesMatch[1];
    return mockShowtimes[movieId] || Object.values(mockShowtimes)[0] || [];
  }

  // /movies/:id
  const movieDetailMatch = cleanUrl.match(/\/movies\/(\d+)$/);
  if (movieDetailMatch) {
    const movieId = movieDetailMatch[1];
    const movie = mockMovies.find(m => String(m.id) === String(movieId)) || mockMovies[0];
    return { movie };
  }

  // 2. Sơ đồ ghế
  // /seats/showtimes/:showtimeId/seats
  const seatMapMatch = cleanUrl.match(/\/seats\/showtimes\/(\d+)\/seats/);
  if (seatMapMatch) {
    const showtimeId = seatMapMatch[1];
    return mockSeatMaps[showtimeId] || Object.values(mockSeatMaps)[0];
  }

  // 3. Đặt vé & Thanh toán (Giả lập Redis Distributed Lock)
  if (cleanUrl.includes('/bookings/lock-seat')) {
    const expireTime = new Date(Date.now() + 120 * 1000).toISOString();
    const demoBookingId = 9999;
    return {
      success: true,
      booking: {
        id: demoBookingId,
        booking_id: demoBookingId,
        booking_code: `ROYAL-${Math.floor(100000 + Math.random() * 900000)}`,
        uuid: `demo-uuid-${Date.now()}`,
        expire_at: expireTime,
        status: 'locked'
      },
      expireAt: expireTime,
      message: 'Khóa ghế thành công (Giả lập Redis Distributed Lock 120s)'
    };
  }

  // Polling trạng thái thanh toán (/bookings/:id/status)
  if (cleanUrl.includes('/status')) {
    const count = (demoPollCounters.get('poll') || 0) + 1;
    demoPollCounters.set('poll', count);
    // Sau 2 lần poll (khoảng 4-6s) thì giả lập thanh toán ZaloPay quét thành công
    if (count >= 2) {
      demoPollCounters.delete('poll');
      return { status: 'confirmed', success: true };
    }
    return { status: 'locked', success: true };
  }

  if (cleanUrl.includes('/confirm-payment')) {
    return {
      success: true,
      status: 'confirmed',
      transactionId: `TXN_ROYAL_${Math.floor(100000 + Math.random() * 900000)}`,
      message: 'Giao dịch thanh toán thành công!'
    };
  }

  if (cleanUrl.includes('/create-zalopay-qr')) {
    // Reset counter để bắt đầu chu kỳ poll 4s
    demoPollCounters.set('poll', 0);
    return {
      success: true,
      qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ZALOPAY_DEMO_CANDIDATE_PORTFOLIO',
      order_url: 'https://sb-openapi.zalopay.vn',
      expires_at: new Date(Date.now() + 180 * 1000).toISOString(),
      message: 'Tạo mã QR ZaloPay Sandbox thành công'
    };
  }

  // /bookings/user/:userId
  if (cleanUrl.includes('/bookings/user/')) {
    return { bookings: mockBookings };
  }

  // /bookings/:id
  if (cleanUrl.match(/\/bookings\/\d+/)) {
    return mockBookings[0] || {};
  }

  // 4. Quản lý tài khoản & người dùng
  if (cleanUrl.includes('/auth/me') || cleanUrl.includes('/auth/profile') || cleanUrl.includes('/users/')) {
    return { user: mockUser };
  }

  if (cleanUrl.includes('/auth/login') || cleanUrl.includes('/auth/register')) {
    return {
      success: true,
      user: mockUser,
      token: 'demo-jwt-token-cv',
      message: 'Đăng nhập chế độ Demo thành công'
    };
  }

  if (cleanUrl.includes('/auth/logout')) {
    demoPollCounters.clear();
    return { success: true, message: 'Đăng xuất thành công' };
  }

  return null;
}
