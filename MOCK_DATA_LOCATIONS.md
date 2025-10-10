# 🗂️ MOCK DATA LOCATIONS - Hướng dẫn thay thế khi có Backend

> **Mục đích**: Tài liệu này liệt kê tất cả các vị trí mock data trong frontend để dễ dàng thay thế bằng API calls thực khi có backend.

---

## 📋 **Tổng quan Mock Data**

| Component | File | Dòng | Mô tả | API Endpoint cần |
|-----------|------|------|-------|------------------|
| Home Page | `src/modules/Home/Home.js` | 12-67 | Danh sách phim | `GET /api/movies` |
| Movie Detail | `src/modules/MovieDetail/MovieDetail.js` | 19-66 | Chi tiết phim + lịch chiếu | `GET /api/movies/{id}` |
| Seat Selection | `src/modules/SeatSelection/SeatSelection.js` | 18-39 | Sơ đồ ghế | `GET /api/showtimes/{id}/seats` |
| Payment | `src/modules/Payment/Payment.js` | 23-47 | Phương thức thanh toán | `GET /api/payment-methods` |
| My Tickets | `src/modules/MyTickets/MyTickets.js` | 13-16 | Vé đã đặt | `GET /api/users/{id}/bookings` |
| API Service | `src/services/api.js` | 110+ | Fallback mock data | N/A |

---

## 🎬 **1. HOME PAGE - Danh sách phim**

### 📍 **Vị trí**: `src/modules/Home/Home.js`
**Dòng**: 12-67

```javascript
// ❌ MOCK DATA - CẦN THAY THẾ
const mockMovies = [
  {
    id: 1,
    title: "Spider-Man: No Way Home",
    description: "Peter Parker phải đối mặt...",
    poster: "https://images.unsplash.com/...",
    rating: 8.9,
    duration: 148,
    releaseYear: 2024,
    genre: "Hành động",
    isAvailable: true
  },
  // ... 5 phim khác
];
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API
useEffect(() => {
  const fetchMovies = async () => {
    try {
      const response = await moviesAPI.getMovies();
      setMovies(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setLoading(false);
    }
  };
  
  fetchMovies();
}, []);
```

### 📡 **API Endpoint cần**:
- `GET /api/movies` - Lấy danh sách tất cả phim
- `GET /api/movies?status=now_showing` - Phim đang chiếu
- `GET /api/movies?status=coming_soon` - Phim sắp chiếu

---

## 🎞️ **2. MOVIE DETAIL - Chi tiết phim**

### 📍 **Vị trí**: `src/modules/MovieDetail/MovieDetail.js`
**Dòng**: 19-34 (Chi tiết phim), 36-66 (Lịch chiếu)

```javascript
// ❌ MOCK DATA - CẦN THAY THẾ
const mockMovie = {
  id: 1,
  title: "Spider-Man: No Way Home",
  description: "Peter Parker phải đối mặt...",
  poster: "https://images.unsplash.com/...",
  backdrop: "https://images.unsplash.com/...",
  rating: 8.9,
  duration: 148,
  releaseYear: 2024,
  genres: ["Hành động", "Phiêu lưu", "Sci-Fi"],
  director: "Jon Watts",
  cast: ["Tom Holland", "Zendaya", "Benedict Cumberbatch"],
  trailerUrl: "https://www.youtube.com/embed/JfVOs4VSpmA",
  isAvailable: true
};

const mockShowtimes = [
  {
    date: "2024-10-08",
    dateLabel: "Hôm nay",
    times: [
      { time: "09:00", cinema: "Rạp A", availableSeats: 45, totalSeats: 60 },
      // ... các suất chiếu khác
    ]
  }
];
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API
useEffect(() => {
  const fetchMovieData = async () => {
    try {
      const [movieResponse, showtimesResponse] = await Promise.all([
        moviesAPI.getMovieById(id),
        moviesAPI.getMovieShowtimes(id)
      ]);
      
      setMovie(movieResponse.data);
      setShowtimes(showtimesResponse.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching movie data:', error);
      setLoading(false);
    }
  };
  
  fetchMovieData();
}, [id]);
```

