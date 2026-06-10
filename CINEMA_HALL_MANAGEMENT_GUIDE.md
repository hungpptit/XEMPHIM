# 🎬 HƯỚNG DẪN QUẢN LÝ PHÒNG CHIẾU - Cinema Hall Management System

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Cấu Trúc Dữ Liệu](#cấu-trúc-dữ-liệu)
3. [Backend API](#backend-api)
4. [Frontend Components](#frontend-components)
5. [Hướng Dẫn Sử Dụng](#hướng-dẫn-sử-dụng)
6. [Ghi Chú Phát Triển](#ghi-chú-phát-triển)

---

## 🎯 Tổng Quan

Hệ thống **Quản Lý Phòng Chiếu** cung cấp các tính năng quản lý hoàn chỉnh cho rạp chiếu phim:

### Tính Năng Chính
✅ **Quản Lý Rạp**: Tạo, cập nhật, xóa thông tin rạp chiếu  
✅ **Quản Lý Phòng**: CRUD phòng chiếu, cấu hình số hàng/ghế  
✅ **Quản Lý Ghế**: Phân loại ghế (Standard, VIP, Couple, Premium, Disabled)  
✅ **Sơ Đồ Ghế**: Hiển thị visual, cập nhật loại ghế, điều chỉnh giá  
✅ **Quản Lý Giá**: Điều chỉnh giá cho từng loại ghế

### Kiến Trúc
```
┌─────────────────────────────────────────┐
│         Frontend (React)                 │
│  - Components: Form, SeatLayout         │
│  - Pages: CinemaManagement, HallList    │
│  - Services: adminService              │
└────────────────┬────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────┐
│    API Gateway (Port 4000)              │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│   Movie Service (Port 4002)             │
│  - Controllers: cinemaController...     │
│  - Routes: cinemaRoutes.js              │
│  - Services: cinemaService, hallService │
│  - Models: Cinema, CinemaHall, Seat     │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│    Database (MSSQL)                     │
│  - cinemas, cinema_halls, seats         │
└─────────────────────────────────────────┘
```

---

## 📊 Cấu Trúc Dữ Liệu

### 1. Cinema (Rạp Chiếu)

**Bảng**: `cinemas`

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INTEGER PK | ID rạp |
| name | VARCHAR(255) | Tên rạp (VD: CGV Vincom) |
| location | VARCHAR(500) | Địa chỉ rạp |
| hotline | VARCHAR(20) | Số điện thoại |
| email | VARCHAR(255) | Email liên hệ |
| address | TEXT | Mô tả chi tiết |
| is_active | BOOLEAN | Hoạt động hay không |
| created_at | DATETIME | Thời gian tạo |
| updated_at | DATETIME | Thời gian cập nhật |

### 2. CinemaHall (Phòng Chiếu)

**Bảng**: `cinema_halls`

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INTEGER PK | ID phòng |
| cinema_id | INTEGER FK | Tham chiếu đến Cinema |
| name | VARCHAR(255) | Tên phòng (VD: Phòng A, Phòng IMAX) |
| rows | INTEGER | Số hàng ghế (1-30) |
| seats_per_row | INTEGER | Ghế mỗi hàng (1-50) |
| total_seats | INTEGER | Tổng ghế = rows × seats_per_row |
| hall_type | ENUM | Standard/IMAX/3D/Premium |
| description | TEXT | Mô tả phòng |
| is_active | BOOLEAN | Hoạt động |
| created_at | DATETIME | Thời gian tạo |
| updated_at | DATETIME | Thời gian cập nhật |

### 3. Seat (Ghế)

**Bảng**: `seats`

| Cột | Kiểu | Mô Tả |
|-----|------|-------|
| id | INTEGER PK | ID ghế |
| hall_id | INTEGER FK | Tham chiếu đến CinemaHall |
| row_name | CHAR(1) | Tên hàng (A, B, C, ...) |
| seat_number | INTEGER | Số ghế (1, 2, 3, ...) |
| seat_type | ENUM | Standard/VIP/Couple/Disabled/Premium |
| price_modifier | DECIMAL | Điều chỉnh giá (VD: +50000) |
| is_active | BOOLEAN | Hoạt động |
| created_at | DATETIME | Thời gian tạo |
| updated_at | DATETIME | Thời gian cập nhật |

**Unique Index**: (hall_id, row_name, seat_number)

---

## 🔌 Backend API

### Base URL
```
http://localhost:4000/api/admin
```

### Phân Loại Endpoints

#### A. Cinema Management

**1. Tạo Rạp Chiếu**
```http
POST /cinemas
Content-Type: application/json

{
  "name": "CGV Vincom Đồng Khởi",
  "location": "TP. Hồ Chí Minh",
  "hotline": "028 6291 2000",
  "email": "hcm@cgv.com",
  "address": "72 Lê Thánh Tôn, Quận 1, TP.HCM"
}

Response: 201 Created
{
  "success": true,
  "message": "Rạp chiếu được tạo thành công",
  "data": { "id": 1, "name": "CGV Vincom Đồng Khởi", ... }
}
```

**2. Lấy Tất Cả Rạp**
```http
GET /cinemas

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": 1, "name": "CGV Vincom", ... },
    { "id": 2, "name": "BHD Star", ... }
  ],
  "total": 2
}
```

**3. Lấy Rạp Theo ID**
```http
GET /cinemas/:id

Response: 200 OK
{
  "success": true,
  "data": { "id": 1, "name": "CGV Vincom", ... }
}
```

**4. Cập Nhật Rạp**
```http
PUT /cinemas/:id
Content-Type: application/json

{
  "name": "CGV Vincom Landmark 81",
  "hotline": "028 6291 2001"
}

Response: 200 OK
{
  "success": true,
  "message": "Rạp chiếu được cập nhật thành công",
  "data": { "id": 1, "name": "CGV Vincom Landmark 81", ... }
}
```

**5. Xóa Rạp**
```http
DELETE /cinemas/:id

Response: 200 OK
{
  "success": true,
  "message": "Rạp chiếu đã xoá thành công"
}
```

**6. Lấy Thống Kê**
```http
GET /cinemas/stats/overview

Response: 200 OK
{
  "success": true,
  "data": {
    "totalCinemas": 5,
    "activeCinemas": 4,
    "totalHalls": 20,
    "totalSeats": 3500
  }
}
```

#### B. Hall Management

**1. Tạo Phòng Chiếu**
```http
POST /halls
Content-Type: application/json

{
  "cinemaId": 1,
  "name": "Phòng IMAX",
  "rows": 12,
  "seatsPerRow": 16,
  "hallType": "IMAX",
  "description": "Phòng chiếu công nghệ IMAX hàng đầu"
}

Response: 201 Created
{
  "success": true,
  "message": "Phòng chiếu được tạo thành công",
  "data": {
    "id": 5,
    "cinema_id": 1,
    "name": "Phòng IMAX",
    "rows": 12,
    "seats_per_row": 16,
    "total_seats": 192,
    ...
  }
}
```

**2. Lấy Phòng Của Rạp**
```http
GET /cinemas/:cinemaId/halls

Response: 200 OK
{
  "success": true,
  "data": [
    { "id": 5, "name": "Phòng IMAX", "total_seats": 192, ... },
    { "id": 6, "name": "Phòng 3D", "total_seats": 150, ... }
  ],
  "total": 2
}
```

**3. Lấy Chi Tiết Phòng (Với Sơ Đồ Ghế)**
```http
GET /halls/:hallId/detail

Response: 200 OK
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Phòng IMAX",
    "rows": 12,
    "seats_per_row": 16,
    "layout": {
      "A": [
        {"id": 1, "number": 1, "type": "Standard", "modifier": 0},
        {"id": 2, "number": 2, "type": "VIP", "modifier": 50000},
        ...
      ],
      "B": [...],
      ...
    },
    "seatLayout": {...}
  }
}
```

**4. Cập Nhật Phòng**
```http
PUT /halls/:hallId
Content-Type: application/json

{
  "name": "Phòng IMAX Premium",
  "hall_type": "Premium"
}

Response: 200 OK
{
  "success": true,
  "message": "Phòng chiếu được cập nhật thành công",
  "data": { ... }
}
```

**5. Xóa Phòng**
```http
DELETE /halls/:hallId

Response: 200 OK
{
  "success": true,
  "message": "Phòng chiếu đã xoá thành công"
}
```

#### C. Seat Management

**1. Lấy Sơ Đồ Ghế**
```http
GET /halls/:hallId/seats/layout

Response: 200 OK
{
  "success": true,
  "data": {
    "hallId": 5,
    "name": "Phòng IMAX",
    "rows": 12,
    "seatsPerRow": 16,
    "layout": {
      "A": [
        {"id": 1, "number": 1, "type": "Standard", "modifier": 0},
        ...
      ],
      ...
    }
  }
}
```

**2. Cập Nhật Loại Ghế Cho Tất Cả Ghế Trong Phòng**
```http
PUT /halls/:hallId/seats/type
Content-Type: application/json

{
  "seatType": "Premium",
  "priceModifier": 100000
}

Response: 200 OK
{
  "success": true,
  "message": "Đã cập nhật 192 ghế"
}
```

**3. Cập Nhật Ghế Cụ Thể**
```http
PUT /seats/:seatId
Content-Type: application/json

{
  "seat_type": "Couple",
  "price_modifier": 150000
}

Response: 200 OK
{
  "success": true,
  "message": "Ghế được cập nhật thành công",
  "data": { "id": 1, "seat_type": "Couple", ... }
}
```

**4. Xóa Ghế**
```http
DELETE /seats/:seatId

Response: 200 OK
{
  "success": true,
  "message": "Ghế đã xoá thành công"
}
```

---

## 🎨 Frontend Components

### 1. CinemaForm Component

**File**: `/frontend/src/modules/Admin/components/CinemaForm.js`

```jsx
<CinemaForm
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialData={cinema}  // Optional - for editing
  isLoading={false}
/>
```

**Props**:
- `onSubmit(formData)` - Callback khi submit
- `onCancel()` - Callback khi hủy
- `initialData` - Dữ liệu để edit (optional)
- `isLoading` - Trạng thái loading

**Returns**:
```javascript
{
  name: "CGV Vincom",
  location: "TP.HCM",
  hotline: "028 1234 5678",
  email: "info@cgv.com",
  address: "...",
  is_active: true
}
```

### 2. HallForm Component

**File**: `/frontend/src/modules/Admin/components/HallForm.js`

```jsx
<HallForm
  cinemaId={1}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  initialData={hall}
  isLoading={false}
/>
```

**Props**:
- `cinemaId` - ID rạp (bắt buộc)
- `onSubmit(formData)` - Callback khi submit
- `onCancel()` - Callback khi hủy
- `initialData` - Dữ liệu để edit (optional)
- `isLoading` - Trạng thái loading

### 3. SeatLayout Component

**File**: `/frontend/src/modules/Admin/components/SeatLayout.js`

```jsx
<SeatLayout
  hallData={hallDetail}  // Từ API /halls/:id/detail
  onSeatTypeChange={handleUpdateSeats}
  isLoading={false}
/>
```

**Props**:
- `hallData` - Data từ getHallDetail
- `onSeatTypeChange(data)` - Callback khi update ghế
- `isLoading` - Trạng thái loading

**onSeatTypeChange Data**:
```javascript
{
  seatType: "VIP",
  priceModifier: 50000
}
```

### 4. CinemaManagement Page

**File**: `/frontend/src/modules/Admin/pages/CinemaManagement/CinemaList.js`

- Hiển thị danh sách rạp
- Tạo rạp mới
- Chỉnh sửa rạp
- Xóa rạp
- Kinh nghiệm tương tác mượt mà

### 5. HallManagement Page

**File**: `/frontend/src/modules/Admin/pages/HallManagement/HallList.js`

- Sidebar chọn rạp
- Danh sách phòng của rạp
- Sơ đồ ghế interative
- Quản lý loại ghế

---

## 📖 Hướng Dẫn Sử Dụng

### A. Quản Lý Rạp Chiếu

#### Tạo Rạp Mới
1. Vào tab **"Quản Lý Rạp Chiếu"** trong Admin Panel
2. Click nút **"Thêm Rạp Mới"**
3. Điền thông tin:
   - **Tên Rạp**: Tên của rạp (VD: CGV Vincom Đồng Khởi)
   - **Địa Chỉ**: Tỉnh/thành phố
   - **Hotline**: Số điện thoại
   - **Email**: Email liên hệ
   - **Chi tiết**: Mô tả thêm
4. Click **"Tạo Mới"**

#### Chỉnh Sửa Rạp
1. Click icon **✏️ Edit** trên thẻ rạp
2. Cập nhật thông tin
3. Click **"Cập Nhật"**

#### Xóa Rạp
1. Click icon **🗑️ Delete** trên thẻ rạp
2. Xác nhận xóa
3. **Lưu ý**: Chỉ xóa được rạp không có phòng chiếu

### B. Quản Lý Phòng Chiếu

#### Tạo Phòng
1. Vào tab **"Quản Lý Phòng Chiếu"**
2. **Chọn rạp** từ sidebar
3. Click **"Thêm Phòng"** trong phần danh sách phòng
4. Điền thông tin:
   - **Tên Phòng**: VD: Phòng A, Phòng IMAX
   - **Số Hàng**: 10-30 hàng
   - **Ghế Mỗi Hàng**: 15-50 ghế
   - **Loại Phòng**: Standard/IMAX/3D/Premium
   - **Mô Tả**: (optional)
5. Tổng ghế sẽ tự tính = Số Hàng × Ghế Mỗi Hàng
6. Click **"Tạo Mới"**

**Hệ thống sẽ tự động tạo ghế**:
- Hàng: A, B, C, ... (tương ứng số hàng)
- Ghế: 1, 2, 3, ... (tương ứng số ghế/hàng)
- Loại: Tất cả ghế mặc định là "Standard"

#### Quản Lý Ghế Trong Phòng
1. Click vào phòng trong danh sách
2. Sơ đồ ghế sẽ hiển thị
3. **Cập nhật loại ghế**:
   - Chọn **Loại Ghế**: Standard, VIP, Couple, Disabled, Premium
   - Nhập **Điều Chỉnh Giá**: VD: 50000 (cộng thêm 50.000đ)
   - Click **"Cập Nhật Tất Cả Ghế"**

### C. Loại Ghế & Giá

| Loại | Mô Tả | Giá Modifier Gợi Ý |
|------|-------|-----|
| Standard | Ghế thường | 0đ |
| VIP | Ghế cao cấp | +50.000đ |
| Couple | Ghế đôi rộng | +100.000đ |
| Premium | Ghế siêu cao cấp | +150.000đ |
| Disabled | Ghế người khuyết tật | 0đ |

---

## 🛠️ Ghi Chú Phát Triển

### Cấu Trúc File Dự Án

```
services/movie-service/
├── models/
│   ├── cinema.js                 # Cinema model
│   ├── cinema_hall_v2.js         # CinemaHall model
│   ├── seat_v2.js                # Seat model
│   └── index.js
├── services/
│   ├── cinemaService.js          # Cinema business logic
│   ├── hallService.js            # Hall business logic
│   └── seatService.js            # Seat business logic
├── controllers/
│   ├── cinemaController.js       # Cinema API handlers
│   ├── hallController.js         # Hall API handlers
│   └── seatController.js         # Seat API handlers
├── routes/
│   ├── cinemaRoutes.js           # All cinema/hall/seat routes
│   └── adminRoutes.js            # Import cinemaRoutes
└── index.js

frontend/src/modules/Admin/
├── components/
│   ├── CinemaForm.js             # Cinema form component
│   ├── CinemaForm.module.css
│   ├── HallForm.js               # Hall form component
│   ├── SeatLayout.js             # Seat layout visualization
│   └── SeatLayout.module.css
├── pages/
│   ├── CinemaManagement/
│   │   ├── CinemaList.js         # Cinema management page
│   │   └── CinemaList.module.css
│   └── HallManagement/
│       ├── HallList.js           # Hall management page
│       └── HallList.module.css
├── services/
│   └── adminService.js           # API calls
└── index.js
```

### Installation Steps

1. **Backend Setup**
```bash
cd services/movie-service
npm install
```

2. **Database Migration** (Manual)
```sql
-- Create tables if not exist
CREATE TABLE cinemas (...)
CREATE TABLE cinema_halls (...)
CREATE TABLE seats (...)
```

3. **Start Movie Service**
```bash
npm start  # Runs on port 4002
```

4. **Frontend Setup**
```bash
cd frontend
npm install
npm start  # Runs on port 3000
```

### Environment Variables

**Backend** (.env):
```
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASS=YourPassword
DB_NAME=MovieDB
MOVIE_SERVICE_PORT=4002
```

**Frontend** (.env):
```
REACT_APP_API_URL=http://localhost:4000
```

### Testing API with Curl

```bash
# Create Cinema
curl -X POST http://localhost:4000/api/admin/cinemas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "CGV Vincom",
    "location": "TP.HCM",
    "hotline": "028 1234 5678"
  }'

# Get Cinema Stats
curl http://localhost:4000/api/admin/cinemas/stats/overview \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get Seat Layout
curl http://localhost:4000/api/admin/halls/5/seats/layout \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Error Handling

Tất cả endpoints trả về format:
```javascript
{
  "success": true/false,
  "message": "...",
  "data": {...},  // nếu success=true
  "error": "..."  // nếu success=false
}
```

### Validation Rules

**Cinema**:
- name: Bắt buộc, 3-255 ký tự
- location: Bắt buộc
- email: Hợp lệ hoặc rỗng

**Hall**:
- name: Bắt buộc
- rows: 1-30
- seats_per_row: 1-50

**Seat**:
- row_name: A-Z
- seat_number: 1+
- seat_type: Standard/VIP/Couple/Disabled/Premium
- price_modifier: Decimal

### Performance Notes

- Ghế được tạo hàng loạt khi tạo phòng (bulk insert)
- Sơ đồ ghế được generate từ DB data
- Caching có thể thêm vào cho danh sách rạp/phòng
- Pagination nên add cho danh sách lớn

### Future Enhancements

- [ ] Import/Export danh sách rạp
- [ ] Quản lý promotion theo phòng/ghế
- [ ] Report doanh thu theo phòng
- [ ] Real-time seat availability
- [ ] Batch seat operations
- [ ] Hall amenities management
- [ ] Maintenance scheduling

---

## 📞 Support

Mọi thắc mắc hoặc báo lỗi, vui lòng liên hệ development team.

**Last Updated**: 2024
**Version**: 1.0.0
