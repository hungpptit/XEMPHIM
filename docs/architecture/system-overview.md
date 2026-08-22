# System Overview — XEMPHIM

**Version**: 1.0.0 | **Last Updated**: August 2026  
**Architecture**: Microservices | **Status**: Production-ready (Sandbox)

---

## 1. Problem Statement

Hệ thống đặt vé xem phim truyền thống gặp các vấn đề:
- **Race condition**: Nhiều người cùng đặt một ghế → trùng vé
- **Khó mở rộng**: Monolith không scale tốt theo từng nghiệp vụ
- **Tight coupling**: Một lỗi làm sập toàn bộ hệ thống

---

## 2. System Goals

| Goal | Metric |
|------|--------|
| **Concurrency safety** | Không có 2 người đặt cùng 1 ghế trong cùng suất chiếu |
| **High availability** | Mỗi service hoạt động độc lập, lỗi 1 service không làm sập service khác |
| **Scalability** | Từng service có thể scale riêng theo nhu cầu |
| **Async processing** | Email notification không block luồng đặt vé |

---

## 3. Architecture Decision

Kiến trúc **Microservices** được chọn thay vì Monolith. Xem chi tiết lý do tại:
[`docs/decisions/adr-001-microservices.md`](../decisions/adr-001-microservices.md)

---

## 4. Component Responsibilities

### 4.1 API Gateway (Port 8080)
- **Single Entry Point**: Tất cả request từ client đi qua Gateway
- **JWT Authentication**: Xác thực token, inject `X-User-Id`, `X-User-Email`, `X-User-Role` headers
- **Reverse Proxy**: Forward request đến service tương ứng (`express-http-proxy`)
- **CORS**: Kiểm soát origin được phép

### 4.2 User Service (Port 4001)
- Đăng ký / đăng nhập / đăng xuất
- JWT token generation (cookie HttpOnly)
- Password hashing (bcrypt, salt=10)
- User profile management
- **Database**: `XemPhim_User`

### 4.3 Movie Service (Port 4002)
- Quản lý phim (CRUD) + thể loại (genres)
- Quản lý rạp chiếu (cinemas), phòng chiếu (halls)
- Quản lý suất chiếu (showtimes)
- **Redis Cache-Aside**: Cache danh sách phim (TTL=1h), suất chiếu (TTL=10m)
- **Database**: `XemPhim_Movie`

### 4.4 Seat Service (Port 4003)
- Cung cấp sơ đồ ghế theo phòng chiếu
- Cung cấp trạng thái ghế theo suất chiếu
- **Database**: `XemPhim_Seat`

### 4.5 Booking Service (Port 4004) ← Core Service
- Khóa ghế tạm thời (lock): `status = 'locked'`, TTL = 120s
- **Redis Distributed Lock**: `SET NX PX` → ngăn race condition ở tốc độ cao
- **DB Pessimistic Lock** (fallback): `LOCK.UPDATE` trong Sequelize transaction
- Xác nhận thanh toán → `status = 'confirmed'`
- Hủy đặt vé → `status = 'cancelled'`
- Hoàn tiền → gọi Payment Service → `status = 'refunded'`
- Publish notification → RabbitMQ queue `ticket.notifications`
- **Cron job**: Tự động expire booking quá hạn mỗi 60s
- **Database**: `XemPhim_Booking`

### 4.6 Payment Service (Port 4005)
- Tạo đơn hàng ZaloPay (QR code)
- Xác thực callback MAC (HMAC-SHA256 + Key2)
- Ghi nhận lịch sử giao dịch
- Xử lý hoàn tiền (refund) qua ZaloPay API
- **Database**: `XemPhim_Payment`

### 4.7 Notification Service (Port 4006)
- RabbitMQ consumer: lắng nghe queue `ticket.notifications`
- Tạo QR code ảnh từ booking data
- Gửi email xác nhận vé qua Nodemailer (SMTP Gmail)
- Chạy hoàn toàn bất đồng bộ, không block API response

---

## 5. Data Flow — Booking a Ticket

```
User → Gateway → Booking Service → Redis (acquire lock)
                                 → SQL Server (conflict check)
                                 → Movie Service (get showtime price)
                                 → Seat Service (get seat details)
                                 → SQL Server (create booking 'locked')
     ← ────────────────────── booking_code, QR URL ─────────────────

User → Gateway → Payment Service → ZaloPay API (create order)
     ← ─────────────────── QR Code URL ────────────────────────────

[User scans QR on phone]

ZaloPay → Payment Service /callback (verify MAC)
        → Booking Service /confirm (status: locked → confirmed)
          → Payment Service (update payment record)
          → RabbitMQ publish (ticket.notifications)
          → Redis (release seat lock)

Notification Service (async) → consume RabbitMQ message
                             → generate QR image
                             → send email to user
```

---

## 6. Infrastructure

### Database Strategy: Database-per-Service
Mỗi service có riêng database, không truy cập chéo trực tiếp. Cross-service data access thực hiện qua REST API calls.

```
XemPhim_User     → User Service (4001)
XemPhim_Movie    → Movie Service (4002)
XemPhim_Seat     → Seat Service (4003)
XemPhim_Booking  → Booking Service (4004)
XemPhim_Payment  → Payment Service (4005)
```

### Redis Usage
| Use Case | Key Pattern | TTL |
|----------|------------|-----|
| Movie list cache | `movies:list*` | 3600s |
| Movie detail cache | `movies:detail:{id}` | 3600s |
| Showtime cache | `showtimes:movie:{id}` | 600s |
| Seat distributed lock | `lock:showtime:{id}:seat:{id}` | 120s |

### RabbitMQ
| Queue | Producer | Consumer |
|-------|----------|----------|
| `ticket.notifications` | Booking Service | Notification Service |

---

## 7. Error Handling & Resilience

| Scenario | Strategy |
|----------|----------|
| Redis offline | Fallback to DB Pessimistic Lock (LOCK.UPDATE) |
| RabbitMQ offline | Fallback to direct HTTP call to Notification Service |
| Movie Service offline | Error propagated to client (booking aborted) |
| ZaloPay offline | Error propagated to client (payment aborted) |

---

## 8. Security Architecture

| Layer | Control |
|-------|---------|
| Transport | HTTPS (Ngrok tunnel for local dev) |
| Authentication | JWT in HttpOnly Cookie (7-day expiry) |
| Authorization | Role check in Gateway middleware (`X-User-Role` header) |
| Password | bcrypt hash, salt rounds = 10 |
| ZaloPay | HMAC-SHA256 MAC verification on every callback |
| SQL | Sequelize parameterized queries (prevents SQL injection) |
| CORS | Origin whitelist at Gateway |

---

*See also: [Design Patterns](./design-patterns.md) | [API Reference](../api/README.md)*
