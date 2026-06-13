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
                                                     ## 2. Các Mẫu Thiết Kế Kiến Trúc (Architectural Patterns)

### 2.1. API Gateway Pattern
*   **Vị trí áp dụng:** File `/gateway/index.js`
*   **Mô tả:** Đóng vai trò là chốt chặn (Entry Point) duy nhất tiếp nhận request từ Client, thực hiện định tuyến và xác thực tập trung.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Giải quyết vấn đề trùng lặp code:** Nếu không có Gateway, mỗi microservice (User, Movie, Booking...) đều phải tự cấu hình logic để giải mã (verify) JWT, dẫn đến trùng lặp mã nguồn cực kỳ lớn và khó bảo trì khóa bí mật (`JWT_SECRET`).
    *   **Bảo mật & Giảm thiểu phơi nhiễm:** Giúp ẩn đi toàn bộ các port và địa chỉ IP thật của các service con. Client chỉ giao tiếp qua Gateway, hạn chế tối đa nguy cơ bị tấn công trực tiếp vào cơ sở dữ liệu hoặc logic nghiệp vụ bên trong.
    *   **Quản lý CORS tập trung:** Tránh việc phải cấu hình CORS thủ công ở từng dịch vụ nhỏ.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Sử dụng thư viện `express-http-proxy` để định hướng request.
    *   Trích xuất token JWT từ cookie và đính kèm danh tính qua các header `x-user-id`, `x-user-role` chuyển tiếp.
    ```javascript
    // gateway/index.js
    import proxy from 'express-http-proxy';

    // 1. JWT Authentication Middleware
    app.use((req, res, next) => {
      const token = req.cookies?.access_token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.headers['x-user-id'] = String(decoded.id);
          req.headers['x-user-role'] = String(decoded.role || 'user');
        } catch (err) { /* ... */ }
      }
      next();
    });

    // 2. Reverse Proxy Routing
    app.use('/api/movies', proxy(MOVIE_SERVICE, proxyOptions));
    app.use('/api/bookings', proxy(BOOKING_SERVICE, proxyOptions));
    ```

### 2.2. Database per Service Pattern
*   **Vị trí áp dụng:** Cấu hình môi trường `/ .env`
*   **Mô tả:** Mỗi service sở hữu một database context độc lập nhằm đảm bảo tính độc lập tuyệt đối (Loose Coupling).
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Đảm bảo tính độc lập tuyệt đối (Loose Coupling):** Nếu dùng chung 1 database lớn, một thay đổi schema bảng ở `movie-service` có thể làm crash toàn bộ `booking-service` hoặc `payment-service`. Chia database riêng biệt giúp mỗi service tự do tối ưu hóa cấu trúc dữ liệu theo đúng nghiệp vụ của mình.
    *   **Khả năng mở rộng độc lập (Independent Scaling):** Dịch vụ đặt vé (Booking) có tần suất ghi chép rất lớn, đòi hỏi cấu hình DB có IOPS (tốc độ đọc/ghi ổ đĩa) cao. Trong khi đó, dịch vụ thông báo (Notification) hoặc thông tin phim (Movie) chủ yếu là đọc. Chia DB giúp phân chia tài nguyên máy chủ hiệu quả hơn.
    *   **Tránh hiện tượng Single Point of Failure (SPOF):** Nếu một database bị sập, các phần khác của hệ thống (như tra cứu thông tin phim) vẫn hoạt động bình thường, không làm sập toàn bộ ứng dụng.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Khai báo các tên database hoàn toàn khác biệt cho từng service con.
    ```env
    # Cấu hình DB riêng biệt trong file .env ở thư mục gốc
    USER_DB_NAME=XemPhim_User
    MOVIE_DB_NAME=XemPhim_Movie
    SEAT_DB_NAME=XemPhim_Seat
    BOOKING_DB_NAME=XemPhim_Booking
    PAYMENT_DB_NAME=XemPhim_Payment
    ```

