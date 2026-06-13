# BÁO CÁO PHÂN TÍCH THIẾT KẾ KỸ THUẬT: CÁC DESIGN PATTERN TRONG HỆ THỐNG XEMPHIM

**Dự án:** XEMPHIM - Hệ thống Đặt vé xem phim trực tuyến (Microservices Architecture)  
**Tài liệu:** Phân tích Kiến trúc và Mẫu Thiết kế (Design Patterns)  
**Trạng thái:** Hoàn thành (Cập nhật lý do áp dụng chi tiết)

---

## 1. Tổng Quan Kiến Trúc Hệ Thống (System Architecture Overview)

Hệ thống **XemPhim** được thiết kế dựa trên kiến trúc **Microservices (Kiến trúc vi dịch vụ)** nhằm giải quyết các bài toán về khả năng mở rộng (Scalability), tính chịu tải cao (High Concurrency) khi mở bán vé phim hot, và tách biệt miền nghiệp vụ (Business Domains).

```text
                               ┌─────────────────┐
                               │     Client      │
                               │  (React Web)    │
                               └────────┬────────┘
                                        │ (HTTP/HTTPS)
                                        ▼
                               ┌─────────────────┐
                               │   API Gateway   │ (Reverse Proxy, JWT Auth)
                               └────────┬────────┘
                                        │
         ┌──────────────┬───────────────┼───────────────┬──────────────┐
         ▼              ▼               ▼               ▼              ▼
   ┌──────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐  ┌───────────┐
   │   User   │   │   Movie   │   │   Seat    │   │  Booking  │  │  Payment  │
   │ Service  │   │  Service  │   │  Service  │   │  Service  │  │  Service  │
   └──────────┘   └───────────┘   └───────────┘   └─────┬─────┘  └───────────┘
                                                        │
                                                        │ (Event Publish)
                                                        ▼
                                                 ┌─────────────┐
                                                 │  RabbitMQ   │
                                                 └──────┬──────┘
                                                        │ (Event Consume)
                                                        ▼
                                                 ┌─────────────┐
                                                 │Notification │
                                                 │   Service   │
                                                 └─────────────┘
```

---

## 2. Các Mẫu Thiết Kế Kiến Trúc (Architectural Patterns)

### 2.1. API Gateway Pattern
*   **Vị trí áp dụng:** File `/gateway/index.js`
*   **Mô tả:** Đóng vai trò là chốt chặn (Entry Point) duy nhất tiếp nhận request từ Client, thực hiện các nhiệm vụ:
    *   **Reverse Proxy:** Định tuyến các request đến đúng các microservices ở dưới.
    *   **Xác thực tập trung (Centralized Authentication):** Trích xuất và verify token JWT từ cookie. Nếu hợp lệ, đính kèm thông tin danh tính (`x-user-id`, `x-user-email`, `x-user-role`) vào headers chuyển tiếp.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Giải quyết vấn đề trùng lặp code:** Nếu không có Gateway, mỗi microservice (User, Movie, Booking...) đều phải tự cấu hình logic để giải mã (verify) JWT, dẫn đến trùng lặp mã nguồn cực kỳ lớn và khó bảo trì khóa bí mật (`JWT_SECRET`).
    *   **Bảo mật & Giảm thiểu phơi nhiễm:** Giúp ẩn đi toàn bộ các port và địa chỉ IP thật của các service con. Client chỉ giao tiếp qua Gateway, hạn chế tối đa nguy cơ bị tấn công trực tiếp vào cơ sở dữ liệu hoặc logic nghiệp vụ bên trong.
    *   **Quản lý CORS tập trung:** Tránh việc phải cấu hình CORS thủ công ở từng dịch vụ nhỏ.

