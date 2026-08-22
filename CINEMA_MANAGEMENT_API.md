# 🎬 Cinema Management API Documentation

**Tài Liệu Chi Tiết — API Quản Lý Rạp & Phòng Chiếu**

Phiên bản: 1.0.0  
Cập nhật: Tháng 8/2026  
Base URL Gateway: `http://localhost:8080/api/admin`  
Base URL Movie Service: `http://localhost:4002/api/admin`

---

## 📋 Table of Contents

1. [Giới Thiệu](#giới-thiệu)
2. [Xác Thực & Phân Quyền](#xác-thực--phân-quyền)
3. [Database Schema (MSSQL)](#database-schema-mssql)
4. [API Endpoints Reference](#api-endpoints-reference)
   - [Cinema (Rạp Chiếu)](#1-cinema-rạp-chiếu)
   - [Hall (Phòng Chiếu)](#2-hall-phòng-chiếu)
   - [Seat (Ghế Ngồi)](#3-seat-ghế-ngồi)
   - [Showtime Admin (Suất Chiếu)](#4-showtime-admin-suất-chiếu)
5. [Error Handling & Mã Lỗi](#error-handling--mã-lỗi)

---

## 🎯 Giới Thiệu

Hệ thống cung cấp trọn bộ RESTful API cho phép Admin quản lý cơ sở hạ tầng rạp chiếu phim trong kiến trúc Microservices XEMPHIM:

- 🏢 **Quản Lý Rạp Chiếu**: Tạo, chỉnh sửa, xóa và thống kê tổng quan các cụm rạp
- 🚪 **Quản Lý Phòng Chiếu**: Cấu hình số hàng, số ghế, phân loại phòng (2D, 3D, IMAX)
- 🪑 **Quản Lý Ghế & Sơ Đồ**: Tự động sinh layout ma trận, gán loại ghế và điều chỉnh hệ số giá vé
- ⏰ **Quản Lý Suất Chiếu**: Tạo lịch chiếu gắn với phòng chiếu và phim

---

## 🔐 Xác Thực & Phân Quyền

Tất cả các endpoint trong tài liệu này đều yêu cầu quyền **Admin**.

### Cơ Chế Xác Thực
1. **Qua API Gateway (Port 8080)**:
   - Client gửi Cookie `access_token` (HttpOnly) hoặc Header `Authorization: Bearer <token>`.
   - Gateway giải mã JWT, kiểm tra `role === 'admin'` và chuyển tiếp request kèm header nội bộ:
     ```http
     X-User-Id: 1
     X-User-Role: admin
     ```
2. **Tại Movie Service (Port 4002)**:
   - Middleware `adminAuth` (`services/movie-service/middleware/adminAuth.js`) xác thực quyền admin trước khi cho phép controller xử lý.

```http
GET /api/admin/cinemas HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 📊 Database Schema (MSSQL)

### Table: `cinemas` (Database: `XemPhim_Movie`)

```sql
CREATE TABLE cinemas (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  address NVARCHAR(500) NOT NULL,
  city NVARCHAR(255) NOT NULL,
  status NVARCHAR(50) DEFAULT 'active',
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE()
);
```

### Table: `cinema_halls` (Database: `XemPhim_Movie`)

```sql
CREATE TABLE cinema_halls (
  id INT IDENTITY(1,1) PRIMARY KEY,
  cinema_id INT NOT NULL,
  name NVARCHAR(255) NOT NULL,
  total_seats INT NOT NULL,
  created_at DATETIME DEFAULT GETDATE(),
  updated_at DATETIME DEFAULT GETDATE(),
  CONSTRAINT FK_CinemaHalls_Cinema FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
);
```

### Table: `seats` (Database: `XemPhim_Movie`)

```sql
CREATE TABLE seats (
  id INT IDENTITY(1,1) PRIMARY KEY,
  hall_id INT NOT NULL,
  row_name CHAR(1) NOT NULL,
  seat_number INT NOT NULL,
  seat_type NVARCHAR(255) NOT NULL DEFAULT 'Standard',
  price_modifier DECIMAL(15, 2) DEFAULT 1.00,
  is_active BIT DEFAULT 1,
  CONSTRAINT FK_Seats_Hall FOREIGN KEY (hall_id) REFERENCES cinema_halls(id),
  CONSTRAINT UQ_Seats_Hall_Row_Number UNIQUE (hall_id, row_name, seat_number)
);
```

---

## 🔌 API Endpoints Reference

### 1. Cinema (Rạp Chiếu)

#### 1.1 Lấy Danh Sách Rạp Chiếu
- **Endpoint**: `GET /api/admin/cinemas`
- **Quyền**: Admin

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "CGV Vincom Bà Triệu",
      "address": "191 Bà Triệu, Hai Bà Trưng",
      "city": "Hà Nội",
      "status": "active"
    }
  ],
  "total": 1
}
```

#### 1.2 Tạo Rạp Chiếu Mới
- **Endpoint**: `POST /api/admin/cinemas`
- **Request Body:**
```json
{
  "name": "CGV Vincom Bà Triệu",
  "address": "191 Bà Triệu, Hai Bà Trưng",
  "city": "Hà Nội",
  "status": "active"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "message": "Rạp chiếu được tạo thành công",
  "data": {
    "id": 1,
    "name": "CGV Vincom Bà Triệu",
    "address": "191 Bà Triệu, Hai Bà Trưng",
    "city": "Hà Nội",
    "status": "active"
  }
}
```

#### 1.3 Lấy Chi Tiết Rạp
- **Endpoint**: `GET /api/admin/cinemas/:id`
- **Response (200 OK):** Trả về thông tin rạp tương ứng.

#### 1.4 Cập Nhật Rạp
- **Endpoint**: `PUT /api/admin/cinemas/:id`
- **Request Body:**
```json
{
  "name": "CGV Vincom Bà Triệu (Đã nâng cấp)",
  "status": "active"
}
```

#### 1.5 Xóa Rạp
- **Endpoint**: `DELETE /api/admin/cinemas/:id`
- **Response (200 OK):** `{ "success": true, "message": "Xóa rạp thành công" }`

#### 1.6 Thống Kê Tổng Quan Rạp
- **Endpoint**: `GET /api/admin/cinemas/stats/overview`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalCinemas": 5,
    "activeCinemas": 5,
    "totalHalls": 18,
    "totalSeats": 2400
  }
}
```

#### 1.7 Lấy Danh Sách Phòng Chiếu Của Rạp
- **Endpoint**: `GET /api/admin/cinemas/:cinemaId/halls`

---

### 2. Hall (Phòng Chiếu)

#### 2.1 Tạo Phòng Chiếu Mới (Tự Động Sinh Ghế)
- **Endpoint**: `POST /api/admin/halls`
- **Request Body:**
```json
{
  "cinemaId": 1,
  "name": "Phòng 01 (IMAX)",
  "rows": 10,
  "seatsPerRow": 15
}
```
*Ghi chú: Hệ thống sẽ tự động tạo `10 × 15 = 150` ghế Standard.*

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Tạo phòng chiếu thành công",
  "data": {
    "id": 1,
    "cinema_id": 1,
    "name": "Phòng 01 (IMAX)",
    "total_seats": 150
  }
}
```

#### 2.2 Lấy Chi Tiết Phòng & Ma Trận Sơ Đồ Ghế
- **Endpoint**: `GET /api/admin/halls/:hallId/detail`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Phòng 01 (IMAX)",
    "total_seats": 150,
    "layout": {
      "A": [
        { "id": 101, "number": 1, "type": "Standard", "modifier": 1.0, "active": true },
        { "id": 102, "number": 2, "type": "Standard", "modifier": 1.0, "active": true }
      ],
      "B": [ ... ]
    }
  }
}
```

#### 2.3 Cập Nhật Phòng Chiếu
- **Endpoint**: `PUT /api/admin/halls/:hallId`

#### 2.4 Xóa Phòng Chiếu
- **Endpoint**: `DELETE /api/admin/halls/:hallId`

---

### 3. Seat (Ghế Ngồi)

#### 3.1 Lấy Sơ Đồ Ghế Của Phòng
- **Endpoint**: `GET /api/admin/halls/:hallId/seats/layout`

#### 3.2 Cập Nhật Thông Tin Một Ghế Cụ Thể
- **Endpoint**: `PUT /api/admin/seats/:seatId`
- **Request Body:**
```json
{
  "seat_type": "VIP",
  "price_modifier": 1.50,
  "is_active": true
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cập nhật ghế thành công",
  "data": {
    "id": 101,
    "seat_type": "VIP",
    "price_modifier": 1.50,
    "is_active": true
  }
}
```

#### 3.3 Cập Nhật Loại Ghế Cho Cả Phòng Hàng Loạt
- **Endpoint**: `PUT /api/admin/halls/:hallId/seats/type`
- **Request Body:**
```json
{
  "seatType": "VIP",
  "priceModifier": 1.50
}
```

#### 3.4 Xóa Một Ghế
- **Endpoint**: `DELETE /api/admin/seats/:seatId`

---

### 4. Showtime Admin (Suất Chiếu)

#### 4.1 Lấy Danh Sách Suất Chiếu
- **Endpoint**: `GET /api/admin/showtimes`

#### 4.2 Tạo Suất Chiếu Mới
- **Endpoint**: `POST /api/admin/showtimes`
- **Request Body:**
```json
{
  "movie_id": 1,
  "hall_id": 1,
  "start_time": "2026-08-25T19:00:00.000Z",
  "end_time": "2026-08-25T21:30:00.000Z",
  "base_price": 80000
}
```

#### 4.3 Xóa Suất Chiếu
- **Endpoint**: `DELETE /api/admin/showtimes/:id`

---

## ⚠️ Error Handling & Mã Lỗi

Tất cả các phản hồi lỗi đều tuân thủ chuẩn format JSON:

```json
{
  "success": false,
  "message": "Mô tả nguyên nhân lỗi bằng tiếng Việt hoặc tiếng Anh",
  "error": "Chi tiết lỗi kỹ thuật (khi ở chế độ development)"
}
```

| HTTP Status | Trường Hợp Xảy Ra |
|-------------|-------------------|
| `400 Bad Request` | Dữ liệu đầu vào thiếu hoặc không hợp lệ |
| `401 Unauthorized` | Không có token hoặc token đã hết hạn |
| `403 Forbidden` | Tài khoản không có quyền Admin (`role !== 'admin'`) |
| `404 Not Found` | Rạp, Phòng hoặc Ghế không tồn tại |
| `500 Server Error` | Lỗi kết nối cơ sở dữ liệu MSSQL hoặc lỗi xử lý nội bộ |

---

*Cập nhật: Tháng 8/2026 | Phiên bản: 1.0.0 | Tác giả: Phạm Tuấn Hưng*
