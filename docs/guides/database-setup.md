# Database Setup Guide — XEMPHIM

---

## Prerequisites

- Microsoft SQL Server 2019+ đã được cài đặt và chạy
- SQL Server port `1433` đang mở
- Tài khoản `sa` hoặc user có quyền `CREATE DATABASE`

---

## Bước 1: Kiểm tra SQL Server

```sql
-- Kiểm tra SQL Server version
SELECT @@VERSION;

-- Kiểm tra server name
SELECT @@SERVERNAME;
```

---

## Bước 2: Chạy SQL Schema Files

Các file SQL nằm ở thư mục gốc của project. Chạy theo thứ tự:

```bash
# Sử dụng sqlcmd (cài cùng với SQL Server)
sqlcmd -S localhost -U sa -P <your_password> -i XemPhim_User.sql
sqlcmd -S localhost -U sa -P <your_password> -i XemPhim_Movie.sql
sqlcmd -S localhost -U sa -P <your_password> -i XemPhim_Seat.sql
sqlcmd -S localhost -U sa -P <your_password> -i XemPhim_Booking.sql
sqlcmd -S localhost -U sa -P <your_password> -i XemPhim_Payment.sql
```

Hoặc mở từng file trong **SQL Server Management Studio (SSMS)** → Execute.

---

## Bước 3: Xác nhận tạo thành công

```sql
-- Kiểm tra danh sách databases
SELECT name FROM sys.databases WHERE name LIKE 'XemPhim%';
-- Kết quả mong đợi:
-- XemPhim_User
-- XemPhim_Movie
-- XemPhim_Seat
-- XemPhim_Booking
-- XemPhim_Payment
```

---

## Database Schema Overview

### XemPhim_User
| Table | Description |
|-------|-------------|
| `users` | Thông tin tài khoản người dùng (id, email, password_hash, role) |

### XemPhim_Movie
| Table | Description |
|-------|-------------|
| `movies` | Thông tin phim (title, poster, duration, rating, ...) |
| `genres` | Thể loại phim |
| `movie_genres` | Quan hệ nhiều-nhiều Movie ↔ Genre |
| `cinemas` | Rạp chiếu (name, address, city) |
| `cinema_halls` | Phòng chiếu (name, total_seats, cinema_id) |
| `showtimes` | Suất chiếu (movie_id, hall_id, start_time, base_price) |

### XemPhim_Seat
| Table | Description |
|-------|-------------|
| `seats` | Ghế trong phòng (hall_id, row_name, seat_number, seat_type, price_modifier) |
| `booking_seats` | Ghế được đặt trong booking |

### XemPhim_Booking
| Table | Description |
|-------|-------------|
| `bookings` | Đơn đặt vé (user_id, showtime_id, status, total_price, expire_at) |
| `booking_seats` | Ghế trong từng booking |

**Booking Status Lifecycle:**
```
locked → confirmed (sau thanh toán thành công)
locked → expired   (sau 120s không thanh toán)
locked → cancelled (user hủy)
confirmed → refunded (user yêu cầu hoàn tiền)
```

### XemPhim_Payment
| Table | Description |
|-------|-------------|
| `payments` | Lịch sử giao dịch (booking_id, method, amount, status, payment_code) |

---

## Seat Types & Price Modifiers

| Type | Price Modifier | Description |
|------|---------------|-------------|
| `Standard` | 1.0 | Ghế thường |
| `VIP` | 1.5 | Ghế VIP (+50%) |
| `Couple` | 2.0 | Ghế đôi (+100%) |
| `Premium` | 2.5 | Ghế Premium (+150%) |
| `Disabled` | 0.5 | Ghế người khuyết tật (-50%) |

**Giá ghế** = `showtime.base_price × seat.price_modifier`

---

## Troubleshooting

### Lỗi kết nối từ Node.js

```
Error: Failed to connect to localhost:1433 - Could not connect
```

**Kiểm tra:**
1. SQL Server Browser service đang chạy
2. TCP/IP được bật trong SQL Server Configuration Manager
3. Port 1433 không bị firewall chặn
4. `DB_ENCRYPT=false` trong `.env` (cho local dev)

### Lỗi authentication

```
Error: Login failed for user 'sa'
```

**Kiểm tra:**
1. SQL Server Authentication mode được bật (không chỉ Windows Authentication)
2. `sa` account không bị disabled

```sql
-- Bật sa account
ALTER LOGIN sa ENABLE;
ALTER LOGIN sa WITH PASSWORD = 'YourStrongPassword';
```

---

*Xem thêm: [Environment Variables](./environment.md) | [System Overview](../architecture/system-overview.md)*