### 2.2. Database per Service Pattern
*   **Mô tả:** Mỗi service sở hữu một database context độc lập (ví dụ: `XemPhim_Booking` cho `booking-service`, `XemPhim_Movie` cho `movie-service`).
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Đảm bảo tính độc lập tuyệt đối (Loose Coupling):** Nếu dùng chung 1 database lớn, một thay đổi schema bảng ở `movie-service` có thể làm crash toàn bộ `booking-service` hoặc `payment-service`. Chia database riêng biệt giúp mỗi service tự do tối ưu hóa cấu trúc dữ liệu theo đúng nghiệp vụ của mình.
    *   **Khả năng mở rộng độc lập (Independent Scaling):** Dịch vụ đặt vé (Booking) có tần suất ghi chép rất lớn, đòi hỏi cấu hình DB có IOPS (tốc độ đọc/ghi ổ đĩa) cao. Trong khi đó, dịch vụ thông báo (Notification) hoặc thông tin phim (Movie) chủ yếu là đọc. Chia DB giúp phân chia tài nguyên máy chủ hiệu quả hơn.
    *   **Tránh hiện tượng Single Point of Failure (SPOF):** Nếu một database bị sập, các phần khác của hệ thống (như tra cứu thông tin phim) vẫn hoạt động bình thường, không làm sập toàn bộ ứng dụng.

### 2.3. Event-Driven Architecture (EDA) & Publish-Subscribe (Pub/Sub) Pattern
*   **Vị trí áp dụng:** `services/booking-service` (Publisher) và `services/notification-service` (Subscriber) thông qua RabbitMQ.
*   **Mô tả:** Sau khi thanh toán vé thành công, hệ thống gửi email vé cho khách hàng bằng RabbitMQ bất đồng bộ.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tăng tốc độ phản hồi của hệ thống (Reduce Latency):** Việc gửi email chứa ảnh QR vé qua SMTP (Nodemailer) mất từ 2-5 giây. Nếu gọi đồng bộ (Synchronous), người dùng sẽ phải nhìn màn hình quay vòng chờ đợi. Bằng cách bắn tin nhắn vào RabbitMQ, Booking Service có thể hoàn tất giao dịch trong **vài mili-giây** và hiển thị màn hình thành công ngay lập tức.
    *   **Khả năng tự phục hồi (Fault Tolerance / Resilience):** Nếu máy chủ gửi mail bị lỗi hoặc Gmail từ chối kết nối tạm thời, tin nhắn vẫn nằm an toàn trong hàng đợi RabbitMQ (durable queue). Khi máy chủ email hoạt động trở lại, nó sẽ tự động tiêu thụ (consume) tin nhắn và gửi lại thư mà không làm mất thông tin vé của khách.

---

## 3. Các Mẫu Thiết Kế Khởi Tạo & Cấu Trúc (Creational & Structural Patterns)

### 3.1. Singleton Pattern
*   **Vị trí áp dụng:** Thực thể `sequelize` trong `models/index.js` của các service, Client Redis, và RabbitMQ Connection.
*   **Mô tả:** Chỉ khởi tạo duy nhất một đối tượng kết nối và tái sử dụng nó trên toàn ứng dụng.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Quản lý và tiết kiệm tài nguyên (Resource Optimization):** Việc khởi tạo kết nối cơ sở dữ liệu (Database Connection) hoặc kết nối TCP (Redis/RabbitMQ) tốn rất nhiều thời gian và CPU. Nếu mỗi request của khách hàng lại tạo một kết nối mới, server sẽ nhanh chóng bị cạn kiệt bộ nhớ (Connection Exhaustion) dẫn đến sập hệ thống.
    *   **Duy trì trạng thái kết nối tập trung:** Dễ dàng kiểm soát Connection Pool (tối đa bao nhiêu kết nối hoạt động đồng thời), giám sát hiệu năng truy vấn từ một thực thể duy nhất.

