# XEMPHIM - Movie Ticket Booking System

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![MSSQL](https://img.shields.io/badge/SQL_Server-2022-CC2927?logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/en-us/sql-server/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.x-FF6600?logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Redis](https://img.shields.io/badge/Redis-7.x-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![ZaloPay](https://img.shields.io/badge/ZaloPay-Sandbox-0068FF)](https://zalopay.vn/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)](./docs/architecture/system-overview.md)

> Hệ thống đặt vé xem phim trực tuyến, xây dựng trên kiến trúc **Microservices** với Node.js. Hỗ trợ thanh toán ZaloPay, xử lý concurrency bằng Redis Distributed Lock, và thông báo bất đồng bộ qua RabbitMQ.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎥 Movie & Showtimes | Danh sách phim, rạp chiếu, suất chiếu theo thời gian thực |
| 🪑 Seat Selection | Chọn ghế interactive với Redis Distributed Lock chống trùng ghế |
| 💳 ZaloPay Payment | Tích hợp QR Code thanh toán ZaloPay Sandbox |
| 🔐 JWT Auth | Cookie HttpOnly + bcrypt password hashing |
| 🔔 Async Notifications | Email xác nhận vé qua RabbitMQ + Nodemailer |
| ⚡ Redis Cache | Cache-Aside Pattern cho danh sách phim & suất chiếu |
| 🔄 Microservices | 6 independent services, Database-per-Service pattern |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Client (React - Port 3000)                │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│              API Gateway  (Port 8080)                       │
│         JWT Validation · CORS · Route Forwarding            │
└──┬─────────┬──────────┬──────────┬──────────┬──────────┬───┘
   │         │          │          │          │          │
   ▼         ▼          ▼          ▼          ▼          ▼
:4001     :4002       :4003      :4004      :4005      :4006
User    Movie       Seat      Booking   Payment  Notification
Service Service    Service    Service   Service    Service
   │         │          │          │          │          │
   └────┬────┘          └────┬─────┘          │          │
        │                   │                 │          │
        ▼                   ▼                 ▼          │
 ┌─────────────────────────────────────────────────┐    │
 │         Microsoft SQL Server (Port 1433)         │    │
 │  XemPhim_User  XemPhim_Movie  XemPhim_Seat      │    │
 │  XemPhim_Booking              XemPhim_Payment   │    │
 └─────────────────────────────────────────────────┘    │
        │                                               │
        ▼                   ┌──────────────────────────┘
 ┌─────────────┐            ▼
 │    Redis     │  ┌─────────────────────┐
 │  Dist Lock   │  │ RabbitMQ (Consumer) │
 │  + Cache     │  │ ticket.notifications│
 └─────────────┘  └─────────────────────┘
```

---

## 🛠️ Technology Stack

### Backend Services
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express | 5.x | RESTful API |
| ORM | Sequelize | 6.x | Database abstraction |
| Database | MSSQL (SQL Server) | 2022 | Relational storage |
| Cache / Lock | Redis (ioredis) | 7.x | Cache + Distributed Lock |
| Message Queue | RabbitMQ (amqplib) | 3.x | Async notifications |
| Auth | JWT + bcrypt | — | Authentication |
| Payment | ZaloPay SDK | Sandbox | Payment gateway |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI Framework |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| CSS Modules | Component-scoped styling |

### DevOps & Tooling
| Tool | Purpose |
|------|---------|
| npm workspaces | Monorepo management |
| concurrently | Run all services in parallel |
| nodemon | Hot-reload for development |
| Jest | Unit & Integration testing |
| ngrok | Local HTTPS tunneling (ZaloPay callback) |

---

## 📁 Project Structure

```
XEMPHIM/
├── frontend/                    # React SPA (Port 3000)
├── gateway/                     # API Gateway (Port 8080)
│   ├── index.js                 # JWT auth + reverse proxy
│   └── swagger.json             # OpenAPI spec
├── services/
│   ├── user-service/            # Auth + User CRUD  (Port 4001)
│   ├── movie-service/           # Movies + Showtimes (Port 4002)
│   ├── seat-service/            # Seat layout + status (Port 4003)
│   ├── booking-service/         # Booking lifecycle  (Port 4004)
│   ├── payment-service/         # ZaloPay integration (Port 4005)
│   └── notification-service/   # Email via RabbitMQ  (Port 4006)
├── docs/                        # 📖 Project documentation
│   ├── architecture/            #   System design & ADRs
│   ├── api/                     #   API reference
│   ├── guides/                  #   Setup & integration guides
│   └── TEST_REPORT.md           #   Test results report
├── XemPhim_*.sql                # Database schema files
├── .env                         # Environment variables (see docs/guides/environment.md)
└── package.json                 # Root monorepo scripts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18 — [Download](https://nodejs.org/)
- **Microsoft SQL Server** — [Download](https://www.microsoft.com/en-us/sql-server/)
- **RabbitMQ** — [Download](https://www.rabbitmq.com/download.html) *(optional, falls back to HTTP)*
- **Redis** — [Download](https://redis.io/) *(optional, falls back to DB lock)*
- **Git**

### 1. Clone & Install

```bash
git clone https://github.com/hungpptit/XEMPHIM.git
cd XEMPHIM
npm run install-all   # Cài đặt tất cả services trong một lệnh
```

### 2. Configure Environment

```bash
cp .env.example .env   # Sao chép file mẫu
# Chỉnh sửa .env với thông tin cấu hình của bạn
```

Xem danh sách đầy đủ biến môi trường tại [`docs/guides/environment.md`](./docs/guides/environment.md).

**Biến bắt buộc:**
```env
DB_HOST=localhost
DB_USERNAME=sa
DB_PASS=your_sa_password
JWT_SECRET=your_jwt_secret_key
```

### 3. Setup Database

Chạy các file SQL để tạo database schemas:
```bash
# Kết nối vào SQL Server Management Studio hoặc sqlcmd
# Chạy lần lượt:
sqlcmd -S localhost -U sa -P <password> -i XemPhim_User.sql
sqlcmd -S localhost -U sa -P <password> -i XemPhim_Movie.sql
sqlcmd -S localhost -U sa -P <password> -i XemPhim_Seat.sql
sqlcmd -S localhost -U sa -P <password> -i XemPhim_Booking.sql
sqlcmd -S localhost -U sa -P <password> -i XemPhim_Payment.sql
```

Xem hướng dẫn chi tiết: [`docs/guides/database-setup.md`](./docs/guides/database-setup.md)

### 4. Run All Services

```bash
npm run dev-all   # Khởi động tất cả services song song
```

Hoặc chạy từng service riêng lẻ:
```bash
npm run dev-gateway       # API Gateway      → http://localhost:8080
npm run dev-user          # User Service     → http://localhost:4001
npm run dev-movie         # Movie Service    → http://localhost:4002
npm run dev-seat          # Seat Service     → http://localhost:4003
npm run dev-booking       # Booking Service  → http://localhost:4004
npm run dev-payment       # Payment Service  → http://localhost:4005
npm run dev-notification  # Notification     → http://localhost:4006
npm run dev-frontend      # React Frontend   → http://localhost:3000
```

### 5. Verify

```bash
curl http://localhost:8080/api/health   # Gateway health check
# Open browser: http://localhost:3000
```

---

## 📊 Service Port Map

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| React Frontend | 3000 | — | User interface |
| API Gateway | 8080 | — | Single entry point, JWT auth |
| User Service | 4001 | XemPhim_User | Registration, login, profile |
| Movie Service | 4002 | XemPhim_Movie | Movies, showtimes, cinemas |
| Seat Service | 4003 | XemPhim_Seat | Seat layout, availability |
| Booking Service | 4004 | XemPhim_Booking | Booking lifecycle, Redis lock |
| Payment Service | 4005 | XemPhim_Payment | ZaloPay integration |
| Notification Service | 4006 | — | RabbitMQ consumer, email |

---

## 📡 API Reference

All requests go through **API Gateway (`:8080`)**. JWT token is read from `HttpOnly cookie` or `Authorization: Bearer <token>` header.

### Authentication (User Service)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Đăng ký tài khoản (@gmail.com) |
| `POST` | `/api/auth/login` | ❌ | Đăng nhập, nhận JWT cookie |
| `GET` | `/api/auth/profile` | ✅ | Lấy thông tin người dùng |
| `POST` | `/api/auth/logout` | ✅ | Đăng xuất |

### Movies (Movie Service)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/movies` | ❌ | Danh sách phim đang chiếu |
| `GET` | `/api/movies/:id` | ❌ | Chi tiết phim |
| `GET` | `/api/showtimes` | ❌ | Danh sách suất chiếu |
| `GET` | `/api/showtimes/:id` | ❌ | Chi tiết suất chiếu |

### Seats & Booking
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/seats/:showtimeId` | ✅ | Trạng thái ghế của suất chiếu |
| `POST` | `/api/bookings` | ✅ | Tạo đơn đặt vé (lock ghế) |
| `GET` | `/api/bookings` | ✅ | Lịch sử đặt vé của user |
| `GET` | `/api/bookings/:id` | ✅ | Chi tiết đơn đặt vé |
| `DELETE` | `/api/bookings/:id` | ✅ | Hủy đơn đặt vé |

### Payment (ZaloPay)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/payments/orders` | ✅ | Tạo QR thanh toán ZaloPay |
| `GET` | `/api/payments/:id` | ✅ | Trạng thái giao dịch |
| `POST` | `/api/zalopay/callback` | ❌ | ZaloPay webhook callback |
| `POST` | `/api/payments/refunds` | ✅ | Yêu cầu hoàn tiền |

Xem đầy đủ: [`docs/api/README.md`](./docs/api/README.md)

---

## 🔐 Security

- **JWT**: HttpOnly cookies, 7-day expiry, validated at Gateway
- **Passwords**: bcrypt hash (salt rounds = 10)
- **CORS**: Whitelist-based, origin validation at Gateway
- **SQL Injection**: Prevented via Sequelize ORM parameterized queries
- **Input Validation**: Email restricted to `@gmail.com` domain
- **ZaloPay MAC**: HMAC-SHA256 signature verification on all callbacks

---

## 🧪 Testing

```bash
# Chạy unit tests - booking-service
npm test --prefix services/booking-service

# Chạy unit tests - payment-service
npm test --prefix services/payment-service

# Chạy unit tests - movie-service
npm test --prefix services/movie-service

# Xem báo cáo kiểm thử đầy đủ
cat docs/TEST_REPORT.md
```

Xem chi tiết: [`docs/TEST_REPORT.md`](./docs/TEST_REPORT.md)

---

## 🌐 ZaloPay Integration

Hệ thống sử dụng **ZaloPay Sandbox** (App ID: `2554`).

Callback được nhận qua Ngrok tunnel:
```bash
# Xem hướng dẫn setup ngrok
cat docs/guides/zalopay-integration.md
```

---

## 📈 Project Status

- [x] Microservices architecture (6 services)
- [x] Database-per-Service (5 MSSQL databases)
- [x] JWT Authentication & Authorization
- [x] Movie, Showtime, Seat management
- [x] ZaloPay Sandbox payment integration
- [x] Redis Distributed Lock (concurrency control)
- [x] RabbitMQ async notifications + Email
- [x] Unit & Integration Testing (Jest)
- [ ] Admin Dashboard (coming soon)
- [ ] Docker Compose deployment
- [ ] CI/CD Pipeline

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [`docs/architecture/system-overview.md`](./docs/architecture/system-overview.md) | Kiến trúc hệ thống chi tiết |
| [`docs/architecture/design-patterns.md`](./docs/architecture/design-patterns.md) | Design patterns áp dụng |
| [`docs/api/README.md`](./docs/api/README.md) | API reference đầy đủ |
| [`docs/guides/database-setup.md`](./docs/guides/database-setup.md) | Hướng dẫn setup database |
| [`docs/guides/environment.md`](./docs/guides/environment.md) | Biến môi trường |
| [`docs/guides/zalopay-integration.md`](./docs/guides/zalopay-integration.md) | ZaloPay integration guide |
| [`docs/decisions/adr-001-microservices.md`](./docs/decisions/adr-001-microservices.md) | Architecture Decision Record |
| [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) | Hướng dẫn đóng góp |
| [`docs/TEST_REPORT.md`](./docs/TEST_REPORT.md) | Báo cáo kiểm thử |

---

## 🤝 Contributing

Vui lòng đọc [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) trước khi đóng góp.

**Branch naming convention:**
```
feature/<ticket-id>-short-description
fix/<ticket-id>-short-description
docs/<ticket-id>-short-description
test/<ticket-id>-short-description
```

**Commit message convention (Conventional Commits):**
```
feat: add ZaloPay refund endpoint
fix: handle Redis connection timeout gracefully
docs: update API reference for booking service
test: add unit tests for cancelBooking function
```

---

## 👨‍💻 Author

**Phạm Tuấn Hưng** — Backend Developer

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.

---

*Last updated: August 2026 | Version: 1.0.0*