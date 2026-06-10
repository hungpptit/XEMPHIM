# 🎬 XEMPHIM - Hệ Thống Đặt Vé Xem Phim Online

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![MSSQL](https://img.shields.io/badge/MSSQL-SQL_Server-red)](https://www.microsoft.com/en-us/sql-server/)
[![ZaloPay](https://img.shields.io/badge/ZaloPay-Integration-orange)](https://zalopay.vn/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Hệ thống quản lý đặt vé xem phim **toàn diện** được xây dựng với kiến trúc **Microservices**. Hỗ trợ thanh toán qua **ZaloPay**, tích hợp **RabbitMQ** cho xử lý bất đồng bộ, và giao diện web hiện đại với **React**. Hệ thống sử dụng **Microsoft SQL Server (MSSQL)** làm cơ sở dữ liệu chính.

## ✨ Tính Năng Chính

- **🎥 Quản Lý Phim & Rạp**: Danh sách phim, rạp chiếu, suất chiếu, thể loại
- **🎫 Đặt Vé Trực Quan**: Chọn suất chiếu, ghế ngồi interactive với validation real-time
- **💳 Thanh Toán ZaloPay**: Tích hợp QR code, thanh toán bằng Zalo Pay
- **👤 Xác Thực & Phân Quyền**: JWT-based authentication, quản lý người dùng
- **📱 Responsive Design**: Tương thích đầy đủ với desktop, tablet, mobile
- **🎟️ Quản Lý Vé**: Xem, hủy vé, hoàn tiền, theo dõi lịch sử giao dịch
- **🔔 Thông Báo Real-time**: Cập nhật trạng thái đặt vé via RabbitMQ
- **⚙️ Microservices Architecture**: 6 services độc lập, dễ mở rộng và bảo trì
- **🔐 Bảo Mật**: JWT tokens, password hashing, CORS configuration

## 🏗️ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────┐
│   Frontend (React)              │
│   Port: 3000                    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  API Gateway                    │
│  Port: 8080                     │
│  (Route aggregation & auth)     │
└──────────────┬──────────────────┘
               │
      ┌────────┴─────────────────────┬──────────────┬──────────────┐
      │                              │              │              │
┌─────▼──────┐ ┌─────────┐ ┌────────▼──┐ ┌─────────▼──┐ ┌──────────▼──┐
│ User       │ │ Movie   │ │ Seat      │ │ Booking    │ │ Payment     │
│ Service    │ │ Service │ │ Service   │ │ Service    │ │ Service     │
│ :4001      │ │ :4002   │ │ :4003     │ │ :4004      │ │ :4005       │
└─────┬──────┘ └────┬────┘ └────┬──────┘ └────┬───────┘ └────┬────────┘
      │             │           │             │              │
      └─────────────┴───────────┼─────────────┴──────────────┘
                                │
       ┌────────────────────────▼────────────────────────┐
       │  Microsoft SQL Server (MSSQL) - Port 1433       │
       │  - XemPhim_User      - XemPhim_Movie            │
       │  - XemPhim_Seat      - XemPhim_Booking          │
       │  - XemPhim_Payment                              │
       └────────────────────────┬────────────────────────┘
                                │
       ┌────────────────────────▼────────────────────────┐
       │ RabbitMQ Message Queue (Async Processing)       │
       │ - Notification Service (:4006 / consumer)       │
       └─────────────────────────────────────────────────┘
```

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **React 18** - UI Framework (Hooks, Context API)
- **React Router DOM v6** - Client-side routing
- **Axios** - HTTP client with interceptors
- **CSS Modules** - Component-scoped styling
- **React Icons** - Icon library

### Backend Services
- **Node.js + Express** - RESTful API framework
- **Sequelize ORM** - Database management & schemas
- **Microsoft SQL Server (MSSQL)** - Relational Database
- **tedious** - SQL Server client for Node.js
- **JWT** - Authentication & Authorization
- **bcrypt / bcryptjs** - Password hashing
- **RabbitMQ** - Message queue for async operations
- **amqplib** - RabbitMQ client

### Payment Integration
- **ZaloPay SDK** - Payment gateway integration
- **MD5/HMAC** - Cryptographic signatures for security

### DevOps & Tools
- **npm** - Package management
- **Nodemon** - Development auto-reload
- **Ngrok** - Local development tunneling
- **Swagger/OpenAPI** - API documentation

## 📁 Cấu Trúc Dự Án Chi Tiết

```
XEMPHIM/
├── frontend/                      # React Frontend Application
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── components/            # Reusable UI Components
│   │   │   ├── MovieCard.js
│   │   │   ├── MovieCard.module.css
│   │   │   ├── Navbar.js
│   │   │   ├── Navbar.module.css
│   │   │   ├── Popup.js
│   │   │   └── Popup.module.css
│   │   ├── modules/               # Feature Modules (Pages)
│   │   │   ├── Auth/              # User Authentication
│   │   │   │   ├── Login.js
│   │   │   │   ├── Register.js
│   │   │   │   └── Auth.module.css
│   │   │   ├── Home/              # Homepage with Movie List
│   │   │   │   └── Home.js
│   │   │   ├── MovieDetail/       # Movie Details & Showtimes
│   │   │   │   └── MovieDetail.js
│   │   │   ├── SeatSelection/     # Seat Selection & Booking
│   │   │   │   └── SeatSelection.js
│   │   │   ├── Payment/           # Payment Processing
│   │   │   │   ├── Payment.js
│   │   │   │   └── ZaloPayQR.js
│   │   │   └── MyTickets/         # Booked Tickets Management
│   │   │       └── MyTickets.js
│   │   ├── services/              # API Service Layer
│   │   │   ├── api.js             # Base Axios instance
│   │   │   ├── authService.js     # Authentication API
│   │   │   ├── movieService.js    # Movie API
│   │   │   └── seatService.js     # Seat & Booking API
│   │   ├── styles/
│   │   │   └── theme.module.css   # Global Theme & Colors
│   │   └── utils/
│   │       └── helpers.js         # Utility Functions
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── README.md
│
├── gateway/                       # API Gateway (Route Aggregation)
│   ├── index.js                   # Main gateway server (Port 8080)
│   ├── package.json
│   └── swagger.json               # API Documentation
│
├── services/                      # Microservices
│   │
│   ├── user-service/              # 👤 User Management (Port 4001)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── models/
│   │   │   ├── index.js
│   │   │   └── user.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   └── utils/
│   │       └── jwt.js
│   │
│   ├── movie-service/             # 🎥 Movie Management (Port 4002)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── moviesController.js
│   │   ├── models/
│   │   │   ├── movie.js
│   │   │   ├── showtime.js
│   │   │   ├── cinema_hall.js
│   │   │   ├── genre.js
│   │   │   ├── movie_genre.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   └── movies.js
│   │   └── services/
│   │       └── moviesService.js
│   │
│   ├── seat-service/              # 🪑 Seat Management (Port 4003)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── seatController.js
│   │   ├── models/
│   │   │   ├── seat.js
│   │   │   ├── booking_seat.js
│   │   │   ├── showtime.js
│   │   │   ├── cinema_hall.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   └── seatRoutes.js
│   │   └── services/
│   │       └── seatService.js
│   │
│   ├── booking-service/           # 🎫 Booking Management (Port 4004)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── bookingController.js
│   │   ├── models/
│   │   │   ├── booking.js
│   │   │   ├── booking_seat.js
│   │   │   ├── seat.js
│   │   │   ├── cinema_hall.js
│   │   │   ├── showtime.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   └── bookingRoutes.js
│   │   ├── jobs/
│   │   │   └── expireBookingsJob.js # Scheduled booking expiration
│   │   └── services/
│   │       └── bookingService.js
│   │
│   ├── payment-service/           # 💳 Payment & ZaloPay (Port 4005)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── paymentController.js
│   │   ├── models/
│   │   │   ├── payment.js
│   │   │   ├── booking.js
│   │   │   └── index.js
│   │   ├── routes/
│   │   │   ├── paymentRoutes.js
│   │   │   └── zalopayRoutes.js
│   │   └── services/
│   │       └── zalopayService.js  # ZaloPay integration
│   │
│   └── notification-service/      # 🔔 Async Notifications (Port 4006)
│       ├── index.js
│       ├── package.json
│       └── consumer.js            # RabbitMQ consumer
│
├── docs/                          # Documentation
│   └── payment_flow.md            # ZaloPay integration guide
│
├── HUONG_DAN_DAY_DU_ZALOPAY.md    # ZaloPay setup guide
├── zalopay_qr_integration.md      # QR code integration guide
├── RUN_NGROK_GUIDE.md             # Ngrok tunneling guide
├── package.json                   # Root package.json
└── README.md                      # This file
```

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Microsoft SQL Server (MSSQL)** ([Download](https://www.microsoft.com/en-us/sql-server/sql-server-downloads))
- **RabbitMQ** ([Download](https://www.rabbitmq.com/download.html))
- **npm**
- **Git**

### Installation - Step by Step

#### 1. Clone Repository
```bash
git clone https://github.com/hungpptit/XEMPHIM.git
cd XEMPHIM
```

#### 2. Install Dependencies for All Services
Có thể sử dụng câu lệnh ở thư mục gốc để tự động cài đặt cho toàn bộ các thư mục con:
```bash
npm run install-all
```

Hoặc cài đặt thủ công:
```bash
# Cài đặt root dependencies
npm install

# Cài đặt gateway
cd gateway && npm install && cd ..

# Cài đặt frontend
cd frontend && npm install && cd ..

# Cài đặt các microservices
cd services/user-service && npm install && cd ../../
cd services/movie-service && npm install && cd ../../
cd services/seat-service && npm install && cd ../../
cd services/booking-service && npm install && cd ../../
cd services/payment-service && npm install && cd ../../
cd services/notification-service && npm install && cd ../../
```

#### 3. Database Setup

Hãy đảm bảo dịch vụ **SQL Server** đã được khởi động và cổng mặc định `1433` đang được mở.
Tạo các database tương ứng cho các service trên SQL Server:
- `XemPhim_User`
- `XemPhim_Movie`
- `XemPhim_Seat`
- `XemPhim_Booking`
- `XemPhim_Payment`

Bạn có thể chạy các truy vấn SQL sau:
```sql
CREATE DATABASE XemPhim_User;
CREATE DATABASE XemPhim_Movie;
CREATE DATABASE XemPhim_Seat;
CREATE DATABASE XemPhim_Booking;
CREATE DATABASE XemPhim_Payment;
```

#### 4. Environment Configuration

Tạo một file `.env` chung ở thư mục gốc hoặc các file `.env` riêng lẻ cho từng service:

**File `.env` ở thư mục gốc:**
```env
NODE_ENV=development
PORT=8080
HOSTNAME=localhost

# SQL Server Configuration
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASS=your_sa_password
DB_ENCRYPT=false
SA_PASSWORD=your_sa_password

# Database Names
USER_DB_NAME=XemPhim_User
MOVIE_DB_NAME=XemPhim_Movie
SEAT_DB_NAME=XemPhim_Seat
BOOKING_DB_NAME=XemPhim_Booking
PAYMENT_DB_NAME=XemPhim_Payment

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# ZaloPay Integration
APP_ID=2554
KEY1=your_zalopay_key1
KEY2=your_zalopay_key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
ZALOPAY_CALLBACK_URL=https://your-ngrok-subdomain.ngrok-free.dev/api/zalopay/callback

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost

# Email SMTP Setup (Nodemailer)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM="XemPhim PTIT <your_email@gmail.com>"
```

### Running Services

Bạn có thể chạy toàn bộ các dịch vụ (Gateway, Frontend và 6 Microservices) song song chỉ với 1 lệnh từ thư mục gốc nhờ vào `concurrently`:
```bash
npm run dev-all
```

Hoặc chạy từng dịch vụ một trong các terminal khác nhau:

**Terminal 1 - Frontend (React)**
```bash
cd frontend
npm start
# Khởi chạy tại http://localhost:3000
```

**Terminal 2 - API Gateway**
```bash
npm run dev-gateway
# Khởi chạy tại http://localhost:8080
```

**Terminal 3 - User Service**
```bash
npm run dev-user
# Khởi chạy tại http://localhost:4001
```

**Terminal 4 - Movie Service**
```bash
npm run dev-movie
# Khởi chạy tại http://localhost:4002
```

**Terminal 5 - Seat Service**
```bash
npm run dev-seat
# Khởi chạy tại http://localhost:4003
```

**Terminal 6 - Booking Service**
```bash
npm run dev-booking
# Khởi chạy tại http://localhost:4004
```

**Terminal 7 - Payment Service**
```bash
npm run dev-payment
# Khởi chạy tại http://localhost:4005
```

**Terminal 8 - Notification Service**
```bash
npm run dev-notification
# Khởi chạy tại http://localhost:4006
```

### Verify All Services

Khi mọi dịch vụ đã sẵn sàng, truy vấn Gateway Health Check:
```bash
curl http://localhost:8080/api/health
```

Giao diện người dùng có thể truy cập tại:
```
http://localhost:3000
```

## 📊 API Endpoints

Mọi request từ Frontend sẽ đi qua **API Gateway (Port 8080)**:

### User Service (Port 4001)
```
POST   /api/auth/register      - Đăng ký tài khoản mới (Gmail kết thúc bằng @gmail.com)
POST   /api/auth/login         - Đăng nhập tài khoản
GET    /api/auth/profile       - Lấy thông tin cá nhân (Cần JWT cookie)
POST   /api/auth/logout        - Đăng xuất
```

### Movie Service (Port 4002)
```
GET    /api/movies             - Lấy danh sách toàn bộ phim
GET    /api/movies/:id         - Lấy chi tiết thông tin phim
GET    /api/showtimes          - Lấy danh sách suất chiếu
```

### Seat Service (Port 4003)
```
GET    /api/seats/:showtimeId  - Lấy trạng thái ghế ngồi của suất chiếu
POST   /api/seats/reserve      - Giữ ghế tạm thời
DELETE /api/seats/release      - Hủy giữ ghế
```

### Booking Service (Port 4004)
```
POST   /api/bookings           - Tạo một đơn đặt vé mới
GET    /api/bookings           - Lấy danh sách đơn đặt vé của user
GET    /api/bookings/:id       - Xem chi tiết đơn đặt vé
DELETE /api/bookings/:id       - Hủy đơn đặt vé
```

### Payment Service (Port 4005)
```
POST   /api/payments           - Tạo giao dịch thanh toán
GET    /api/payments/:id       - Lấy trạng thái thanh toán
POST   /api/zalopay/create-qr  - Tạo mã thanh toán QR ZaloPay
POST   /api/zalopay/callback   - Nhận callback cập nhật từ ZaloPay
```

## 🎯 Luồng Nghiệp Vụ Người Dùng

```
1. Đăng ký/Đăng nhập (User Service)
   ↓
2. Xem thông tin phim & suất chiếu (Movie Service)
   ↓
3. Lựa chọn ghế ngồi (Seat Service)
   ↓
4. Tạo đơn đặt vé (Booking Service)
   ↓
5. Tạo QR thanh toán ZaloPay (Payment Service)
   ↓
6. Callback xác nhận thành công & giữ vé (Booking/Seat Service)
   ↓
7. Thông báo qua Email (Notification Service / RabbitMQ)
   ↓
8. Theo dõi vé đã mua (My Tickets)
```

## 🔐 Các Tính Năng Bảo Mật

- **JWT Authentication**: Xác thực người dùng bằng Cookie HttpOnly an toàn
- **Password Hashing**: Mã hóa mật khẩu thông qua thư viện bcrypt/bcryptjs
- **CORS Configuration**: Gateway kiểm soát truy cập từ domain frontend được cho phép
- **Input Validation**: Ràng buộc email `@gmail.com` ở cả client và server
- **SQL Injection Prevention**: Sử dụng các truy vấn tham số hóa mặc định của Sequelize ORM

## 🌐 Tích Hợp ZaloPay Sandbox

- Sử dụng ZaloPay Merchant Sandbox App ID `2554` để thử nghiệm
- Callback được cấu hình qua Ngrok tunnel để hướng dữ liệu từ ZaloPay Server về môi trường local máy phát triển.
- Chi tiết cấu hình tham khảo tại [HUONG_DAN_DAY_DU_ZALOPAY.md](./HUONG_DAN_DAY_DU_ZALOPAY.md).

## 📊 Trạng Thái Dự Án

- [x] Kiến trúc Microservices hoàn chỉnh
- [x] Cơ sở dữ liệu SQL Server phân mảnh theo service
- [x] Xác thực người dùng qua JWT
- [x] Đặt vé & Quản lý phim/suất chiếu
- [x] Thanh toán tích hợp ZaloPay Sandbox
- [x] Thông báo bất đồng bộ qua RabbitMQ (Notification Service)
- [ ] Dashboard quản lý dành cho Admin
- [ ] Gửi mã vé QR code chi tiết qua Email

## 📄 License

Project này được phân phối dưới giấy phép MIT License.

## 👨‍💻 Tác giả

- **Phạm Tuấn Hưng** - Nhà phát triển chính

---

**Cập nhật lần cuối**: Tháng 6, 2026  
**Phiên bản**: 1.0.0  
**Trạng thái**: Hoàn thiện đợt Refactor cơ sở dữ liệu & Cấu hình dịch vụ