### 3.2. Factory Pattern
*   **Vị trí áp dụng:** Định nghĩa các model như `booking.js`, `booking_seat.js` nhận tham số đầu vào.
*   **Mô tả:** Các model là các Factory Function nhận đối tượng `sequelize` để khởi tạo.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tách biệt mối quan tâm (Separation of Concerns):** Giúp tách rời định nghĩa cấu trúc bảng (Schema Definition) ra khỏi instance kết nối thực tế.
    *   **Thuận tiện cho Unit Testing (Dễ Mocking):** Khi viết kiểm thử tự động, chúng ta có thể truyền vào một đối tượng DB giả lập (Mock Database connection) vào Factory Function này mà không cần kết nối thật đến SQL Server, giúp test chạy nhanh và độc lập.

### 3.3. Proxy Pattern (Reverse Proxy)
*   **Vị trí áp dụng:** File `/gateway/index.js` sử dụng `express-http-proxy`.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Đơn giản hóa giao tiếp phía Client:** Client React chỉ cần biết duy nhất một Endpoint là Gateway (ví dụ: `http://localhost:8080`). Không cần quan tâm hay lưu trữ danh sách IP/Port phức tạp của 6-7 service con khác nhau.
    *   **Che giấu chi tiết triển khai nội bộ:** Nếu thay đổi cấu trúc cổng (port) của các service ở backend (ví dụ chuyển `booking-service` từ port 4004 sang 5001), ta chỉ cần sửa cấu hình ở Gateway. Giao diện Client hoàn toàn không bị ảnh hưởng hay phải build lại.

---

## 4. Các Mẫu Thiết Kế Hành Vi (Behavioral Patterns)

### 4.1. Chain of Responsibility Pattern (Chuỗi Trách Nhiệm)
*   **Vị trí áp dụng:** Định tuyến Express.js và các middleware.
*   **Mô tả:** Request đi qua một chuỗi các middleware tuần tự xử lý.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tách biệt logic xử lý bổ trợ (Decoupling Cross-cutting Concerns):** Các logic như kiểm tra quyền admin, ghi log request, phân tích định dạng body dữ liệu... không nên viết chung với logic nghiệp vụ chính (như thêm phim, hủy vé). Thiết kế dạng chuỗi giúp ta dễ dàng thêm/bớt các bộ lọc (middleware) này mà không cần chỉnh sửa code của controller chính.
    *   **Dễ tái sử dụng:** Một middleware xác thực quyền admin có thể được áp dụng nhanh chóng cho hàng chục endpoint khác nhau chỉ bằng cách chèn nó vào trước controller trong router.

### 4.2. Fallback Pattern (Mẫu Thiết Kế Phòng Vệ/Dự Phòng)
*   **Vị trí áp dụng:** Logic xử lý gửi mail dự phòng bằng HTTP REST và khóa database dòng dự phòng khi Redis lỗi.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tối đa hóa tính sẵn sàng của hệ thống (Graceful Degradation):** RabbitMQ hay Redis là các hệ thống độc lập và hoàn toàn có thể bị sập do quá tải hoặc mất mạng. Nếu không có cơ chế Fallback, hệ thống đặt vé sẽ bị tê liệt hoàn toàn khi một trong hai dịch vụ này gặp sự cố. Việc dự phòng giúp hệ thống tự động hạ cấp tính năng một cách êm đẹp: tuy chậm hơn một chút (dùng HTTP REST hoặc DB Lock) nhưng vẫn đảm bảo khách mua được vé và nhận được email.

---

## 5. Các Mẫu Xử Lý Đồng Thời & Phân Tán (Concurrency & Distributed Patterns)