### 📡 **API Endpoints cần**:
- `GET /api/movies/{id}` - Chi tiết phim
- `GET /api/movies/{id}/showtimes` - Lịch chiếu theo phim
- `GET /api/movies/{id}/showtimes?date=YYYY-MM-DD` - Lịch chiếu theo ngày

---

## 🪑 **3. SEAT SELECTION - Sơ đồ ghế**

### 📍 **Vị trí**: `src/modules/SeatSelection/SeatSelection.js`
**Dòng**: 18-39

```javascript
// ❌ MOCK DATA - CẦN THAY THẾ
const generateSeatMap = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 12;
  const map = [];

  rows.forEach(row => {
    const rowSeats = [];
    for (let i = 1; i <= seatsPerRow; i++) {
      const isOccupied = Math.random() < 0.3; // Random occupied seats
      const isVip = ['F', 'G', 'H'].includes(row);
      
      rowSeats.push({
        id: `${row}${i}`,
        row: row,
        number: i,
        status: isOccupied ? 'occupied' : 'available',
        type: isVip ? 'vip' : 'regular',
        price: isVip ? 150000 : 100000
      });
    }
    map.push(rowSeats);
  });

  return map;
};
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API
useEffect(() => {
  const fetchSeatMap = async () => {
    try {
      const response = await bookingAPI.getSeatMap(showtimeId);
      setSeatMap(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching seat map:', error);
      setLoading(false);
    }
  };
  
  if (showtimeId) {
    fetchSeatMap();
  }
}, [showtimeId]);
```

### 📡 **API Endpoints cần**:
- `GET /api/showtimes/{id}/seats` - Sơ đồ ghế theo suất chiếu
- `POST /api/bookings/hold-seats` - Giữ ghế tạm thời
- `DELETE /api/bookings/release-seats` - Hủy giữ ghế

---

## 💳 **4. PAYMENT - Phương thức thanh toán**

### 📍 **Vị trí**: `src/modules/Payment/Payment.js`
**Dòng**: 23-47

```javascript
// ❌ MOCK DATA - CẦN THAY THẾ
const paymentMethods = [
  {
    id: 'momo',
    name: 'Ví MoMo',
    desc: 'Thanh toán nhanh chóng với ví điện tử MoMo',
    icon: '📱',
    color: '#d82d8b'
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    desc: 'Thanh toán qua cổng VNPay an toàn',
    icon: '💳',
    color: '#1e88e5'
  },
  // ... các phương thức khác
];
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API
useEffect(() => {
  const fetchPaymentMethods = async () => {
    try {
      const response = await paymentAPI.getPaymentMethods();
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };
  
  fetchPaymentMethods();
}, []);
```

### 📡 **API Endpoints cần**:
- `GET /api/payment-methods` - Danh sách phương thức thanh toán
- `POST /api/payments` - Tạo thanh toán
- `GET /api/payments/{id}/verify` - Xác minh thanh toán

---

## 🎟️ **5. MY TICKETS - Vé đã đặt**

### 📍 **Vị trí**: `src/modules/MyTickets/MyTickets.js`
**Dòng**: 13-16

```javascript
// ❌ MOCK DATA - CẦN THAY THẾ
useEffect(() => {
  const loadTickets = () => {
    try {
      const savedBookings = .getItem('bookings');
      if (savedBookings) {
        const bookings = JSON.parse(savedBookings);
        setTickets(bookings);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  loadTickets();
}, []);
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API
useEffect(() => {
  const fetchUserBookings = async () => {
    try {
      const userId = getCurrentUserId(); // Get from auth context
      const response = await bookingAPI.getUserBookings(userId);
      setTickets(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };
  
  fetchUserBookings();
}, []);
```

### 📡 **API Endpoints cần**:
- `GET /api/users/{id}/bookings` - Vé của user
- `DELETE /api/bookings/{id}` - Hủy vé
- `GET /api/bookings/{id}` - Chi tiết booking

---

## 🔧 **6. API SERVICE - Fallback Mock Data**

### 📍 **Vị trí**: `src/services/api.js`
**Dòng**: 110+