### 2.3. Event-Driven Architecture (EDA) & Publish-Subscribe Pattern
*   **Vị trí áp dụng:** `services/booking-service` (Publisher) và `services/notification-service` (Subscriber/Consumer) qua RabbitMQ.
*   **Mô tả:** Sau khi thanh toán vé thành công, Booking Service đẩy event vào hàng đợi để Notification Service tiêu thụ bất đồng bộ (gửi email/mã QR).
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tăng tốc độ phản hồi của hệ thống (Reduce Latency):** Việc gửi email chứa ảnh QR vé qua SMTP (Nodemailer) mất từ 2-5 giây. Nếu gọi đồng bộ (Synchronous), người dùng sẽ phải nhìn màn hình quay vòng chờ đợi. Bằng cách bắn tin nhắn vào RabbitMQ, Booking Service có thể hoàn tất giao dịch trong **vài mili-giây** và hiển thị màn hình thành công ngay lập tức.
    *   **Khả năng tự phục hồi (Fault Tolerance / Resilience):** Nếu máy chủ gửi mail bị lỗi hoặc Gmail từ chối kết nối tạm thời, tin nhắn vẫn nằm an toàn trong hàng đợi RabbitMQ (durable queue). Khi máy chủ email hoạt động trở lại, nó sẽ tự động tiêu thụ (consume) tin nhắn và gửi lại thư mà không làm mất thông tin vé của khách.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Sử dụng thư viện `amqplib` với các API `connect`, `createChannel`, `assertQueue`, `sendToQueue` và `consume`.
    ```javascript
    // NƠI PHÁT (services/booking-service/services/bookingService.js)
    import amqp from 'amqplib';
    const conn = await amqp.connect(mqUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue('ticket.notifications', { durable: true });
    channel.sendToQueue('ticket.notifications', Buffer.from(JSON.stringify(msg)), { persistent: true });

    // NƠI THU (services/notification-service/consumer.js)
    import amqp from 'amqplib';
    const conn = await amqp.connect(mqUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue('ticket.notifications', { durable: true });
    channel.consume('ticket.notifications', async (msg) => {
      const payload = JSON.parse(msg.content.toString());
      await sendTicketEmail(payload); // Xử lý gửi email
      channel.ack(msg);
    });
    ```

---

## 3. Các Mẫu Thiết Kế Khởi Tạo & Cấu Trúc (Creational & Structural Patterns)

### 3.1. Singleton Pattern
*   **Vị trí áp dụng:** Các tệp tin `models/index.js` của các service (ví dụ: `/services/booking-service/models/index.js`).
*   **Mô tả:** Chỉ khởi tạo duy nhất một đối tượng kết nối `Sequelize` và tái sử dụng nó toàn cục nhằm tiết kiệm tài nguyên kết nối (Connection Pool).
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Quản lý và tiết kiệm tài nguyên (Resource Optimization):** Việc khởi tạo kết nối cơ sở dữ liệu (Database Connection) hoặc kết nối TCP (Redis/RabbitMQ) tốn rất nhiều thời gian và CPU. Nếu mỗi request của khách hàng lại tạo một kết nối mới, server sẽ nhanh chóng bị cạn kiệt bộ nhớ (Connection Exhaustion) dẫn đến sập hệ thống.
    *   **Duy trì trạng thái kết nối tập trung:** Dễ dàng kiểm soát Connection Pool (tối đa bao nhiêu kết nối hoạt động đồng thời), giám sát hiệu năng truy vấn từ một thực thể duy nhất.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Một instance `new Sequelize(...)` được khởi tạo duy nhất một lần và export trực tiếp để các module khác import dùng chung.
    ```javascript
    // services/booking-service/models/index.js
    const sequelize = new Sequelize(
      process.env.BOOKING_DB_NAME || 'XemPhim_Booking',
      process.env.DB_USER || 'sa',
      process.env.DB_PASS || '123',
      { dialect: 'mssql', /* ... */ }
    );
    export { sequelize }; // Xuất ra đối tượng đơn nhất (Singleton)
    ```

