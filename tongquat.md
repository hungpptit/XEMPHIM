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

Trong hệ thống, các mẫu thiết kế phần mềm (Design Patterns) và kiến trúc phân tán được áp dụng nhằm tăng tính linh hoạt, khả năng chịu tải, độc lập và dễ bảo trì.

---

## 5.1 Singleton Pattern

### Mục đích:
Đảm bảo một class/module chỉ có một thực thể duy nhất hoạt động trong mỗi tiến trình microservice.

### Áp dụng:
- Thiết lập và tái sử dụng kết nối cơ sở dữ liệu Sequelize qua instance duy nhất tại `models/index.js` ở mỗi microservice.
- Kết nối Redis client (`ioredis`) dùng chung trong suốt vòng đời của Movie Service và Booking Service.

### Lợi ích:
- Tránh việc mở nhiều kết nối song song gây tràn tài nguyên cơ sở dữ liệu.
- Tiết kiệm bộ nhớ và nâng cao tốc độ phản hồi.

---

## 5.2 Factory Pattern

### Mục đích:
Khởi tạo và cấu hình các đối tượng Model của Sequelize mà không để lộ logic khởi tạo cụ thể.

### Áp dụng:
- Các file model (như `user.js`, `movie.js`, `booking.js`) xuất ra một hàm nhận vào instance `sequelize` và kiểu dữ liệu `DataTypes`, sau đó trả về model được cấu hình đầy đủ.

### Lợi ích:
- Giảm phụ thuộc trực tiếp vào instance kết nối.
- Dễ dàng thay thế hoặc viết Unit Test độc lập cho model.

---

## 5.3 SOLID Principles

### Áp dụng cụ thể:
- **Single Responsibility Principle (S)**: Mỗi Microservice chỉ đảm nhận duy nhất một nghiệp vụ cốt lõi (ví dụ: User Service quản lý xác thực tài khoản; Seat Service quản lý trạng thái sơ đồ ghế; Notification Service chỉ quản lý gửi email).
- **Dependency Inversion Principle (D)**: Các controllers phụ thuộc vào abstraction của service layer, thay vì truy cập trực tiếp các driver kết nối hạ tầng.

---

## 5.4 API Gateway Pattern

### Mục đích:
Cung cấp một cổng truy cập hợp nhất (Single Entry Point) cho client bên ngoài, giải quyết vấn đề CORS và điều phối yêu cầu.

### Áp dụng:
- Tích hợp tại cổng `8080` dùng `express` để lắng nghe request từ Frontend ReactJS.
- Giải mã và xác thực token JWT tập trung từ Cookie hoặc Authorization Header, thêm các header thông tin định danh như `X-User-Id`, `X-User-Email`, `X-User-Role` trước khi forward request downstream.

---

## 5.5 Cache-Aside Pattern (Lazy Loading)

### Mục đích:
Giảm thiểu tải cho cơ sở dữ liệu quan hệ SQL Server đối với các dữ liệu tĩnh hoặc ít biến động.

### Áp dụng:
- Khi client yêu cầu danh sách phim hoặc thông tin suất chiếu tại Movie Service:
  1. Kiểm tra sự tồn tại của dữ liệu trong Redis Cache.
  2. Nếu có dữ liệu (Cache Hit), trả về ngay lập tức cho client.
  3. Nếu không có (Cache Miss), thực hiện query trong database, lưu kết quả vào Redis Cache với TTL (Time-To-Live) xác định, sau đó trả về cho client.
  4. Tự động xóa/cập nhật cache (Invalidation) khi quản trị viên thực hiện chỉnh sửa phim.

---

## 5.6 Distributed Lock (Redis Lock)

### Mục đích:
Đảm bảo tính nhất quán dữ liệu và loại bỏ tình trạng race condition khi nhiều người dùng cùng lúc đặt cùng một vị trí ghế trong rạp.

### Áp dụng:
- Booking Service sử dụng Redis làm cơ chế khóa phân tán với cấu trúc key: `lock:showtime:${showtime_id}:seat:${seat_id}` qua lệnh `SET NX PX`.
- Khóa tự động hết hạn sau 120 giây (TTL) nếu người dùng không thanh toán thành công để mở khóa ghế cho người khác. Nếu Redis ngoại tuyến, hệ thống tự động fallback sử dụng transaction lock ở database (`t.LOCK.UPDATE`).

---

## 5.7 Publish-Subscribe / Messaging Pattern (RabbitMQ)

### Mục đích:
Xử lý giao tiếp bất đồng bộ (Asynchronous Messaging) giữa các service để cải thiện thời gian phản hồi API và giảm thiểu sự liên kết chặt chẽ (decoupling).

### Áp dụng:
- Khi nhận được callback thanh toán thành công, Booking Service ghi nhận và lập tức đẩy một message thông tin vé vào hàng đợi (queue) `ticket.notifications` trên RabbitMQ rồi phản hồi ngay cho Cổng thanh toán.
- Notification Service chạy nền độc lập sẽ lắng nghe (consume) queue này, tiến hành sinh ảnh mã QR chứa token vé, và gửi email xác nhận vé bằng Nodemailer mà không làm block luồng xử lý chính.

---

## 5.8 Database-per-Service Pattern

### Mục đích:
Đảm bảo mỗi microservice tự chủ hoàn toàn về lưu trữ dữ liệu, dễ dàng thay đổi cấu trúc bảng mà không làm ảnh hưởng đến các service khác.

### Áp dụng:
- Mỗi microservice chỉ khai báo và tương tác trực tiếp với các models thuộc phạm vi nghiệp vụ của nó thông qua Sequelize. Việc truy cập chéo thông tin (ví dụ: Booking Service cần kiểm tra thông tin user hoặc ghế) được thực hiện thông qua giao tiếp REST API nội bộ hoặc API Gateway.

---

## 5.9 Proxy Pattern (Reverse Proxy)

### Mục đích:
Đại diện và che giấu cấu trúc cổng dịch vụ nội bộ của các microservice con đối với mạng bên ngoài.

### Áp dụng:
- Sử dụng thư viện `express-http-proxy` tại API Gateway để chuyển tiếp các requests một cách trong suốt từ cổng `8080` tới các service con tương ứng (ví dụ: `/api/auth` -> cổng `4001`, `/api/movies` -> cổng `4002`, v.v.).

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