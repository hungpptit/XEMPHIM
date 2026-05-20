# 🎬 XEMPHIM - Hệ Thống Đặt Vé Xem Phim Online

[![Node.js](https://img.shields.io/badge/Node.js-16+-green)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791)](https://www.postgresql.org/)
[![ZaloPay](https://img.shields.io/badge/ZaloPay-Integration-orange)](https://zalopay.vn/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Hệ thống quản lý đặt vé xem phim **toàn diện** được xây dựng với kiến trúc **Microservices**. Hỗ trợ thanh toán qua **ZaloPay**, tích hợp **RabbitMQ** cho xử lý bất đồng bộ, và giao diện web hiện đại với **React**.

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
│   Port: 3000/3001              │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│  API Gateway                    │
│  Port: 3000                     │
│  (Route aggregation & auth)     │
└──────────────┬──────────────────┘
               │
      ┌────────┴─────────────────────┬──────────────┐
      │                              │              │
┌─────▼──────┐ ┌─────────┐ ┌────────▼──┐ ┌─────────▼──┐
│ User       │ │ Movie   │ │ Booking   │ │ Payment    │
│ Service    │ │ Service │ │ Service   │ │ Service    │
│ :5001      │ │ :5002   │ │ :5003     │ │ :5004      │
└─────┬──────┘ └────┬────┘ └────┬──────┘ └────┬───────┘
      │             │           │             │
      │   ┌─────────┴───────────┼─────────────┤
      │   │                     │             │
      │   │  ┌──────────────────▼──┐          │
      │   │  │ Seat Service        │          │
      │   │  │ :5005               │          │
      │   │  └──────────┬───────────┘          │
      │   │             │                      │
      └───┴─────────────┼──────────────────────┘
          │             │
      ┌───▼─────────────▼──────────────────────┐
      │  PostgreSQL Database (Shared)          │
      │  - Users, Movies, Showtimes            │
      │  - Bookings, Seats, Payments           │
      └────────────────────────────────────────┘
          │
      ┌───▼──────────────────────────┐
      │ RabbitMQ Message Queue       │
      │ (Async Processing)           │
      │ - Notification Service       │
      │ - Booking expiration jobs    │
      └──────────────────────────────┘
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
- **Sequelize ORM** - Database management & migrations
- **PostgreSQL** - Production-ready relational database
- **JWT** - Authentication & Authorization
- **bcryptjs** - Password hashing
- **RabbitMQ** - Message queue for async operations
- **amqplib** - RabbitMQ client

### Payment Integration
- **ZaloPay SDK** - Payment gateway integration
- **MD5/HMAC** - Cryptographic signatures for security

### DevOps & Tools
- **npm/yarn** - Package management
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
│   ├── index.js                   # Main gateway server
│   ├── package.json
│   └── swagger.json               # API Documentation
│
├── services/                      # Microservices
│   │
│   ├── user-service/              # 👤 User Management (Port 5001)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── models/
│   │   │   └── user.js
│   │   ├── routes/
│   │   │   └── auth.js
│   │   └── utils/
│   │       └── jwt.js
│   │
│   ├── movie-service/             # 🎥 Movie Management (Port 5002)
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
│   ├── booking-service/           # 🎫 Booking Management (Port 5003)
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
│   ├── payment-service/           # 💳 Payment & ZaloPay (Port 5004)
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
│   ├── seat-service/              # 🪑 Seat Management (Port 5005)
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
│   └── notification-service/      # 🔔 Async Notifications
│       ├── index.js
│       ├── package.json
│       └── consumer.js            # RabbitMQ consumer
│
├── docs/                          # Documentation
│   ├── payment_flow.md            # ZaloPay integration guide
│   └── ...
│
├── MOCK_DATA_LOCATIONS.md         # Mock data locations
├── HUONG_DAN_DAY_DU_ZALOPAY.md    # ZaloPay setup guide
├── zalopay_qr_integration.md      # QR code integration guide
├── RUN_NGROK_GUIDE.md             # Ngrok tunneling guide
├── package.json                   # Root package.json
└── README.md                      # This file
```

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Prerequisites
- **Node.js** 16+ ([Download](https://nodejs.org/))
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/download/))
- **RabbitMQ** ([Download](https://www.rabbitmq.com/download.html)) - Optional for full features
- **npm** hoặc **yarn**
- **Git**

### Installation - Step by Step

#### 1. Clone Repository
```bash
git clone https://github.com/yourusername/XEMPHIM.git
cd XEMPHIM
```

#### 2. Install Dependencies for All Services
```bash
# Install root dependencies
npm install

# Frontend
cd frontend && npm install && cd ..

# Services
cd services/user-service && npm install && cd ../../
cd services/movie-service && npm install && cd ../../
cd services/booking-service && npm install && cd ../../
cd services/payment-service && npm install && cd ../../
cd services/seat-service && npm install && cd ../../
cd services/notification-service && npm install && cd ../../
```

#### 3. Database Setup

Create PostgreSQL database:
```sql
CREATE DATABASE xemphim;
CREATE USER xemphim_user WITH PASSWORD 'your_password';
ALTER ROLE xemphim_user SET client_encoding TO 'utf8';
ALTER ROLE xemphim_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE xemphim_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE xemphim TO xemphim_user;
```

#### 4. Environment Configuration

Create `.env` files in each service directory:

**services/user-service/.env**
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://xemphim_user:your_password@localhost:5432/xemphim
JWT_SECRET=your_jwt_secret_key_min_32_chars_long
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
```

**services/movie-service/.env**
```env
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://xemphim_user:your_password@localhost:5432/xemphim
```

**services/booking-service/.env**
```env
PORT=5003
NODE_ENV=development
DATABASE_URL=postgresql://xemphim_user:your_password@localhost:5432/xemphim
RABBITMQ_URL=amqp://localhost
BOOKING_EXPIRE_TIME=300
```

**services/payment-service/.env**
```env
PORT=5004
NODE_ENV=development
DATABASE_URL=postgresql://xemphim_user:your_password@localhost:5432/xemphim
ZALOPAY_APP_ID=your_zalopay_app_id
ZALOPAY_KEY1=your_zalopay_key1
ZALOPAY_KEY2=your_zalopay_key2
ZALOPAY_ENDPOINT=https://api.zalopay.vn
CALLBACK_URL=http://your-domain/api/callback
```

**services/seat-service/.env**
```env
PORT=5005
NODE_ENV=development
DATABASE_URL=postgresql://xemphim_user:your_password@localhost:5432/xemphim
```

**services/notification-service/.env**
```env
NODE_ENV=development
RABBITMQ_URL=amqp://localhost
```

**frontend/.env**
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_ZALOPAY_ENABLED=true
```

### Running Services

Open multiple terminal windows and run each command:

**Terminal 1 - Frontend (React)**
```bash
cd frontend
npm start
# Runs at http://localhost:3000
```

**Terminal 2 - API Gateway**
```bash
node gateway/index.js
# Routes requests to microservices
```

**Terminal 3 - User Service**
```bash
cd services/user-service
npm start
# Runs at http://localhost:5001
```

**Terminal 4 - Movie Service**
```bash
cd services/movie-service
npm start
# Runs at http://localhost:5002
```

**Terminal 5 - Booking Service**
```bash
cd services/booking-service
npm start
# Runs at http://localhost:5003
```

**Terminal 6 - Payment Service**
```bash
cd services/payment-service
npm start
# Runs at http://localhost:5004
```

**Terminal 7 - Seat Service**
```bash
cd services/seat-service
npm start
# Runs at http://localhost:5005
```

**Terminal 8 - Notification Service (Optional)**
```bash
cd services/notification-service
node consumer.js
# RabbitMQ consumer for async notifications
```

### Verify All Services

Once all services are running, test the API Gateway:
```bash
curl http://localhost:3000/api/health
```

Visit Frontend:
```
http://localhost:3000
```

## 📊 API Endpoints

### User Service (Port 5001)
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - User login
GET    /api/auth/profile       - Get user profile (JWT required)
PUT    /api/auth/profile       - Update user profile
POST   /api/auth/logout        - User logout
```

### Movie Service (Port 5002)
```
GET    /api/movies             - Get all movies
GET    /api/movies/:id         - Get movie details
GET    /api/movies/genre/:id   - Get movies by genre
GET    /api/showtimes          - Get showtimes
GET    /api/cinema-halls       - Get cinema halls
```

### Booking Service (Port 5003)
```
POST   /api/bookings           - Create new booking
GET    /api/bookings           - Get user bookings
GET    /api/bookings/:id       - Get booking details
PUT    /api/bookings/:id       - Update booking
DELETE /api/bookings/:id       - Cancel booking
```

### Seat Service (Port 5005)
```
GET    /api/seats/:showtimeId  - Get available seats
POST   /api/seats/reserve      - Reserve seats
DELETE /api/seats/release      - Release reserved seats
```

### Payment Service (Port 5004)
```
POST   /api/payments           - Create payment
GET    /api/payments/:id       - Get payment status
POST   /api/zalopay/create-qr  - Create ZaloPay QR
POST   /api/zalopay/callback   - ZaloPay callback handler
```

## 🎯 User Flow

```
1. Register/Login (User Service)
   ↓
2. Browse Movies (Movie Service)
   ↓
3. Select Showtime (Movie Service)
   ↓
4. Choose Seats (Seat Service)
   ↓
5. Create Booking (Booking Service)
   ↓
6. Payment (Payment Service → ZaloPay)
   ↓
7. Confirm Booking (Booking Service)
   ↓
8. View Ticket with QR Code (My Tickets)
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based auth across all services
- **Password Hashing**: bcryptjs with salt rounds (10)
- **CORS Configuration**: Restricted to allowed origins
- **Input Validation**: Server-side validation on all endpoints
- **SQL Injection Prevention**: Sequelize ORM parameterized queries
- **XSS Protection**: React's built-in XSS protection
- **HTTPS Ready**: Support for production SSL/TLS

## 🌐 ZaloPay Integration

### Features:
- Generate ZaloPay payment QR codes
- Real-time payment status tracking
- Secure HMAC-MD5 signature validation
- Automatic transaction logging
- Payment retry mechanism

### Setup:
See [HUONG_DAN_DAY_DU_ZALOPAY.md](./HUONG_DAN_DAY_DU_ZALOPAY.md) for detailed ZaloPay configuration.

## 📱 Frontend Modules

### Auth Module
- User registration & login
- Password validation
- Token storage & management

### Home Module
- Movie listing with filters
- Search functionality
- Movie recommendations

### Movie Detail Module
- Full movie information
- Trailer integration
- Showtime selection

### SeatSelection Module
- Interactive seat map
- Real-time availability
- Seat pricing display

### Payment Module
- Multiple payment gateways
- ZaloPay QR code display
- Payment status tracking

### MyTickets Module
- Booked tickets list
- QR code display
- Ticket cancellation
- Refund tracking

## 🧪 Testing

### Test User Credentials
```
Email: test@example.com
Password: Test123456
```

### Test ZaloPay Payment (Sandbox Mode)
- Use sandbox ZaloPay credentials
- Test transactions don't charge real money
- See [zalopay_qr_integration.md](./zalopay_qr_integration.md) for details

## 🌍 Deployment

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure RabbitMQ for production
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure CI/CD pipeline

### Docker Deployment (Optional)
```bash
# Build Docker images for each service
docker-compose up -d
```

## 📚 Documentation

- [Payment Flow](./docs/payment_flow.md)
- [ZaloPay Setup Guide](./HUONG_DAN_DAY_DU_ZALOPAY.md)
- [ZaloPay QR Integration](./zalopay_qr_integration.md)
- [Ngrok Setup Guide](./RUN_NGROK_GUIDE.md)
- [Mock Data Locations](./MOCK_DATA_LOCATIONS.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

## 📝 Project Structure Best Practices

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Models**: Database schemas
- **Routes**: API endpoint definitions
- **Utils**: Reusable utility functions
- **Middleware**: Authentication, validation, error handling

## 🐛 Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### RabbitMQ Connection Error
- Start RabbitMQ service
- Verify RABBITMQ_URL in .env
- Check RabbitMQ management console on port 15672

### CORS Error
- Verify frontend URL in gateway CORS config
- Check service-to-service communication settings
- Ensure proper Origin headers

### ZaloPay Integration Issues
- Verify ZaloPay credentials in .env
- Check callback URL configuration
- Ensure HMAC signature validation is correct

## 📊 Project Status

- [x] Microservices architecture
- [x] User authentication with JWT
- [x] Movie & showtime management
- [x] Booking & seat selection
- [x] ZaloPay payment integration
- [x] React frontend
- [x] API Gateway
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Admin dashboard
- [ ] Analytics dashboard

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Authors

- **Phạm Tuấn Hung** - Initial work and development

## 🙏 Acknowledgments

- ZaloPay for payment gateway
- PostgreSQL for database
- RabbitMQ for message queuing
- React community for amazing framework

## 📞 Support

For support, please create an issue in the repository or contact the development team.

---

**Last Updated**: May 20, 2026  
**Version**: 1.0.0  
**Status**: Active Development