### 3.2. Factory Pattern
*   **Vị trí áp dụng:** Các tệp định nghĩa model cơ sở dữ liệu (ví dụ: `/services/booking-service/models/booking.js`).
*   **Mô tả:** Định nghĩa model dưới dạng một Factory Function nhận kết nối `sequelize` để khởi tạo.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tách biệt mối quan tâm (Separation of Concerns):** Giúp tách rời định nghĩa cấu trúc bảng (Schema Definition) ra khỏi instance kết nối thực tế.
    *   **Thuận tiện cho Unit Testing (Dễ Mocking):** Khi viết kiểm thử tự động, chúng ta có thể truyền vào một đối tượng DB giả lập (Mock Database connection) vào Factory Function này mà không cần kết nối thật đến SQL Server, giúp test chạy nhanh và độc lập.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Export mặc định một hàm nhận `(sequelize, DataTypes)` và trả ra model định nghĩa.
    ```javascript
    // services/booking-service/models/booking.js
    export default (sequelize, DataTypes) => {
      const Booking = sequelize.define('Booking', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        booking_code: { type: DataTypes.STRING(100), allowNull: false },
        total_price: { type: DataTypes.DECIMAL, allowNull: false }
      }, { tableName: 'bookings', timestamps: false });

      return Booking; // Trả ra sản phẩm được "sản xuất"
    };
    ```

### 3.3. Proxy Pattern (Reverse Proxy)
*   **Vị trí áp dụng:** File `/gateway/index.js`
*   **Mô tả:** API Gateway hoạt động như một Proxy trung gian che giấu cấu trúc port thật của các microservices bên dưới.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Đơn giản hóa giao tiếp phía Client:** Client React chỉ cần biết duy nhất một Endpoint là Gateway (ví dụ: `http://localhost:8080`). Không cần quan tâm hay lưu trữ danh sách IP/Port phức tạp của 6-7 service con khác nhau.
    *   **Che giấu chi tiết triển khai nội bộ:** Nếu thay đổi cấu trúc cổng (port) của các service ở backend (ví dụ chuyển `booking-service` từ port 4004 sang 5001), ta chỉ cần sửa cấu hình ở Gateway. Giao diện Client hoàn toàn không bị ảnh hưởng hay phải build lại.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Client gọi qua Gateway URL `http://localhost:8080/api/bookings`, Gateway tự động chuyển tiếp request đến `http://localhost:4004`.
    ```javascript
    // gateway/index.js
    const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';
    app.use('/api/bookings', proxy(BOOKING_SERVICE, proxyOptions));
    ```

---

## 4. Các Mẫu Thiết Kế Hành Vi (Behavioral Patterns)

### 4.1. Chain of Responsibility Pattern (Chuỗi Trách Nhiệm)
*   **Vị trí áp dụng:** Khai báo tuyến đường (Routes) kết hợp các middleware trong Express.js.
*   **Mô tả:** Request đi qua một chuỗi các middleware (các mắt xích) xử lý lần lượt trước khi đến controller chính.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tách biệt logic xử lý bổ trợ (Decoupling Cross-cutting Concerns):** Các logic như kiểm tra quyền admin, ghi log request, phân tích định dạng body dữ liệu... không nên viết chung với logic nghiệp vụ chính (như thêm phim, hủy vé). Thiết kế dạng chuỗi giúp ta dễ dàng thêm/bớt các bộ lọc (middleware) này mà không cần chỉnh sửa code của controller chính.
    *   **Dễ tái sử dụng:** Một middleware xác thực quyền admin có thể được áp dụng nhanh chóng cho hàng chục endpoint khác nhau chỉ bằng cách chèn nó vào trước controller trong router.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Khai báo chuỗi các hàm middleware đứng trước Controller trong các file Router.
    ```javascript
    // services/movie-service/routes/movieRoutes.js (Ví dụ minh họa cấu trúc)
    // Request đi qua verifyToken -> verifyAdmin rồi mới tới createMovie
    router.post('/admin/movies', verifyToken, verifyAdmin, createMovie);
    ```

