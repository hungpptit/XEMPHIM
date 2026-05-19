# 🎬 TỔNG QUAN ĐỀ TÀI - HỆ THỐNG ĐẶT VÉ XEM PHIM

---

# 📌 1. Giới thiệu đề tài

## 🎯 Tên đề tài
Xây dựng hệ thống đặt vé xem phim theo kiến trúc Microservices.

---

## 📖 Mô tả hệ thống
Hệ thống cho phép người dùng:
- Xem danh sách phim đang chiếu
- Xem lịch chiếu theo rạp và thời gian
- Chọn ghế ngồi
- Đặt vé và thanh toán trực tuyến
- Nhận thông báo xác nhận đặt vé

Hệ thống hướng đến việc xử lý số lượng lớn người dùng đồng thời và đảm bảo tính chính xác trong việc đặt ghế.

---

## 🎯 Mục tiêu
- Xây dựng hệ thống có khả năng mở rộng cao (scalable)
- Đảm bảo tính nhất quán dữ liệu (data consistency)
- Xử lý concurrency (nhiều người đặt cùng ghế)
- Áp dụng kiến trúc Microservices hiện đại

---

# 🧱 2. Yêu cầu kiến trúc (BẮT BUỘC)


---

## 🔥 2.1 Kiến trúc tổng thể

### Sơ đồ kiến trúc:

```text
               📱 Client (Web/Mobile)
                       │
                       ▼
                🛡️ API Gateway
                       │
                       ▼
                ⚖️ Load Balancer
                       │
                       ▼
┌──────────────────────────────────────────────┐
│            🧩 Microservices Layer            │
├──────────────────────────────────────────────┤
│  ├── 👤 User Service                         │
│  ├── 🎬 Movie Catalog Service                 │
│  ├── 📅 ShowTime Service                     │
│  ├── 💺 Seat Service                         │
│  ├── 🎟️ Booking Service                      │
│  ├── 💳 Payment Service                      │
│  └── 🔔 Notification Service                  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│      💾 Infrastructure & Storage Layer       │
├──────────────────────────────────────────────┤
│  ├── 🗄️ Database Layer (MySQL/PostgreSQL)     │
│  ├── ⚡ Redis Cache (Lock ghế & Caching)     │
│  └── ✉️ Message Queue (RabbitMQ/Kafka)        │
└──────────────────────────────────────────────┘
```

### Mô tả chi tiết:

- **Client (Web/Mobile)**: Gửi request đến hệ thống thông qua API Gateway.
- **API Gateway**: Đóng vai trò là cổng vào duy nhất, chịu trách nhiệm xác thực, phân quyền, rate limiting và định tuyến request.
- **Load Balancer**: Phân phối đều các request tải đến các instance của từng microservice để đảm bảo tính sẵn sàng cao.
- **Microservices Layer**: Bao gồm các dịch vụ nghiệp vụ độc lập, tự chủ về logic và cơ sở dữ liệu (Database-per-Service).
- **Database Layer**: Lưu trữ dữ liệu lâu bền cho từng dịch vụ tương ứng.
- **Redis Cache**: Lưu trữ cache dữ liệu ít thay đổi (danh sách phim) và thực hiện phân tán khóa (Distributed Lock) để khóa ghế tạm thời khi người dùng đang thực hiện thanh toán.
- **Message Queue (RabbitMQ/Kafka)**: Xử lý truyền tin nhắn bất đồng bộ giữa các service (ví dụ: Booking/Payment Service đẩy sự kiện đặt vé thành công vào hàng đợi để Notification Service tiêu thụ và gửi email/SMS xác nhận).
---

## ⚙️ 2.2 Các thành phần bắt buộc

---

### ✅ 1. Microservices

Hệ thống phải được chia thành các service độc lập:

- User Service (quản lý người dùng)
- Movie Catalog Service (quản lý phim)
- ShowTime Service (lịch chiếu)
- Seat Service (quản lý ghế)
- Booking Service (đặt vé)
- Payment Service (thanh toán)
- Notification Service (thông báo)

---

### ✅ 2. API Gateway

Đóng vai trò là điểm vào duy nhất của hệ thống:
- Nhận request từ client
- Định tuyến đến các service tương ứng
- Xử lý xác thực (authentication)
- Hỗ trợ rate limiting

---

### ✅ 3. Load Balancing

- Phân phối request đến nhiều instance service
- Tăng khả năng chịu tải và tính sẵn sàng
- Áp dụng thuật toán Round Robin

---

### ✅ 4. Caching (Redis)

Sử dụng Redis cho:
- Cache dữ liệu phim và lịch chiếu
- Lock ghế tạm thời khi user chọn ghế

---

### ✅ 5. Message Queue

Sử dụng RabbitMQ hoặc Kafka để:
- Xử lý các tác vụ bất đồng bộ
- Gửi thông báo sau khi đặt vé thành công

---

# 🔥 3. Yêu cầu nghiệp vụ quan trọng

---

## 🎯 Use Case chính: Đặt vé xem phim

### Flow cơ bản:

1. Người dùng chọn phim và suất chiếu  
2. Chọn ghế ngồi  
3. Hệ thống kiểm tra và lock ghế  
4. Người dùng thực hiện thanh toán  
5. Hệ thống xác nhận và tạo booking  
6. Gửi thông báo thành công  

---

## ❗ Xử lý concurrency (QUAN TRỌNG)

- Nhiều người có thể chọn cùng một ghế
- Hệ thống phải đảm bảo:
  - Chỉ một người đặt thành công
  - Tránh trùng ghế

### Giải pháp:
- Sử dụng Redis để lock ghế tạm thời
- Thiết lập thời gian hết hạn (TTL)

---

# 🧠 4. Các quyết định kiến trúc

---

## 4.1 Tại sao sử dụng Microservices?

- Dễ mở rộng hệ thống
- Tách biệt các domain nghiệp vụ
- Dễ bảo trì và phát triển

---

## 4.2 Vai trò của API Gateway

- Đơn giản hóa giao tiếp client
- Tập trung xử lý bảo mật
- Điều phối request

---

## 4.3 Vai trò của Redis

- Tăng tốc độ truy xuất dữ liệu
- Hỗ trợ caching
- Giải quyết bài toán concurrency

---

## 4.4 Vai trò của Load Balancer

- Phân phối tải
- Tăng độ sẵn sàng hệ thống

---

## 4.5 Trade-off

| Ưu điểm | Nhược điểm |
|--------|----------|
| Scale tốt | Phức tạp |
| Linh hoạt | Khó debug |
| Hiệu năng cao | Quản lý khó |

---

# 🚀 5. Công nghệ đề xuất

- Backend: NodeJS / Spring Boot  
- API Gateway: Nginx / Spring Cloud Gateway  
- Cache: Redis  
- Message Queue: RabbitMQ / Kafka  
- Database: MySQL / PostgreSQL  

---

# 🏁 6. Kết luận

Hệ thống đặt vé xem phim được xây dựng theo kiến trúc Microservices giúp:
- Đảm bảo khả năng mở rộng
- Xử lý tốt lượng lớn người dùng
- Đáp ứng yêu cầu nghiệp vụ phức tạp

Đây là một bài toán thực tế điển hình để áp dụng các nguyên lý và mẫu thiết kế trong môn Thiết kế Kiến trúc Phần mềm.