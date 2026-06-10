# 🎬 Cinema Management API Documentation

**Tài liệu Chi Tiết - Hệ Thống Quản Lý Rạp Chiếu**

Phiên bản: 1.0  
Cập nhật: 2026-06-04  
Base URL: `http://localhost:4000/admin`

---

## 📋 Table of Contents

1. [Giới Thiệu](#giới-thiệu)
2. [Xác Thực & Phép Quản Trị](#xác-thực--phép-quản-trị)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
   - [Cinema (Rạp Chiếu)](#cinema-rạp-chiếu)
   - [Hall (Phòng Chiếu)](#hall-phòng-chiếu)
   - [Seat (Ghế Ngồi)](#seat-ghế-ngồi)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)

---

## 🎯 Giới Thiệu

### Tính Năng Chính

Hệ thống quản lý rạp chiếu cung cấp các API để:

- ✅ **Quản Lý Rạp**: Tạo, cập nhật, xóa, liệt kê thông tin rạp chiếu
- ✅ **Quản Lý Phòng**: CRUD phòng chiếu, quản lý sức chứa
- ✅ **Quản Lý Ghế**: Phân loại ghế, điều chỉnh giá, cấu hình sơ đồ ghế
- ✅ **Thống Kê**: Xem thống kê tổng quan rạp chiếu
- ✅ **Quản Lý Loại Ghế**: Standard, VIP, Couple, Premium, Disabled

### Kiến Trúc Hệ Thống

```
┌────────────────────────────────┐
│   Frontend Admin Dashboard     │
│   (React - Admin Module)       │
└──────────────┬─────────────────┘
               │ HTTP REST
┌──────────────▼─────────────────┐
│   API Gateway Layer            │
│   Port: 4000                   │
│   Route: /admin                │
└──────────────┬─────────────────┘
               │ Route forwarding
┌──────────────▼─────────────────┐
│  Movie Service                 │
│  Port: 4002                    │
│  Controllers:                  │
│  - cinemaController.js         │
│  - hallController.js           │
│  - seatController.js           │
└──────────────┬─────────────────┘
               │ Database queries
┌──────────────▼─────────────────┐
│   MSSQL Database               │
│   - cinemas                    │
│   - cinema_halls               │
│   - seats                      │
└────────────────────────────────┘
```

---

## 🔐 Xác Thực & Phép Quản Trị

### Middleware Yêu Cầu

Tất cả các endpoint đều yêu cầu:

```javascript
// Middleware: adminAuth
// Location: services/movie-service/middleware/adminAuth.js

// Kiểm tra:
// 1. JWT Token từ header: Authorization: Bearer {token}
// 2. Token phải chứa role: 'admin'
// 3. Token phải còn hiệu lực
```

### Request Header

```
GET /admin/cinemas HTTP/1.1
Host: localhost:4000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Xử Lý Lỗi Xác Thực

| Status | Message | Nguyên Nhân |
|--------|---------|-----------|
| 401 | Unauthorized | Token không hợp lệ hoặc hết hạn |
| 403 | Forbidden | User không có quyền admin |

---

## 📊 Database Schema

### Table: `cinemas` (Rạp Chiếu)

```sql
CREATE TABLE cinemas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | ID duy nhất (Auto increment) |
| `name` | VARCHAR(255) | Tên rạp chiếu |
| `address` | VARCHAR(500) | Địa chỉ rạp |
| `city` | VARCHAR(255) | Thành phố |
| `status` | VARCHAR(50) | Trạng thái (active, inactive) |
| `created_at` | DATETIME | Ngày tạo |
| `updated_at` | DATETIME | Ngày cập nhật |

### Table: `cinema_halls` (Phòng Chiếu)

```sql
CREATE TABLE cinema_halls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  total_seats INT NOT NULL,
  cinema_id INT NOT NULL,
  FOREIGN KEY (cinema_id) REFERENCES cinemas(id)
);
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | ID duy nhất |
| `name` | VARCHAR(255) | Tên phòng (A1, A2, VIP, etc.) |
| `total_seats` | INT | Tổng số ghế |
| `cinema_id` | INT | ID rạp chiếu (Foreign Key) |

### Table: `seats` (Ghế Ngồi)

```sql
CREATE TABLE seats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hall_id INT NOT NULL,
  row_name CHAR(1) NOT NULL,
  seat_number INT NOT NULL,
  seat_type VARCHAR(255) NOT NULL,
  price_modifier DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (hall_id) REFERENCES cinema_halls(id),
  UNIQUE KEY unique_seat (hall_id, row_name, seat_number)
);
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | ID duy nhất |
| `hall_id` | INT | ID phòng (Foreign Key) |
| `row_name` | CHAR(1) | Tên hàng (A, B, C, ...) |
| `seat_number` | INT | Số ghế trong hàng |
| `seat_type` | VARCHAR(255) | Loại ghế (Standard, VIP, Couple, Premium, Disabled) |
| `price_modifier` | DECIMAL(10, 2) | Hệ số giá (1.0 = giá cơ bản, 1.5 = VIP, 2.0 = Premium) |
| `is_active` | BOOLEAN | Ghế có hoạt động hay không |

---

## 🔌 API Endpoints

### Cinema (Rạp Chiếu)

#### 1️⃣ Tạo Rạp Mới

```http
POST /admin/cinemas
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "CGV Hà Nội Skylake",
  "address": "Tầng 3-4, Tòa nhà Skylake, Phạm Hùng, HN",
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
    "name": "CGV Hà Nội Skylake",
    "address": "Tầng 3-4, Tòa nhà Skylake, Phạm Hùng, HN",
    "city": "Hà Nội",
    "status": "active",
    "created_at": "2026-06-04T10:00:00Z",
    "updated_at": "2026-06-04T10:00:00Z"
  }
}
```

#### 2️⃣ Lấy Danh Sách Rạp

```http
GET /admin/cinemas
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "CGV Hà Nội Skylake",
      "address": "Tầng 3-4, Tòa nhà Skylake, Phạm Hùng, HN",
      "city": "Hà Nội",
      "status": "active",
      "created_at": "2026-06-04T10:00:00Z",
      "updated_at": "2026-06-04T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Lotte Cinema Tràng Tiền",
      "address": "50 Tràng Tiền, HN",
      "city": "Hà Nội",
      "status": "active",
      "created_at": "2026-06-04T10:05:00Z",
      "updated_at": "2026-06-04T10:05:00Z"
    }
  ],
  "total": 2
}
```

#### 3️⃣ Lấy Thông Tin Rạp Theo ID

```http
GET /admin/cinemas/{id}
Authorization: Bearer {token}
```

**Ví dụ:**
```http
GET /admin/cinemas/1
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "CGV Hà Nội Skylake",
    "address": "Tầng 3-4, Tòa nhà Skylake, Phạm Hùng, HN",
    "city": "Hà Nội",
    "status": "active",
    "created_at": "2026-06-04T10:00:00Z",
    "updated_at": "2026-06-04T10:00:00Z"
  }
}
```

#### 4️⃣ Cập Nhật Rạp

```http
PUT /admin/cinemas/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "CGV Hà Nội Skylake - Updated",
  "address": "Tầng 5-6, Tòa nhà Skylake",
  "city": "Hà Nội",
  "status": "inactive"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Rạp chiếu được cập nhật thành công",
  "data": {
    "id": 1,
    "name": "CGV Hà Nội Skylake - Updated",
    "address": "Tầng 5-6, Tòa nhà Skylake",
    "city": "Hà Nội",
    "status": "inactive",
    "updated_at": "2026-06-04T11:00:00Z"
  }
}
```

#### 5️⃣ Xóa Rạp

```http
DELETE /admin/cinemas/{id}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Rạp chiếu được xóa thành công"
}
```

#### 6️⃣ Lấy Thống Kê Rạp

```http
GET /admin/cinemas/stats/overview
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_cinemas": 5,
    "active_cinemas": 4,
    "inactive_cinemas": 1,
    "total_halls": 12,
    "total_seats": 4500
  }
}
```

---

### Hall (Phòng Chiếu)

#### 1️⃣ Tạo Phòng Chiếu

```http
POST /admin/halls
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Phòng A (2D)",
  "rows": 12,
  "seatsPerRow": 20,
  "hallType": "2D",
  "description": "Phòng chiếu 2D, 240 ghế",
  "cinemaId": 1
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Phòng chiếu được tạo thành công",
  "data": {
    "id": 1,
    "name": "Phòng A (2D)",
    "total_seats": 240,
    "cinema_id": 1,
    "hallType": "2D",
    "rows": 12,
    "seatsPerRow": 20
  }
}
```

#### 2️⃣ Lấy Danh Sách Tất Cả Phòng

```http
GET /admin/halls
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phòng A (2D)",
      "total_seats": 240,
      "cinema_id": 1,
      "cinemaName": "CGV Hà Nội Skylake"
    },
    {
      "id": 2,
      "name": "Phòng B (2D)",
      "total_seats": 240,
      "cinema_id": 1,
      "cinemaName": "CGV Hà Nội Skylake"
    }
  ],
  "total": 2
}
```

#### 3️⃣ Lấy Phòng Theo ID

```http
GET /admin/halls/{hallId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Phòng A (2D)",
    "total_seats": 240,
    "cinema_id": 1,
    "cinemaName": "CGV Hà Nội Skylake",
    "hallType": "2D",
    "rows": 12,
    "seatsPerRow": 20
  }
}
```

#### 4️⃣ Lấy Chi Tiết Phòng (Kèm Danh Sách Ghế)

```http
GET /admin/halls/{hallId}/detail
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hall": {
      "id": 1,
      "name": "Phòng A (2D)",
      "total_seats": 240,
      "cinema_id": 1,
      "cinemaName": "CGV Hà Nội Skylake"
    },
    "seats": [
      {
        "id": 1,
        "row_name": "A",
        "seat_number": 1,
        "seat_type": "Standard",
        "price_modifier": "1.00",
        "is_active": true,
        "seatCode": "A1"
      },
      {
        "id": 2,
        "row_name": "A",
        "seat_number": 2,
        "seat_type": "Standard",
        "price_modifier": "1.00",
        "is_active": true,
        "seatCode": "A2"
      }
    ],
    "layout": {
      "rows": 12,
      "seatsPerRow": 20,
      "seatTypes": ["Standard", "VIP", "Couple"]
    }
  }
}
```

#### 5️⃣ Lấy Phòng Của Rạp

```http
GET /admin/cinemas/{cinemaId}/halls
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Phòng A (2D)",
      "total_seats": 240,
      "cinema_id": 1
    },
    {
      "id": 2,
      "name": "Phòng B (3D)",
      "total_seats": 240,
      "cinema_id": 1
    }
  ],
  "total": 2
}
```

#### 6️⃣ Cập Nhật Phòng

```http
PUT /admin/halls/{hallId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Phòng A (2D) - Premium",
  "description": "Phòng 2D hàng đầu"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Phòng chiếu được cập nhật thành công",
  "data": {
    "id": 1,
    "name": "Phòng A (2D) - Premium",
    "total_seats": 240,
    "cinema_id": 1
  }
}
```

#### 7️⃣ Xóa Phòng

```http
DELETE /admin/halls/{hallId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Phòng chiếu được xóa thành công"
}
```

---

### Seat (Ghế Ngồi)

#### 1️⃣ Tạo Ghế (Tạo Hàng Loạt)

```http
POST /admin/seats
Content-Type: application/json
Authorization: Bearer {token}

{
  "hallId": 1,
  "rows": 12,
  "seatsPerRow": 20,
  "defaultSeatType": "Standard",
  "defaultPriceModifier": 1.0
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Tạo ghế thành công",
  "data": {
    "created": 240,
    "hallId": 1,
    "totalSeats": 240
  }
}
```

#### 2️⃣ Lấy Danh Sách Ghế Theo Phòng

```http
GET /admin/halls/{hallId}/seats
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "hall_id": 1,
      "row_name": "A",
      "seat_number": 1,
      "seat_type": "Standard",
      "price_modifier": "1.00",
      "is_active": true,
      "seatCode": "A1"
    },
    {
      "id": 2,
      "hall_id": 1,
      "row_name": "A",
      "seat_number": 2,
      "seat_type": "Standard",
      "price_modifier": "1.00",
      "is_active": true,
      "seatCode": "A2"
    }
  ],
  "total": 240
}
```

#### 3️⃣ Lấy Sơ Đồ Ghế

```http
GET /admin/halls/{hallId}/seats/layout
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "hallId": 1,
    "hallName": "Phòng A",
    "layoutGrid": {
      "A": [
        {"seatId": 1, "seatCode": "A1", "seatType": "Standard", "priceModifier": 1.0, "isActive": true},
        {"seatId": 2, "seatCode": "A2", "seatType": "Standard", "priceModifier": 1.0, "isActive": true},
        {"seatId": 3, "seatCode": "A3", "seatType": "VIP", "priceModifier": 1.5, "isActive": true}
      ],
      "B": [
        {"seatId": 21, "seatCode": "B1", "seatType": "Standard", "priceModifier": 1.0, "isActive": true}
      ]
    },
    "seatTypeStats": {
      "Standard": 200,
      "VIP": 30,
      "Couple": 10,
      "Premium": 0,
      "Disabled": 0
    },
    "layout": {
      "rows": 12,
      "seatsPerRow": 20
    }
  }
}
```

#### 4️⃣ Cập Nhật Ghế

```http
PUT /admin/seats/{seatId}
Content-Type: application/json
Authorization: Bearer {token}

{
  "seat_type": "VIP",
  "price_modifier": 1.5,
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cập nhật ghế thành công",
  "data": {
    "id": 1,
    "row_name": "A",
    "seat_number": 1,
    "seat_type": "VIP",
    "price_modifier": "1.50",
    "is_active": true,
    "seatCode": "A1"
  }
}
```

#### 5️⃣ Cập Nhật Loại Ghế Hàng Loạt

```http
PUT /admin/halls/{hallId}/seats/type
Content-Type: application/json
Authorization: Bearer {token}

{
  "seats": [
    {
      "seatId": 5,
      "seatType": "Couple",
      "priceModifier": 2.0
    },
    {
      "seatId": 6,
      "seatType": "Couple",
      "priceModifier": 2.0
    },
    {
      "seatId": 25,
      "seatType": "Disabled",
      "priceModifier": 0.5
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cập nhật loại ghế thành công",
  "data": {
    "updated": 3,
    "hallId": 1,
    "summary": {
      "Couple": 2,
      "Disabled": 1
    }
  }
}
```

#### 6️⃣ Xóa Ghế

```http
DELETE /admin/seats/{seatId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Xóa ghế thành công"
}
```

---

## ⚠️ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Mô tả lỗi chi tiết"
}
```

### Common Error Codes

| Status | Error | Nguyên Nhân | Giải Pháp |
|--------|-------|-----------|----------|
| 400 | Validation Error | Dữ liệu request không hợp lệ | Kiểm tra input parameters |
| 401 | Unauthorized | Token không hợp lệ | Cập nhật token |
| 403 | Forbidden | Không có quyền admin | Kiểm tra role user |
| 404 | Not Found | Resource không tồn tại | Kiểm tra ID resource |
| 500 | Internal Server Error | Lỗi server | Kiểm tra logs |

### Ví Dụ Các Lỗi

**Cinema không tồn tại:**
```json
{
  "success": false,
  "error": "Rạp chiếu với ID 999 không tồn tại"
}
```

**Hall không tồn tại:**
```json
{
  "success": false,
  "error": "Phòng chiếu với ID 999 không tồn tại"
}
```

**Dữ liệu không hợp lệ:**
```json
{
  "success": false,
  "error": "Trường 'name' không được để trống"
}
```

---

## 💻 Code Examples

### JavaScript / Node.js Axios

#### Lấy Token Admin

```javascript
const loginResponse = await axios.post('http://localhost:4000/auth/login', {
  email: 'admin@cinema.com',
  password: 'password123'
});

const token = loginResponse.data.token;
```

#### Tạo Rạp Mới

```javascript
const axios = require('axios');

const createCinema = async () => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.post(
      'http://localhost:4000/admin/cinemas',
      {
        name: 'CGV Hà Nội Skylake',
        address: 'Tầng 3-4, Tòa nhà Skylake',
        city: 'Hà Nội',
        status: 'active'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Cinema created:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating cinema:', error.response.data);
  }
};

createCinema();
```

#### Lấy Danh Sách Rạp

```javascript
const getCinemas = async () => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.get(
      'http://localhost:4000/admin/cinemas',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Cinemas:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching cinemas:', error.response.data);
  }
};

getCinemas();
```

#### Tạo Phòng Chiếu

```javascript
const createHall = async (cinemaId) => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.post(
      'http://localhost:4000/admin/halls',
      {
        name: 'Phòng A (2D)',
        rows: 12,
        seatsPerRow: 20,
        hallType: '2D',
        description: 'Phòng 2D 240 ghế',
        cinemaId: cinemaId
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Hall created:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating hall:', error.response.data);
  }
};

createHall(1);
```

#### Tạo Ghế Cho Phòng

```javascript
const createSeats = async (hallId) => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.post(
      'http://localhost:4000/admin/seats',
      {
        hallId: hallId,
        rows: 12,
        seatsPerRow: 20,
        defaultSeatType: 'Standard',
        defaultPriceModifier: 1.0
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Seats created:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('Error creating seats:', error.response.data);
  }
};

createSeats(1);
```

#### Cập Nhật Loại Ghế (Bulk)

```javascript
const updateSeatTypes = async (hallId) => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.put(
      `http://localhost:4000/admin/halls/${hallId}/seats/type`,
      {
        seats: [
          // Hàng A (VIP)
          { seatId: 1, seatType: 'VIP', priceModifier: 1.5 },
          { seatId: 2, seatType: 'VIP', priceModifier: 1.5 },
          { seatId: 3, seatType: 'VIP', priceModifier: 1.5 },
          
          // Ghế Couple (A5-A6)
          { seatId: 5, seatType: 'Couple', priceModifier: 2.0 },
          { seatId: 6, seatType: 'Couple', priceModifier: 2.0 },
          
          // Ghế Disabled (A20)
          { seatId: 20, seatType: 'Disabled', priceModifier: 0.5 }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Seats updated:', response.data);
  } catch (error) {
    console.error('Error updating seats:', error.response.data);
  }
};

updateSeatTypes(1);
```

#### Lấy Sơ Đồ Ghế

```javascript
const getSeatLayout = async (hallId) => {
  const token = 'your_admin_token_here';
  
  try {
    const response = await axios.get(
      `http://localhost:4000/admin/halls/${hallId}/seats/layout`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const layout = response.data.data;
    console.log('Hall:', layout.hallName);
    console.log('Layout Grid:', layout.layoutGrid);
    console.log('Seat Type Stats:', layout.seatTypeStats);
    
    return layout;
  } catch (error) {
    console.error('Error fetching seat layout:', error.response.data);
  }
};

getSeatLayout(1);
```

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CinemaManagement = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    fetchCinemas();
  }, []);

  const fetchCinemas = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        'http://localhost:4000/admin/cinemas',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      setCinemas(response.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCinema = async (cinemaData) => {
    try {
      const response = await axios.post(
        'http://localhost:4000/admin/cinemas',
        cinemaData,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setCinemas([...cinemas, response.data.data]);
      alert('Rạp chiếu được tạo thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.response?.data?.error);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div>
      <h1>Quản Lý Rạp Chiếu</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên Rạp</th>
            <th>Địa Chỉ</th>
            <th>Thành Phố</th>
            <th>Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
          {cinemas.map(cinema => (
            <tr key={cinema.id}>
              <td>{cinema.id}</td>
              <td>{cinema.name}</td>
              <td>{cinema.address}</td>
              <td>{cinema.city}</td>
              <td>{cinema.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CinemaManagement;
```

---

## 📚 Tài Liệu Tham Khảo

- Backend: `services/movie-service/`
- Controllers: `services/movie-service/controllers/`
- Models: `services/movie-service/models/`
- Routes: `services/movie-service/routes/`
- Frontend: `frontend/src/modules/Admin/`

---

## 🤝 Support & Contact

Nếu có câu hỏi hoặc báo cáo lỗi, vui lòng liên hệ team development.

**Phiên bản API:** 1.0  
**Cập nhật lần cuối:** 2026-06-04
