# 🎬 PHÂN CHIA CÔNG VIỆC - HỆ THỐNG ĐẶT VÉ XEM PHIM (MICROSERVICES)

## 👥 Tổng quan
Hệ thống được xây dựng theo kiến trúc:
- Microservices
- API Gateway
- Load Balancing
- Redis Cache
- Message Queue

---

# 🟦 THÀNH VIÊN 1: DATA & CATALOG MICROSERVICES

## 🎯 Vai trò
Xây dựng dữ liệu nền tảng và các service cốt lõi của hệ thống.

---

## 📦 Microservices phụ trách

### 1. User Service
- Đăng ký / đăng nhập
- Xác thực JWT

### 2. Movie Catalog Service
- Quản lý phim
- Quản lý suất chiếu
- Quản lý phòng chiếu

### 3. Seat Service
- Quản lý ghế
- Trạng thái ghế:
  - Available
  - Locked
  - Booked

---

## 📊 UML cần thực hiện

### ✅ Use Case Diagram
Actors:
- User
- Admin

Chức năng:
- Xem phim
- Xem lịch chiếu
- Đăng nhập

---

### ✅ Class Diagram
Các lớp:
- Movie
- ShowTime
- Room
- Seat
- User

Yêu cầu:
- Có thuộc tính
- Có phương thức
- Có quan hệ giữa các lớp

---

### ✅ Component Diagram
- User Service
- Movie Service
- Seat Service
- Kết nối qua API

---

## 💻 API cần xây dựng

### 🎥 Movie Service
- GET /movies
- GET /movies/:id
- GET /showtimes

### 👤 User Service
- POST /register
- POST /login

### 💺 Seat Service
- GET /seats
- POST /lock-seat

---

## ⚡ Caching (Redis)
- Cache danh sách phim
- Cache lịch chiếu
- Lock ghế (quan trọng)

---

## 🧠 Design Pattern áp dụng
- Singleton (DB connection)
- Factory Method
- SOLID (Single Responsibility)

---

## 📤 Deliverables
- Use Case Diagram
- Class Diagram
- Component Diagram
- 3 service chạy được

---

# 🟩 THÀNH VIÊN 2: BUSINESS WORKFLOW & API GATEWAY

## 🎯 Vai trò
Xử lý logic nghiệp vụ và điều phối toàn hệ thống.

---

## 📦 Microservices phụ trách

### 1. Booking Service
- Tạo booking
- Gọi Seat Service để lock ghế
- Gọi Payment Service

### 2. Payment Service
- Mock thanh toán

### 3. Notification Service
- Gửi thông báo (email giả lập)

### 4. API Gateway
- Điểm vào duy nhất của hệ thống

---

## 📊 UML cần thực hiện

### ✅ Sequence Diagram
Flow:
User → Gateway → Seat → Booking → Payment → Notification

---

### ✅ Activity Diagram
Flow:
Chọn ghế → Lock ghế → Thanh toán → Thành công

---

### ✅ Deployment Diagram
- Client
- API Gateway (Nginx)
- Microservices
- Database + Redis

---

## 💻 API cần xây dựng

### 🎫 Booking Service
- POST /booking
- GET /booking/:id

---

## ⚙️ Logic Booking

1. User chọn ghế  
2. Gọi Seat Service → lock ghế  
3. Tạo booking  
4. Gọi Payment Service  
5. Thành công → cập nhật DB  

---

## 🌐 API Gateway

Routing:
- /api/movies → movie-service
- /api/book → booking-service
- /api/user → user-service

Chức năng:
- Authentication
- Routing
- Rate limiting

---

## ⚖️ Load Balancing
- Nginx
- Round Robin

---

## ⚡ Message Queue
- RabbitMQ / Kafka

Flow:
Booking → gửi event → Notification

---

## 🧠 Design Pattern
- Facade (API Gateway)
- Proxy (Authentication)
- Dependency Injection

---

## 📤 Deliverables
- Sequence Diagram
- Activity Diagram
- Deployment Diagram
- Booking Service + Gateway chạy được

---

# 🔥 PHẦN CHUNG (CẢ 2)

## 🎯 Demo hệ thống

Flow hoàn chỉnh:
1. Đăng nhập  
2. Xem phim  
3. Chọn ghế  
4. Lock ghế  
5. Đặt vé  
6. Thanh toán  

---

## ❗ Xử lý Concurrency (QUAN TRỌNG)

- 2 user chọn cùng 1 ghế
- Chỉ 1 người lock thành công
- Redis đảm bảo tính nhất quán

---

## 📊 Giải thích kiến trúc

Cần trình bày:
- Tại sao dùng Microservices
- API Gateway là gì
- Redis dùng để làm gì
- Load balancing hoạt động ra sao

---

# ⏱️ Timeline gợi ý

## Tuần 1
- Phân tích + UML

## Tuần 2
- Coding services

## Tuần 3
- Integration + test + demo

---

# 🏁 KẾT LUẬN

- Thành viên 1: Data + Model + Core Services  
- Thành viên 2: Logic + Flow + Gateway  

=> Kết hợp thành hệ thống hoàn chỉnh, scalable và dễ mở rộng.