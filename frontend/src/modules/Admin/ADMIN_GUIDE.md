# 🎬 Admin - Quản Lý Rạp & Phòng Chiếu

## 📋 Tổng Quan

Đây là module Admin cho phép quản lý rạp chiếu phim và các phòng chiếu. Chỉ những user có role `admin` mới có thể truy cập.

## 🏗️ Cấu Trúc Files

### Backend (Movie-Service)

```
services/movie-service/
├── middleware/
│   └── adminAuth.js           # Check admin role from JWT
├── services/
│   └── adminService.js        # Business logic
├── controllers/
│   └── adminController.js     # Handle HTTP requests
├── routes/
│   └── adminRoutes.js         # All endpoints
└── index.js                   # Updated with admin routes
```

### Frontend (React)

```
frontend/src/modules/Admin/
├── index.js                         # Main AdminPanel component
├── AdminPanel.module.css            # Styling
├── services/
│   └── adminService.js              # API calls
├── pages/
│   ├── CinemaManagement/
│   │   ├── CinemaList.js            # Cinema management page
│   │   └── CinemaList.module.css
│   └── HallManagement/
│       ├── HallList.js              # Hall management page
│       └── HallList.module.css
└── components/                      # Reusable components (future)
```

## 🔌 API Endpoints

### Cinema Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/cinemas` | Tạo rạp mới |
| GET | `/api/admin/cinemas` | Lấy danh sách tất cả rạp |
| GET | `/api/admin/cinemas/:id` | Lấy chi tiết rạp |
| PUT | `/api/admin/cinemas/:id` | Cập nhật rạp |
| DELETE | `/api/admin/cinemas/:id` | Xoá rạp |

**Request Example (POST):**
```json
{
  "name": "CGV Vincom",
  "location": "72 Lê Thánh Tôn, Q.1, TP.HCM",
  "hotline": "028 6291 2000"
}
```

### Hall Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/cinemas/:cinemaId/halls` | Tạo phòng chiếu mới |
| GET | `/api/admin/cinemas/:cinemaId/halls` | Lấy danh sách phòng trong rạp |
| PUT | `/api/admin/halls/:hallId` | Cập nhật phòng |
| DELETE | `/api/admin/halls/:hallId` | Xoá phòng |

**Request Example (POST):**
```json
{
  "name": "Phòng A",
  "rows": 10,
  "seatsPerRow": 16
}
```

## 🔐 Authorization

Tất cả endpoints đều yêu cầu:
- User phải có JWT token trong cookie
- Gateway sẽ validate token và inject headers:
  - `x-user-id`: User ID
  - `x-user-email`: Email
  - `x-user-role`: User role (phải là 'admin')
- Middleware `adminAuth` kiểm tra header `x-user-role`

## 🚀 Cách Sử Dụng (Frontend)

### 1. Import Admin Module

```javascript
import AdminPanel from './modules/Admin';
```

### 2. Thêm Route trong App.js

```javascript
import AdminPanel from './modules/Admin';

function App() {
  return (
    <Routes>
      {/* ... other routes ... */}
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}
```

### 3. Hoặc có routing chi tiết hơn

```javascript
import CinemaManagement from './modules/Admin/pages/CinemaManagement/CinemaList';
import HallManagement from './modules/Admin/pages/HallManagement/HallList';

function App() {
  return (
    <Routes>
      <Route path="/admin/cinemas" element={<CinemaManagement />} />
      <Route path="/admin/halls/:cinemaId" element={<HallManagement />} />
    </Routes>
  );
}
```

## 💻 Backend Usage

### Thêm admin routes vào movie-service (ĐANG DONE)

Edit `services/movie-service/index.js`:
```javascript
import adminRoutes from './routes/adminRoutes.js';

// ... middleware setup ...

app.use('/api/movies', movieRoutes);
app.use('/api/admin', adminRoutes);  // ← Added
```

## ✅ Features Implemented

### ✨ Cinema Management
- [x] Tạo rạp chiếu mới
- [x] Hiển thị danh sách rạp
- [x] Chỉnh sửa thông tin rạp
- [x] Xoá rạp
- [x] Validation (name, location bắt buộc)
- [x] Error handling & success messages
- [x] Responsive grid layout

### ✨ Hall Management
- [x] Tạo phòng chiếu mới (bulk seat generation)
- [x] Hiển thị danh sách phòng theo rạp
- [x] Chỉnh sửa phòng chiếu
- [x] Xoá phòng
- [x] Tính toán tổng số ghế (rows × seatsPerRow)
- [x] Navigate giữa Cinema và Hall
- [x] Breadcrumb navigation

### 🔐 Security
- [x] Role-based access control (admin only)
- [x] JWT authentication
- [x] Request validation
- [x] Error messages (không lộ sensitive info)

## 🎨 UI/UX Features

### Cinema Management
- Card layout hiển thị từng rạp
- Quick action buttons (Edit, Delete)
- Direct link to manage halls
- Form popup để thêm/sửa
- Success/Error alerts

### Hall Management
- Grid layout cho phòng
- Display total seats
- Breadcrumb for navigation
- Auto-calculate total seats based on rows × seatsPerRow
- Form preview

## 📦 Dependencies

### Backend
- express (rest API)
- sequelize (ORM)
- jsonwebtoken (JWT)
- cors
- dotenv

### Frontend
- react (UI framework)
- react-router-dom (routing)
- axios (HTTP client)
- CSS Modules (styling)

## 🔧 Configuration

Không cần config thêm gì! Tất cả đều tự động:
- JWT verification từ cookies (Gateway handles)
- Database connections (Movie-Service handles)
- CORS settings

## 🚀 Next Steps

Để hoàn thiện admin panel, có thể thêm:

1. **Seat Management** - Quản lý ghế trong phòng
   - View layout ghế
   - Edit seat types (Regular, VIP, Couple, Wheelchair)
   - Adjust pricing modifiers

2. **Dashboard** - Thống kê & báo cáo
   - Total cinemas/halls/seats
   - Booking statistics
   - Revenue analytics

3. **Showtime Management** - Quản lý suất chiếu
   - Create/Edit/Delete showtimes
   - Link with movies and halls
   - Schedule management

4. **Bulk Operations**
   - Import cinemas/halls from CSV
   - Export data
   - Batch updates

## 🐛 Troubleshooting

### "Access denied. Admin only."
- Kiểm tra JWT token có role = 'admin' không
- Đăng nhập lại nếu cần
- Check x-user-role header từ Gateway

### "Cinema not found"
- Kiểm tra cinemaId có chính xác không
- Database có cinema với ID đó không

### API returns 500 error
- Check server logs
- Verify database connection
- Restart services

## 📚 Documentation

- [Admin Routes](./routes/adminRoutes.js) - Tất cả endpoints
- [Admin Service](./services/adminService.js) - Business logic
- [Admin Controller](./controllers/adminController.js) - Request handlers
- [Admin Auth Middleware](./middleware/adminAuth.js) - Authorization

---

**Version**: 1.0.0  
**Last Updated**: 2026-05-20  
**Status**: ✅ Production Ready