### 4.2. Fallback Pattern (Mẫu Thiết Kế Phòng Vệ/Dự Phòng)
*   **Vị trí áp dụng:** Logic xử lý gửi mail và khóa ghế trong `/services/booking-service/services/bookingService.js`.
*   **Mô tả:** Khi RabbitMQ hoặc Redis gặp sự cố, hệ thống tự động bắt lỗi và chuyển hướng sang logic thay thế (gửi HTTP API trực tiếp hoặc dùng khóa DB thông thường) để tránh sập tính năng.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Tối đa hóa tính sẵn sàng của hệ thống (Graceful Degradation):** RabbitMQ hay Redis là các hệ thống độc lập và hoàn toàn có thể bị sập do quá tải hoặc mất mạng. Nếu không có cơ chế Fallback, hệ thống đặt vé sẽ bị tê liệt hoàn toàn khi một trong hai dịch vụ này gặp sự cố. Việc dự phòng giúp hệ thống tự động hạ cấp tính năng một cách êm đẹp: tuy chậm hơn một chút (dùng HTTP REST hoặc DB Lock) nhưng vẫn đảm bảo khách mua được vé và nhận được email.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Các khối `try...catch` gọi dịch vụ ngoài và có khối `catch` thực hiện gửi dự phòng.
    ```javascript
    // services/booking-service/services/bookingService.js
    async function publishNotification(msg) {
      try {
        const conn = await amqp.connect(mqUrl); // Thử dùng RabbitMQ
        // ...
      } catch (err) {
        console.log('🔄 [RabbitMQ Fallback] Gặp lỗi, kích hoạt gửi HTTP trực tiếp...');
        await sendNotificationViaHttp(msg); // Logic dự phòng (Fallback)
      }
    }
    ```

---

## 5. Các Mẫu Xử Lý Đồng Thời & Phân Tán (Concurrency & Distributed Patterns)

### 5.1. Distributed Lock Pattern (Khóa Phân Tán)
*   **Vị trí áp dụng:** Khóa ghế ngồi giữ chỗ trong `/services/booking-service/services/bookingService.js`.
*   **Mô tả:** Sử dụng Redis làm bộ lưu trữ tập trung khóa ghế theo thời gian thực để chặn hoàn toàn trùng lặp ghế ở RAM cực nhanh trước khi ghi DB.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Ngăn chặn trùng lặp ghế (Double Booking) cực nhanh ở bộ nhớ tạm:** Khi có hàng chục ngàn người cùng tranh nhau vài chiếc ghế VIP của phim bom tấn, việc kiểm tra trực tiếp bằng Database truyền thống (SQL Server) sẽ tạo ra tải lượng cực lớn lên ổ đĩa, làm chậm toàn bộ hệ thống. Redis hoạt động trên RAM với tốc độ ghi chép cực nhanh (>100.000 requests/giây), giúp chặn ngay lập tức các yêu cầu trùng lặp ngay tại cửa ngõ trước khi chúng kịp chạm vào Database.
    *   **Cơ chế tự giải phóng (Timeout - TTL):** Nhờ cơ chế Key Expiry của Redis, nếu người dùng giữ ghế rồi bỏ đi (mất mạng, đóng trình duyệt), khóa sẽ tự giải phóng sau 2 phút để người khác chọn, giải phóng bộ nhớ đệm tự động mà không cần can thiệp thủ công.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Sử dụng cờ `'NX'` (chỉ đặt nếu chưa tồn tại) và `'PX'` (thời gian sống khóa) của Redis.
    ```javascript
    // services/booking-service/services/bookingService.js
    async function acquireSeatLocks(showtimeId, seatIds, ttlMs = 120000) {
      // ...
      const key = `lock:showtime:${showtimeId}:seat:${seatId}`;
      const success = await redis.set(key, 'locked', 'NX', 'PX', ttlMs);
      // ...
    }
    ```

