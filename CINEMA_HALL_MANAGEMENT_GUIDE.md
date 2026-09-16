# 🎬 HƯỚNG DẪN QUẢN LÝ PHÒNG CHIẾU — Cinema Hall Management System

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Cấu Trúc Dữ Liệu](#cấu-trúc-dữ-liệu)
3. [Backend API](#backend-api)
4. [Frontend Architecture](#frontend-architecture)
5. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
6. [Ghi Chú Triển Khai](#ghi-chú-triển-khai)

---

## 🎯 Tổng Quan

Hệ thống **Quản Lý Rạp & Phòng Chiếu** cung cấp đầy đủ các tính năng quản trị cho rạp chiếu phim trong hệ sinh thái XEMPHIM:

### Tính Năng Chính
- ✅ **Quản Lý Rạp Chiếu**: Tạo, cập nhật, xóa và tra cứu danh sách rạp chiếu (Cinemas)
- ✅ **Quản Lý Phòng Chiếu**: CRUD phòng chiếu (Cinema Halls), cấu hình số hàng/ghế
- ✅ **Quản Lý & Phân Loại Ghế**: Phân loại ghế (Standard, VIP, Couple, Premium, Disabled)
- ✅ **Sơ Đồ Ghế Trực Quan**: Render layout hàng/cột tương tác, bulk update loại ghế
- ✅ **Định Giá Ghế**: Thiết lập hệ số giá `price_modifier` cho từng loại ghế

### Kiến Trúc Hệ Thống
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React - Port 3000)             │
│  - Pages: CinemaList, HallList, ShowtimeManagement          │
│  - Components: CinemaForm, HallForm                         │
│  - Service: adminService.js                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP (Cookies / Bearer)
┌──────────────────────────────▼──────────────────────────────┐
│                  API Gateway (Port 8080)                    │
│           JWT Auth Middleware · Route Proxy                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ Proxy /api/admin/*
┌──────────────────────────────▼──────────────────────────────┐
│                Movie Service (Port 4002)                    │
│  - Controllers: cinemaController, hallController, ...       │
│  - Routes: cinemaRoutes.js, adminRoutes.js                  │
│  - Models: Cinema, CinemaHall, Seat                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ MSSQL (Sequelize)
┌──────────────────────────────▼──────────────────────────────┐
│               Database: XemPhim_Movie                       │
│           cinemas, cinema_halls, seats, showtimes           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Cấu Trúc Dữ Liệu (Database Schema)

### 1. Cinema (Rạp Chiếu)
**Bảng**: `cinemas` (Database: `XemPhim_Movie`)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| `id` | INT (PK, IDENTITY) | ID rạp |
| `name` | VARCHAR(255) | Tên rạp (VD: CGV Vincom Bà Triệu) |
| `address` | VARCHAR(500) | Địa chỉ chi tiết |
| `city` | VARCHAR(255) | Tỉnh / Thành phố |
| `status` | VARCHAR(50) | Trạng thái (`active`, `inactive`) |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

### 2. CinemaHall (Phòng Chiếu)
**Bảng**: `cinema_halls` (Database: `XemPhim_Movie`)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| `id` | INT (PK, IDENTITY) | ID phòng chiếu |
| `cinema_id` | INT (FK -> `cinemas.id`) | Tham chiếu đến rạp |
| `name` | VARCHAR(255) | Tên phòng (VD: Phòng 01, IMAX Laser) |
| `total_seats` | INT | Tổng số ghế của phòng |
| `created_at` | DATETIME | Thời gian tạo |
| `updated_at` | DATETIME | Thời gian cập nhật |

### 3. Seat (Ghế Ngồi)
**Bảng**: `seats` (Database: `XemPhim_Movie` & `XemPhim_Seat`)

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| `id` | INT (PK, IDENTITY) | ID ghế |
| `hall_id` | INT (FK -> `cinema_halls.id`) | Tham chiếu đến phòng chiếu |
| `row_name` | CHAR(1) | Ký hiệu hàng ghế (A, B, C, ...) |
| `seat_number` | INT | Số thứ tự ghế trong hàng (1, 2, 3, ...) |
| `seat_type` | VARCHAR(255) | Phân loại: `Standard`, `VIP`, `Couple`, `Premium`, `Disabled` |
| `price_modifier` | DECIMAL(15, 2) | Hệ số nhân giá vé (1.0, 1.5, 2.0, ...) |
| `is_active` | BIT / BOOLEAN | Trạng thái khả dụng (1 = Active, 0 = Disabled) |

> **Ràng buộc duy nhất**: `UNIQUE(hall_id, row_name, seat_number)`

---

## 🔌 Backend API Reference

**Base URL qua Gateway**: `http://localhost:8080/api/admin`  
**Direct Movie Service**: `http://localhost:4002/api/admin`  
**Xác thực**: Yêu cầu JWT token với `role: 'admin'` (truyền qua Cookie `access_token` hoặc Header `Authorization: Bearer <token>`).

### A. Quản Lý Rạp (Cinemas)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/admin/cinemas` | Tạo rạp chiếu mới |
| `GET` | `/api/admin/cinemas` | Lấy danh sách rạp |
| `GET` | `/api/admin/cinemas/:id` | Lấy thông tin chi tiết rạp |
| `PUT` | `/api/admin/cinemas/:id` | Cập nhật thông tin rạp |
| `DELETE` | `/api/admin/cinemas/:id` | Xóa rạp chiếu (chỉ khi không có phòng/lịch chiếu) |
| `GET` | `/api/admin/cinemas/stats/overview` | Lấy thống kê tổng quan (số rạp, phòng, ghế) |
| `GET` | `/api/admin/cinemas/:cinemaId/halls` | Lấy danh sách phòng chiếu thuộc rạp |

### B. Quản Lý Phòng Chiếu (Halls)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/admin/halls` | Tạo phòng chiếu mới (kèm tự động sinh ghế) |
| `GET` | `/api/admin/halls` | Lấy tất cả phòng chiếu |
| `GET` | `/api/admin/halls/:hallId` | Lấy thông tin cơ bản phòng chiếu |
| `GET` | `/api/admin/halls/:hallId/detail` | Lấy chi tiết phòng kèm ma trận sơ đồ ghế |
| `PUT` | `/api/admin/halls/:hallId` | Cập nhật thông tin phòng chiếu |
| `DELETE` | `/api/admin/halls/:hallId` | Xóa phòng chiếu |

### C. Quản Lý Ghế Ngồi (Seats)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| `POST` | `/api/admin/seats` | Tạo ghế thủ công theo lô |
| `GET` | `/api/admin/halls/:hallId/seats` | Lấy danh sách ghế của phòng |
| `GET` | `/api/admin/halls/:hallId/seats/layout` | Lấy layout ma trận ghế theo hàng |
| `PUT` | `/api/admin/seats/:seatId` | Cập nhật 1 ghế cụ thể (loại ghế, hệ số giá, active) |
| `PUT` | `/api/admin/halls/:hallId/seats/type` | Cập nhật loại ghế hàng loạt cho cả phòng |
| `DELETE` | `/api/admin/seats/:seatId` | Xóa 1 ghế |

---

## 🎨 Frontend Architecture

### Cấu Trúc File Frontend Admin
```
frontend/src/modules/Admin/
├── components/
│   ├── CinemaForm.js             # Modal Form tạo/sửa Rạp chiếu
│   ├── CinemaForm.module.css
│   └── HallForm.js               # Modal Form tạo/sửa Phòng chiếu
├── pages/
│   ├── CinemaManagement/
│   │   ├── CinemaList.js         # Trang danh sách rạp + quản lý rạp
│   │   └── CinemaList.module.css
│   ├── HallManagement/
│   │   ├── HallList.js           # Trang quản lý phòng + tương tác sơ đồ ghế
│   │   └── HallList.module.css
│   ├── MovieManagement/          # Quản lý danh mục phim
│   ├── ShowtimeManagement/       # Quản lý lịch chiếu
│   ├── RevenueManagement/        # Thống kê doanh thu
│   └── UserManagement/           # Quản lý tài khoản
├── services/
│   └── adminService.js           # Axios client kết nối Gateway (:8080)
└── index.js                      # Admin Module Entry Router
```

### Sử Dụng `adminService.js`

```javascript
import { cinemaAPI, hallAPI } from './services/adminService';

// Lấy danh sách rạp
const cinemas = await cinemaAPI.list();

// Lấy chi tiết phòng và sơ đồ ghế
const hallDetail = await hallAPI.getDetail(hallId);
```

---

## 📖 Hướng Dẫn Sử Dụng

### 1. Thiết Lập Rạp Mới
1. Đăng nhập với tài khoản Admin (`role: 'admin'`).
2. Vào mục **Quản Lý Rạp Chiếu** trong Admin Dashboard.
3. Nhấn **Thêm Rạp Mới**, nhập Tên rạp, Địa chỉ, Thành phố, Trạng thái.
4. Nhấn **Lưu** để hoàn tất.

### 2. Thiết Lập Phòng Chiếu & Sơ Đồ Ghế
1. Vào tab **Quản Lý Phòng Chiếu**, chọn rạp chiếu từ danh sách.
2. Nhấn **Thêm Phòng Chiếu**, nhập:
   - Tên phòng (VD: Phòng 01)
   - Số hàng ghế (Rows: 1-26, tương ứng A-Z)
   - Số ghế mỗi hàng (Seats per row: 1-50)
3. Hệ thống sẽ tự động tính `total_seats` và khởi tạo toàn bộ ghế ở trạng thái `Standard` với `price_modifier = 1.0`.
4. Trên giao diện sơ đồ ghế, chọn các hàng VIP / Couple / Premium và tiến hành cập nhật hệ số giá.

### 3. Phân Loại Ghế & Hệ Số Giá Chuẩn

| Loại Ghế | Hệ Số Giá (`price_modifier`) | Công Thức Tính Giá Vé | Ghi Chú |
|----------|------------------------------|-----------------------|---------|
| **Standard** | `1.0` | `base_price × 1.0` | Ghế thường tiêu chuẩn |
| **VIP** | `1.5` | `base_price × 1.5` | Ghế vị trí trung tâm, êm ái |
| **Couple** | `2.0` | `base_price × 2.0` | Ghế đôi hàng sau hoặc bên cánh |
| **Premium** | `2.5` | `base_price × 2.5` | Ghế ngả cao cấp / Sweetbox |
| **Disabled** | `0.5` | `base_price × 0.5` | Ghế ưu tiên lối đi, giảm 50% |

---

## 🛠️ Ghi Chú Triển Khai & Cấu Hình

### Biến Môi Trường (File `.env`)

```env
# API Gateway
GATEWAY_PORT=8080
JWT_SECRET=your_jwt_secret_key

# Movie Service
MOVIE_SERVICE_PORT=4002
MOVIE_DB_NAME=XemPhim_Movie
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASS=YourStrong@Password123
DB_ENCRYPT=false
DB_TRUST_SERVER_CERT=true
```

### Lệnh Khởi Chạy
```bash
# Khởi chạy Movie Service độc lập
npm run dev --prefix services/movie-service

# Khởi chạy API Gateway
npm run dev --prefix gateway

# Khởi chạy Frontend
npm start --prefix frontend
```

---

*Cập nhật: Tháng 8/2026 | Phiên bản: 1.0.0 | Tác giả: Phạm Tuấn Hưng*
