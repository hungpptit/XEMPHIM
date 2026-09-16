# Design Patterns — XEMPHIM

Tài liệu mô tả các **design patterns** và kiến trúc phân tán được áp dụng trong hệ thống XEMPHIM.

---

## 1. Singleton Pattern

### Áp dụng
- Kết nối Sequelize DB tại `models/index.js` của mỗi service → tái sử dụng một instance duy nhất.
- Redis client (`ioredis`) dùng chung trong vòng đời của Movie Service và Booking Service.

### Lợi ích
- Tránh mở nhiều kết nối song song → không tràn connection pool.
- Tiết kiệm tài nguyên, tăng tốc độ phản hồi.

```javascript
// models/index.js (pattern example)
const sequelize = new Sequelize(DB_NAME, USER, PASS, { dialect: 'mssql' });
export { sequelize }; // Singleton — imported across the service
```

---

## 2. Factory Pattern

### Áp dụng
- Các file model (`user.js`, `movie.js`, `booking.js`) export một **hàm** nhận `sequelize` + `DataTypes` → trả về Model đã cấu hình.
- `models/index.js` đóng vai trò **Factory** — khởi tạo và kết nối tất cả models.

### Lợi ích
- Giảm phụ thuộc trực tiếp vào connection instance.
- Dễ mock để viết unit test (inject test sequelize instance).

```javascript
// Pattern: Model factory function
export default (sequelize, DataTypes) => {
  return sequelize.define('User', { ... });
};
```

---

## 3. API Gateway Pattern

### Áp dụng
- Tất cả request từ Frontend đi qua **cổng duy nhất** `:8080`.
- Gateway xác thực JWT, inject user context headers, forward đến service tương ứng.

```
Client → Gateway(:8080) → /api/auth/* → User Service(:4001)
                        → /api/movies/* → Movie Service(:4002)
                        → /api/bookings/* → Booking Service(:4004)
```

### Headers injected bởi Gateway
```
X-User-Id:    <userId>
X-User-Email: <userEmail>
X-User-Role:  <role>
```

---

## 4. Proxy Pattern (Reverse Proxy)

### Áp dụng
- `express-http-proxy` tại Gateway forward request trong suốt đến service ports nội bộ.
- Client không biết cổng thật của từng service.

---

## 5. Cache-Aside Pattern (Lazy Loading)

### Áp dụng
Tại **Movie Service** cho danh sách phim và suất chiếu:

```
Request → Check Redis
              │
         Cache Hit? ──YES──→ Return cached JSON (fast)
              │
             NO
              │
         Query SQL Server
              │
         Store in Redis (with TTL)
              │
         Return data
```

| Resource | Cache Key | TTL |
|----------|-----------|-----|
| Movie list | `movies:list` | 3600s |
| Movie detail | `movies:detail:{id}` | 3600s |
| Showtimes | `showtimes:movie:{id}` | 600s |

### Cache Invalidation
Khi có thay đổi (create/update/delete), service **chủ động xóa cache** (Active Invalidation):
```javascript
await invalidateListCache(); // SCAN & DEL movies:list*
await redis.del(`movies:detail:${id}`);
```

---

## 6. Distributed Lock Pattern (Redis Lock)

### Vấn đề
Race condition: nhiều user cùng đặt 1 ghế → 2 người cùng giữ 1 ghế.

### Giải pháp
**Redis `SET NX PX`** (Set if Not Exists + Expiry in milliseconds):

```javascript
// Acquire lock
const key = `lock:showtime:${showtimeId}:seat:${seatId}`;
const success = await redis.set(key, 'locked', 'NX', 'PX', 120000);

if (!success) {
  return { success: false, conflicts: [seatId] }; // Seat already locked!
}
```

**TTL = 120s**: Lock tự hủy nếu user không thanh toán trong 2 phút.

### Fallback
Khi Redis offline → sử dụng **Pessimistic Lock** ở DB:
```javascript
await Booking.findAll({ transaction: t, lock: t.LOCK.UPDATE });
```

---

## 7. Publish-Subscribe Pattern (RabbitMQ)

### Áp dụng

```
Booking Service ──publish──→ [ticket.notifications queue] ──consume──→ Notification Service
                                                                              │
                                                                    Generate QR Image
                                                                    Send Email (SMTP)
```

### Lợi ích
- Booking Service phản hồi client **ngay lập tức** sau khi confirm payment.
- Email gửi **bất đồng bộ**, không làm chậm API response.
- **Decoupling**: Notification Service có thể restart độc lập.

### Fallback
Khi RabbitMQ offline → gọi trực tiếp HTTP `POST /api/notifications/send`.

---

## 8. Database-per-Service Pattern

### Áp dụng
Mỗi microservice **sở hữu** riêng database, không cho service khác truy cập trực tiếp.

```
User Service    → XemPhim_User    (users)
Movie Service   → XemPhim_Movie   (movies, showtimes, cinemas, halls)
Seat Service    → XemPhim_Seat    (seats, booking_seats)
Booking Service → XemPhim_Booking (bookings, booking_seats)
Payment Service → XemPhim_Payment (payments)
```

### Cross-service Data Access
Thực hiện qua **REST API** nội bộ (không cross-DB join):
```javascript
// Booking Service cần thông tin showtime → gọi Movie Service
const res = await axios.get(`${MOVIE_SERVICE}/api/showtimes/${showtime_id}`);
```

---

## 9. SOLID Principles

| Principle | Áp dụng |
|-----------|---------|
| **S** — Single Responsibility | Mỗi service chỉ đảm nhận 1 nghiệp vụ |
| **O** — Open/Closed | Thêm service mới không ảnh hưởng service cũ |
| **D** — Dependency Inversion | Controllers phụ thuộc vào service layer, không trực tiếp gọi DB driver |

---

## 10. Adapter Pattern

### Áp dụng
`zalopayService.js` đóng gói toàn bộ logic giao tiếp với ZaloPay API (format request, sign MAC, parse response) — các service khác chỉ gọi qua interface đơn giản.

```javascript
// Interface đơn giản cho caller
const result = await zalopayService.createOrder({ booking_id, amount, description });
const isValid = zalopayService.verifyCallback(dataStr, receivedMac);
```

---

*See also: [System Overview](./system-overview.md) | [ADR-001](../decisions/adr-001-microservices.md)*