```javascript
// ❌ MOCK DATA - CẦN XÓA KHI CÓ BACKEND
export const mockData = {
  movies: [
    // ... danh sách phim
  ],
  showtimes: [
    // ... lịch chiếu
  ]
};

// ❌ HELPER FUNCTIONS - CẦN XÓA
export const apiWithFallback = {
  getMovies: async () => {
    try {
      return await moviesAPI.getMovies();
    } catch (error) {
      console.warn('API not available, using mock data');
      return { data: mockData.movies };
    }
  },
  // ... các functions khác
};
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ CHỈ GIỮ LẠI API THỰC
export const moviesAPI = {
  getMovies: (params = {}) => {
    return API.get('/movies', { params });
  },
  // ... các API methods khác
};

// XÓA HOÀN TOÀN mockData và apiWithFallback
```

---

## 🗃️ **7. LOCAL STORAGE - Dữ liệu lưu trữ tạm**

### 📍 **Các vị trí sử dụng **:

1. **Payment Success**: `src/modules/Payment/Payment.js` - Dòng 117-127
2. **My Tickets Load**: `src/modules/MyTickets/MyTickets.js` - Dòng 13-22  
3. **Ticket Cancel**: `src/modules/MyTickets/MyTickets.js` - Dòng 55-62

```javascript
// ❌ THAY THẾ  BẰNG API
.setItem('bookings', JSON.stringify(updatedTickets));
const savedBookings = .getItem('bookings');
```

### 🔄 **Cách thay thế**:
```javascript
// ✅ SỬ DỤNG API THAY VÌ 
// Thay vì save vào , gọi API
await bookingAPI.createBooking(bookingData);
await bookingAPI.cancelBooking(ticketId);
```

---

## 🚀 **CHECKLIST MIGRATION**

### ✅ **Cần làm khi có Backend:**

1. **[ ] Setup API base URL** trong `.env`:
   ```
   REACT_APP_API_URL=http://localhost:8080/api
   ```

2. **[ ] Implement Authentication**:
   - Login/Logout endpoints
   - JWT token handling
   - Protected routes

3. **[ ] Replace Mock Data** theo thứ tự:
   - [ ] Movies API (Home + MovieDetail)
   - [ ] Showtimes API (MovieDetail)
   - [ ] Seat Map API (SeatSelection)  
   - [ ] Payment API (Payment)
   - [ ] Booking API (MyTickets)

4. **[ ] Remove Mock Code**:
   - [ ] Delete `mockData` object
   - [ ] Delete `apiWithFallback` functions
   - [ ] Remove  usage
   - [ ] Clean up mock arrays

5. **[ ] Error Handling**:
   - [ ] Implement proper error boundaries
   - [ ] Add loading states
   - [ ] Handle network errors

6. **[ ] Testing**:
   - [ ] Test all API integrations
   - [ ] Test error scenarios
   - [ ] Test authentication flow

---

## 🔗 **API Schema Reference**

### **Movie Object**:
```typescript
interface Movie {
  id: number;
  title: string;
  description: string;
  poster: string;
  backdrop?: string;
  rating: number;
  duration: number; // minutes
  releaseYear: number;
  genres: string[];
  director?: string;
  cast?: string[];
  trailerUrl?: string;
  isAvailable: boolean;
}
```

### **Showtime Object**:
```typescript
interface Showtime {
  id: string;
  movieId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  cinema: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
}
```

### **Seat Object**:
```typescript
interface Seat {
  id: string; // A1, B2, etc
  row: string;
  number: number;
  status: 'available' | 'occupied' | 'selected';
  type: 'regular' | 'vip';
  price: number;
}
```

### **Booking Object**:
```typescript
interface Booking {
  id: string;
  userId: number;
  movieId: number;
  showtimeId: string;
  selectedSeats: Seat[];
  totalPrice: number;
  customerInfo: CustomerInfo;
  paymentMethod: string;
  status: 'confirmed' | 'cancelled' | 'expired';
  bookingDate: string;
}
```

---

> **💡 Lưu ý**: Sau khi có backend, nhớ test kỹ từng API endpoint và xử lý các trường hợp lỗi như network timeout, server error, invalid data, etc.