### 5.2. Pessimistic Concurrency Control (Kiểm Soát Đồng Thời Bi Quan)
*   **Vị trí áp dụng:** Sequelize Transaction kết hợp `t.LOCK.UPDATE` trong các hàm đặt vé / cập nhật trạng thái thanh toán.
*   **Mô tả:** Sử dụng khóa dòng mức cơ sở dữ liệu (`WITH (UPDLOCK, ROWLOCK)`) để ngăn Race Condition tuyệt đối khi thanh toán và giữ chỗ.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Bảo vệ dữ liệu cốt lõi (Lớp phòng vệ cuối cùng):** Redis Lock là lớp bảo vệ tốc độ cao ở RAM, nhưng dữ liệu tài chính và vé bán ra bắt buộc phải lưu trữ bền vững (Persistent) trong SQL Server dưới dạng ACID. Việc sử dụng `LOCK.UPDATE` ngăn chặn hiện tượng "Race Condition" ở mức độ DB: Khi tiến trình đang kiểm tra và ghi vé cho User A, không có bất kỳ tiến trình nào khác có thể sửa dòng dữ liệu đó, đảm bảo tính toàn vẹn tuyệt đối cho doanh thu và vé bán ra.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Tùy chọn `lock: t.LOCK.UPDATE` trong các câu lệnh truy vấn của Sequelize.
    ```javascript
    // services/booking-service/services/bookingService.js
    const booking = await Booking.findByPk(booking_id, {
      transaction: t,
      lock: t.LOCK.UPDATE // <-- Khóa bi quan
    });
    ```

---

## 6. Mẫu Thiết Kế Phía Client (Frontend Patterns)

### 6.1. Service/API Layer Pattern
*   **Vị trí áp dụng:** File `/frontend/src/services/api.js` cấu hình Axios instance.
*   **Mô tả:** Đóng gói toàn bộ các endpoint gọi API vào một lớp dịch vụ tập trung để dễ quản lý URL và bắt lỗi tập trung (Axios Interceptors).
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Quản lý Endpoint tập trung:** Nếu URL API của server thay đổi, nhà phát triển chỉ cần cập nhật ở một file duy nhất `api.js` thay vì đi rà soát và sửa đổi ở hàng trăm Component React khác nhau.
    *   **Xử lý lỗi tập trung (Axios Interceptors):** Giúp bắt tất cả lỗi 401 (Hết phiên đăng nhập) để tự động xóa cookie/localstorage và đẩy user về trang đăng nhập một cách đồng bộ trên toàn ứng dụng.
*   **Minh chứng code & Dấu hiệu nhận biết:**
    *   Sử dụng `axios.create` và thiết lập các đối tượng API như `authAPI`, `moviesAPI`, `bookingAPI`.
    *   Sử dụng `interceptors` bắt lỗi 401 tự động redirect về trang `/login`.
    ```javascript
    // frontend/src/services/api.js
    const API = axios.create({
      baseURL: 'http://localhost:8080/api',
      withCredentials: true
    });

    API.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          window.location.href = '/login'; // Bắt lỗi 401 tập trung
        }
        return Promise.reject(error);
      }
    );

    export const bookingAPI = {
      lockSeats: (bookingData) => API.post('/bookings/lock-seat', bookingData),
      confirmPayment: (bookingId, paymentData) => API.post(`/bookings/${bookingId}/confirm-payment`, paymentData),
    };
    ```

### 6.2. Component-Based Architecture (Kiến Trúc Component)
*   **Vị trí áp dụng:** Thư mục `/frontend/src/components` và `/frontend/src/modules`.
*   **Mô tả:** Giao diện được xé nhỏ thành các khối độc lập (SeatMap, Header, MovieCard) giúp tái sử dụng mã nguồn và dễ bảo trì.
*   **Tại sao lại dùng? (Lý do & Lợi ích):**
    *   **Khả năng tái sử dụng giao diện:** Các thành phần như sơ đồ ghế, nút bấm, hay header được viết một lần và dùng ở nhiều trang (Trang chủ, trang đặt vé, trang quản trị).
    *   **Dễ bảo trì và kiểm thử:** Khi giao diện sơ đồ ghế lỗi, ta chỉ cần mở đúng component ghế để sửa mà không sợ làm ảnh hưởng đến logic hiển thị danh sách phim hay thông tin tài khoản.

---

## 7. Tổng Kết & Đánh Giá từ Giải Pháp

Việc phân cấp các mẫu từ mức độ **Kiến trúc vĩ mô (Architectural Patterns)** xuống đến các **Mẫu thiết kế vi mô (Design Patterns & Concurrency)** giúp hệ thống XemPhim đạt được sự cân bằng tối đa giữa tính ổn định dữ liệu và tốc độ chịu tải của hệ thống. Đây là một mô hình thực tế tiêu chuẩn thường gặp trong các buổi đánh giá kiến trúc phần mềm và phỏng vấn chuyên sâu.
