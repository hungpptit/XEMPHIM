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


# 🧠 5. Design Patterns áp dụng

Trong hệ thống, một số mẫu thiết kế phần mềm (Design Patterns) được áp dụng nhằm tăng tính linh hoạt, dễ mở rộng và dễ bảo trì.

---

## 5.1 Singleton Pattern

### Mục đích:
Đảm bảo một class chỉ có một instance duy nhất.

### Áp dụng:
- Kết nối Database
- Kết nối Redis

### Lợi ích:
- Tránh tạo nhiều kết nối không cần thiết
- Tiết kiệm tài nguyên hệ thống

---

## 5.2 Factory Pattern

### Mục đích:
Tạo đối tượng mà không cần chỉ rõ class cụ thể.

### Áp dụng:
- Tạo các đối tượng như Booking, User, Payment
- Tách logic khởi tạo object khỏi business logic

### Lợi ích:
- Dễ mở rộng
- Giảm phụ thuộc giữa các module

---

## 5.3 SOLID Principles

### Bao gồm:

- S (Single Responsibility): mỗi service chỉ có một nhiệm vụ  
- O (Open/Closed): dễ mở rộng, không sửa code cũ  
- L (Liskov Substitution): thay thế object mà không lỗi  
- I (Interface Segregation): interface nhỏ, rõ ràng  
- D (Dependency Inversion): phụ thuộc abstraction thay vì implementation  

### Áp dụng:
- Thiết kế các Microservices độc lập
- Tách rõ các layer (Controller, Service, Repository)

---

## 5.4 API Gateway Pattern

### Mục đích:
Cung cấp một điểm truy cập duy nhất cho hệ thống.

### Áp dụng:
- Routing request
- Authentication
- Rate limiting

---

## 5.5 Cache Aside Pattern

### Mục đích:
Tối ưu truy xuất dữ liệu bằng cache.

### Cách hoạt động:
1. Kiểm tra cache  
2. Nếu không có → query DB  
3. Lưu vào cache  

### Áp dụng:
- Danh sách phim
- Lịch chiếu

---

## 5.6 Distributed Lock (Redis)

### Mục đích:
Giải quyết vấn đề concurrency (trùng ghế).

### Áp dụng:
- Lock ghế khi user chọn

### Lợi ích:
- Tránh double booking
- Đảm bảo tính nhất quán dữ liệu

---
---

# 🚀 6. Công nghệ đề xuất

Hệ thống sử dụng các công nghệ hiện đại nhằm đáp ứng yêu cầu về hiệu năng, khả năng mở rộng và tính linh hoạt:

- Backend: NodeJS / Spring Boot (xây dựng các Microservices)  
- API Gateway: Nginx / Spring Cloud Gateway (định tuyến và kiểm soát truy cập)  
- Cache: Redis (tăng tốc truy xuất và xử lý lock ghế)  
- Message Queue: RabbitMQ / Kafka (xử lý bất đồng bộ)  
- Database: MySQL / PostgreSQL (lưu trữ dữ liệu chính)  

---

# 🏁 7. Kết luận

Hệ thống được thiết kế theo hướng phân tán với kiến trúc Microservices, trong đó mỗi thành phần đảm nhiệm một vai trò riêng biệt và giao tiếp thông qua API.

Kiến trúc này cho phép:
- Tách biệt rõ ràng giữa các domain nghiệp vụ  
- Dễ dàng mở rộng từng thành phần độc lập  
- Tăng khả năng chịu tải thông qua load balancing  
- Tối ưu hiệu năng nhờ caching và xử lý bất đồng bộ  

Đặc biệt, bài toán đặt vé xem phim yêu cầu xử lý concurrency (nhiều người chọn cùng một ghế) đã được giải quyết thông qua cơ chế lock sử dụng Redis, đảm bảo tính nhất quán dữ liệu.

Qua đề tài này, nhóm có thể vận dụng các nguyên lý thiết kế kiến trúc phần mềm, các design pattern và kỹ thuật triển khai hệ thống phân tán trong một bài toán thực tế.