### 5.1. Distributed Lock Pattern (Khóa Phân Tán)
*   **Vị trí áp dụng:** Sử dụng Redis khóa ghế trong `bookingService.js` qua key `lock:showtime:${showtimeId}:seat:${seatId}`.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Ngăn chặn trùng lặp ghế (Double Booking) cực nhanh ở bộ nhớ tạm:** Khi có hàng chục ngàn người cùng tranh nhau vài chiếc ghế VIP của phim bom tấn, việc kiểm tra trực tiếp bằng Database truyền thống (SQL Server) sẽ tạo ra tải lượng cực lớn lên ổ đĩa, làm chậm toàn bộ hệ thống. Redis hoạt động trên RAM với tốc độ ghi chép cực nhanh (>100.000 requests/giây), giúp chặn ngay lập tức các yêu cầu trùng lặp ngay tại cửa ngõ trước khi chúng kịp chạm vào Database.
    *   **Cơ chế tự giải phóng (Timeout - TTL):** Nhờ cơ chế Key Expiry của Redis, nếu người dùng giữ ghế rồi bỏ đi (mất mạng, đóng trình duyệt), khóa sẽ tự giải phóng sau 2 phút để người khác chọn, giải phóng bộ nhớ đệm tự động mà không cần can thiệp thủ công.

### 5.2. Pessimistic Concurrency Control (Kiểm Soát Đồng Thời Bi Quan)
*   **Vị trí áp dụng:** Sequelize Transaction kết hợp `t.LOCK.UPDATE`.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Bảo vệ dữ liệu cốt lõi (Lớp phòng vệ cuối cùng):** Redis Lock là lớp bảo vệ tốc độ cao ở RAM, nhưng dữ liệu tài chính và vé bán ra bắt buộc phải lưu trữ bền vững (Persistent) trong SQL Server dưới dạng ACID. Việc sử dụng `LOCK.UPDATE` ngăn chặn hiện tượng "Race Condition" ở mức độ DB: Khi tiến trình đang kiểm tra và ghi vé cho User A, không có bất kỳ tiến trình nào khác có thể sửa dòng dữ liệu đó, đảm bảo tính toàn vẹn tuyệt đối cho doanh thu và vé bán ra.

---

## 6. Mẫu Thiết Kế Phía Client (Frontend Patterns)

### 6.1. Service/API Layer Pattern
*   **Vị trí áp dụng:** `frontend/src/services/api.js` cấu hình Axios instance.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Quản lý Endpoint tập trung:** Nếu URL API của server thay đổi, nhà phát triển chỉ cần cập nhật ở một file duy nhất `api.js` thay vì đi rà soát và sửa đổi ở hàng trăm Component React khác nhau.
    *   **Xử lý lỗi tập trung (Axios Interceptors):** Giúp bắt tất cả lỗi 401 (Hết phiên đăng nhập) để tự động xóa cookie/localstorage và đẩy user về trang đăng nhập một cách đồng bộ trên toàn ứng dụng.

### 6.2. Component-Based Architecture (Kiến Trúc Component)
*   **Vị trí áp dụng:** Thư mục `/frontend/src/components` và `/frontend/src/modules`.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Khả năng tái sử dụng giao diện:** Các thành phần như sơ đồ ghế, nút bấm, hay header được viết một lần và dùng ở nhiều trang (Trang chủ, trang đặt vé, trang quản trị).
    *   **Dễ bảo trì và kiểm thử:** Khi giao diện sơ đồ ghế lỗi, ta chỉ cần mở đúng component ghế để sửa mà không sợ làm ảnh hưởng đến logic hiển thị danh sách phim hay thông tin tài khoản.

---

## 7. Tổng Kết & Đánh Giá từ Giải Pháp

Việc hiểu rõ **tại sao** sử dụng từng pattern giúp đội ngũ phát triển không lạm dụng công nghệ (Over-engineering), mà tập trung giải quyết đúng các bài toán thực tế:
*   **Tốc độ & Chịu tải:** Được giải quyết bằng Redis Lock & Redis Cache.
*   **Trải nghiệm người dùng:** Được tối ưu bằng Pub/Sub RabbitMQ (gửi mail ngầm) và Component-based UI.
*   **Tính an toàn & Bảo mật:** Được bảo vệ bởi API Gateway JWT & DB Pessimistic Lock.
