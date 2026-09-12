# API Reference — XEMPHIM

**Base URL**: `http://localhost:8080`  
**Auth**: JWT via HttpOnly Cookie hoặc `Authorization: Bearer <token>`  
**Content-Type**: `application/json`

---

## Quick Reference

| Service | Port | Base Path |
|---------|------|-----------|
| User Service | 4001 | `/api/auth`, `/api/users` |
| Movie Service | 4002 | `/api/movies`, `/api/showtimes`, `/api/admin` |
| Seat Service | 4003 | `/api/seats` |
| Booking Service | 4004 | `/api/bookings` |
| Payment Service | 4005 | `/api/payments`, `/api/zalopay` |

---

## 1. User Service — Authentication

### POST `/api/auth/register`
Đăng ký tài khoản mới.

**Request Body:**
```json
{
  "full_name": "Nguyen Van A",
  "email": "nguyenvana@gmail.com",
  "password": "securePassword123",
  "phone_number": "0912345678"
}
```

**Response `201`:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "nguyenvana@gmail.com",
    "full_name": "Nguyen Van A",
    "role": "user"
  }
}
```

**Validation Rules:**
- Email phải kết thúc bằng `@gmail.com`
- Password tối thiểu 6 ký tự

---

### POST `/api/auth/login`
Đăng nhập, trả về JWT cookie.

**Request Body:**
```json
{
  "email": "nguyenvana@gmail.com",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "nguyenvana@gmail.com",
    "role": "user"
  }
}
```
*JWT được set trong `HttpOnly Cookie` tự động.*

---

### GET `/api/auth/profile`
🔐 Yêu cầu xác thực.

**Response `200`:**
```json
{
  "id": 1,
  "email": "nguyenvana@gmail.com",
  "full_name": "Nguyen Van A",
  "phone_number": "0912345678",
  "role": "user"
}
```

---

### POST `/api/auth/logout`
🔐 Yêu cầu xác thực. Xóa JWT cookie.

**Response `200`:**
```json
{ "message": "Logged out successfully" }
```

---

## 2. Movie Service — Movies & Showtimes

### GET `/api/movies`
Lấy danh sách phim đang chiếu (cached in Redis).

**Response `200`:**
```json
[
  {
    "id": 1,
    "title": "Avengers: Endgame",
    "description": "...",
    "poster_url": "https://...",
    "duration_minutes": 181,
    "release_date": "2025-04-26",
    "rating": 8.4,
    "director": "Anthony Russo",
    "status": "now_showing"
  }
]
```

---

### GET `/api/movies/:id`
Lấy chi tiết phim theo ID.

---

### GET `/api/showtimes?movie_id=:id`
Lấy danh sách suất chiếu của một phim.

**Response `200`:**
```json
[
  {
    "id": 10,
    "movie_id": 1,
    "hall_id": 2,
    "start_time": "2026-08-25T14:00:00.000Z",
    "end_time": "2026-08-25T17:00:00.000Z",
    "base_price": 85000,
    "CinemaHall": {
      "id": 2,
      "name": "Phòng A (2D)",
      "Cinema": {
        "name": "CGV Hà Nội",
        "address": "...",
        "city": "Hà Nội"
      }
    }
  }
]
```

---

## 3. Seat Service — Seat Availability

### GET `/api/seats/showtime/:showtimeId`
Lấy trạng thái ghế của suất chiếu.
🔐 Yêu cầu xác thực.

**Response `200`:**
```json
[
  {
    "id": 101,
    "row_name": "A",
    "seat_number": 1,
    "seat_type": "Standard",
    "price_modifier": 1.0,
    "status": "available"
  },
  {
    "id": 102,
    "row_name": "A",
    "seat_number": 2,
    "seat_type": "VIP",
    "price_modifier": 1.5,
    "status": "booked"
  }
]
```

**Seat Status Values:**
| Status | Mô tả |
|--------|-------|
| `available` | Ghế trống, có thể đặt |
| `locked` | Đang được giữ (trong 120s) |
| `booked` | Đã đặt và thanh toán |

---

## 4. Booking Service — Booking Lifecycle

### POST `/api/bookings`
🔐 Tạo đơn đặt vé (lock ghế).

**Request Body:**
```json
{
  "showtime_id": 10,
  "seat_ids": [101, 102],
  "holdSeconds": 120
}
```

**Response `201`:**
```json
{
  "success": true,
  "booking": {
    "id": 50,
    "booking_code": "550e8400-e29b-41d4-a716-446655440000",
    "status": "locked",
    "total_price": 172500,
    "expire_at": "2026-08-25T14:02:00.000Z"
  }
}
```

**Response `409` (Conflict):**
```json
{
  "success": false,
  "conflicts": [101]
}
```

---

### GET `/api/bookings`
🔐 Lấy lịch sử đặt vé của user hiện tại.

---

### GET `/api/bookings/:id`
🔐 Lấy chi tiết đơn đặt vé.

---

### DELETE `/api/bookings/:id`
🔐 Hủy đơn đặt vé (chỉ được hủy khi status = `locked`).

---

### POST `/api/bookings/:id/refund`
🔐 Hoàn tiền (chỉ được hoàn khi status = `confirmed`).

---

## 5. Payment Service — ZaloPay Integration

### POST `/api/payments/orders`
🔐 Tạo đơn hàng ZaloPay và sinh QR code.

**Request Body:**
```json
{
  "booking_id": 50,
  "booking_code": "550e8400-...",
  "amount": 172500,
  "description": "Thanh toan ve phim 550e8400-..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "app_trans_id": "260825_123456",
  "order_url": "https://qr.zalopay.vn/...",
  "zp_trans_token": "...",
  "return_code": 1
}
```

---

### POST `/api/zalopay/callback`
❌ Public endpoint (called by ZaloPay server, NOT by frontend).

**Headers required:**
```
Content-Type: application/json
```

**Request Body (from ZaloPay):**
```json
{
  "data": "{\"app_trans_id\":\"...\",\"amount\":172500}",
  "mac": "hmac_sha256_signature"
}
```

**Response `200`:**
```json
{ "return_code": 1, "return_message": "success" }
```

---

## 6. Error Response Format

All error responses follow this schema:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "error": "Technical error detail (dev only)"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — Invalid input |
| `401` | Unauthorized — Missing or invalid JWT |
| `403` | Forbidden — Insufficient permissions |
| `404` | Not Found |
| `409` | Conflict — e.g., seat already booked |
| `500` | Internal Server Error |

---

*See also: [System Overview](../architecture/system-overview.md) | [ZaloPay Guide](../guides/zalopay-integration.md)*
