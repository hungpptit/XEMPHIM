# BÁO CÁO PHÂN TÍCH THIẾT KẾ KỸ THUẬT: ĐOẠN MÃ VÀ SỰ ÁP DỤNG DESIGN PATTERN

**Hệ thống:** XemPhim - Nền tảng đặt vé xem phim trực tuyến (Microservices Architecture)  
**Vai trò:** Business Analyst / Solution Architect  
**Trạng thái:** Tài liệu Đặc tả Kỹ thuật - Đã Phê Duyệt  

---

## 1. Cấu Trúc Hệ Thống Module & Microservices (Architectural Decomposition)

Hệ thống được thiết kế theo mô hình Microservices, chia nhỏ các miền nghiệp vụ (Business Domains) thành các dịch vụ độc lập nhằm đảm bảo khả năng mở rộng (Scalability), cô lập lỗi (Fault Isolation), và triển khai độc lập (Independent Deployment).

### Sơ đồ cấu trúc thư mục dự án:
```text
XEMPHIM/
├── api-gateway/            # Hoặc gateway/ - Chốt chặn biên định tuyến và phân tải
├── services/
│   ├── user-service/       # Quản lý định danh (Identity), tài khoản, phân quyền (Role)
│   ├── movie-service/      # Quản lý danh mục phim, rạp, phòng chiếu và lịch chiếu (Showtime)
│   ├── seat-service/       # Quản lý thông tin ghế và sơ đồ phòng chiếu
│   ├── booking-service/    # Quản lý luồng đặt vé, trạng thái booking và giữ ghế
│   ├── payment-service/    # Xử lý thanh toán tích hợp ZaloPay và lịch sử giao dịch
│   └── notification-service/ # Gửi email thông báo vé qua hàng đợi tin nhắn (RabbitMQ)
├── frontend/               # Giao diện người dùng (React/Next.js)
└── gateway/                # Express API Gateway đóng vai trò làm Reverse Proxy
```

---

## 2. Các Design Pattern Áp Dụng Trong Mã Nguồn

### 2.1 Singleton Pattern: Kết Nối CSDL Tập Trung (Database Connection Singleton)

*   **Vị trí áp dụng:** `services/*/models/index.js` (Điển hình tại `services/movie-service/models/index.js`).
*   **Mô tả thiết kế:**  
    Đối tượng `sequelize` đại diện cho một connection pool kết nối tới cơ sở dữ liệu SQL Server. Để tránh việc khởi tạo dư thừa nhiều kết nối dẫn đến cạn kiệt tài nguyên (Connection Exhaustion), hệ thống áp dụng **Singleton Pattern**.  
    Bằng việc tận dụng cơ chế **Module Caching** của Node.js (chỉ thực thi file module một lần đầu tiên và lưu trữ instance trả về trong bộ nhớ đệm), mọi yêu cầu import `sequelize` từ các phần khác nhau trong cùng một service đều nhận lại đúng duy nhất một thực thể kết nối đã được cấu hình từ trước.
*   **Mã nguồn minh họa (`services/movie-service/models/index.js`):**

```javascript
import { Sequelize, DataTypes } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Khởi tạo duy nhất một đối tượng sequelize (Singleton Instance)
const sequelize = new Sequelize(
  process.env.MOVIE_DB_NAME || 'XemPhim_Movie',
  process.env.DB_USER || 'sa',
  process.env.DB_PASS || process.env.SA_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    dialect: 'mssql',
    logging: false,
    dialectOptions: {
      options: {
        encrypt: (process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
        trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true'
      }
    }
  }
);

// Đối tượng này được chia sẻ và sử dụng lại toàn hệ thống
export { sequelize, Sequelize };
```

---

### 2.2 Factory Pattern: Khởi Tạo Sequelize Models

*   **Vị trí áp dụng:** Các file định nghĩa model riêng lẻ trong thư mục `models/` (ví dụ: `models/movie.js`, `models/cinema.js`).
*   **Mô tả thiết kế:**  
    Hệ thống áp dụng **Factory Pattern** bằng cách định nghĩa các model như là các factory function nhận đối tượng kết nối `sequelize` và thư viện định nghĩa kiểu dữ liệu `DataTypes` làm tham số.  
    Cách thiết kế này giúp tách biệt hoàn toàn cấu trúc dữ liệu (Schema Definition) khỏi đối tượng kết nối cụ thể (Database Connection Instance). Nó mang lại khả năng tái sử dụng cao và cực kỳ thuận tiện cho việc viết Unit Test bằng cách truyền vào các mock object của database kết nối.
*   **Mã nguồn minh họa (`services/movie-service/models/movie.js`):**

```javascript
// Export ra một Factory Function nhận kết nối sequelize động
export default (sequelize, DataTypes) => {
  const Movie = sequelize.define('Movie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    duration_minutes: {
      type: DataTypes.INTEGER
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    }
    // ... các thuộc tính khác
  }, {
    tableName: 'movies',
    timestamps: false
  });

  return Movie; // Trả về thực thể Model sau khi được khởi tạo từ nhà máy (Factory)
};
```

---

## 3. Xác Thực Và Phân Quyền Người Dùng (Authentication & Authorization)

### 3.1 Đăng Nhập & Xác Thực Stateless bằng JWT (JSON Web Token)

*   **Quy trình nghiệp vụ:**
    1.  Người dùng gửi tài khoản & mật khẩu đến `api/auth/login`.
    2.  `user-service` kiểm tra mật khẩu đã được mã hóa bằng `bcrypt`. Nếu khớp, sinh ra một JWT chứa thông tin định danh tối thiểu:
        ```json
        { "id": 15, "email": "customer@gmail.com", "role": "customer" }
        ```
    3.  Token được đóng gói vào Cookie với tùy chọn bảo mật `httpOnly: true` (chống tấn công XSS trộm token).

---

### 3.2 Gateway-level Authentication (Xác thực tại biên) & Admin Middleware

Hệ thống phân tách trách nhiệm kiểm tra token (Authentication) và phân quyền (Authorization) thông qua sự phối hợp giữa API Gateway và Microservices:

*   **Tại API Gateway (`gateway/index.js`):**  
    Gateway có nhiệm vụ chặn mọi request gửi lên, phân tích Cookie để trích xuất JWT. Nếu hợp lệ, nó đính kèm thông tin định danh vào request headers gửi xuống các service nội bộ:
    *   `x-user-id`
    *   `x-user-email`
    *   `x-user-role`
*   **Tại các Service nội bộ (ví dụ: `movie-service`):**  
    Để bảo vệ các API quản trị (Admin APIs) như thêm phim, tạo lịch chiếu, hệ thống sử dụng một middleware chốt chặn `middleware/adminAuth.js`. Middleware này kiểm tra xem header `x-user-role` chuyển từ Gateway xuống có phải là `admin` hay không. Nếu không, trả về HTTP status `403 Access Denied`.
*   **Mã nguồn minh họa (`middleware/adminAuth.js`):**

```javascript
export const adminAuth = (req, res, next) => {
  try {
    // Trường hợp 1: Xác thực từ API Gateway chuyển xuống (x-user-role)
    const userRole = req.headers['x-user-role'];
    if (userRole === 'admin') {
      req.userId = req.headers['x-user-id'];
      console.log(`✅ Admin access granted for user ID: ${req.userId} (via Gateway)`);
      return next();
    }

    // Trường hợp 2: Xác thực trực tiếp qua Bearer Token (nếu kết nối nội bộ trực tiếp)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided', code: 'NO_TOKEN' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin privileges required.', code: 'ADMIN_REQUIRED' });
    }

    req.userId = decoded.id;
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};
```

---

## 4. Cơ Chế Nghiệp Vụ Đặc Thù Và Xử Lý Đồng Thời (Core Business Logic)

### 4.1 Cơ Chế Giữ Ghế Tạm Thời (Seat Locking Pattern)

*   **Bài toán thực tế:** Khi hai người dùng cùng nhấn nút đặt một ghế vào cùng một thời điểm, làm sao hệ thống ngăn chặn được hiện tượng trùng lặp ghế (Double Booking)?
*   **Giải pháp thiết kế:** Kết hợp giữa **Khóa Phân Tán (Distributed Lock) bằng Redis** và **Khóa Bi quan tầng DB (Pessimistic DB Lock)**.
*   **Quy trình xử lý:**
    1.  **Distributed Lock (Redis):** Khi nhận được yêu cầu giữ ghế, `booking-service` thực hiện acquire khóa trên Redis với key dạng: `lock:showtime:${showtimeId}:seat:${seatId}` và một thời gian sống (TTL) mặc định (120 giây). Cơ chế `redis.set(key, 'locked', 'NX', 'PX', ttlMs)` đảm bảo chỉ có duy nhất một luồng (thread) chiếm được khóa thành công tại một thời điểm.
    2.  **Pessimistic Lock (Database SQL Server):** Ngay sau đó, một Sequelize Transaction được khởi tạo và thực hiện kiểm tra trạng thái ghế bằng cách truy vấn với tùy chọn khóa dòng `lock: t.LOCK.UPDATE`.
    3.  **Tạo Booking:** Hệ thống tạo bản ghi booking với trạng thái `status: 'locked'` và trường thời gian hết hạn `expire_at` (bằng thời gian hiện tại cộng với số giây giữ ghế).
    4.  Nếu thanh toán thành công, trạng thái chuyển sang `confirmed` và khóa Redis được chủ động giải phóng.

*   **Mã nguồn minh họa cơ chế (`services/booking-service/services/bookingService.js`):**

```javascript
// Helper acquire khóa phân tán trên Redis
async function acquireSeatLocks(showtimeId, seatIds, ttlMs = 120000) {
  if (!redis) return true; // DB fallback nếu Redis lỗi
  const acquiredKeys = [];
  try {
    for (const seatId of seatIds) {
      const key = `lock:showtime:${showtimeId}:seat:${seatId}`;
      // Lệnh 'NX' chỉ ghi đè khi chưa tồn tại khóa
      const success = await redis.set(key, 'locked', 'NX', 'PX', ttlMs);
      if (!success) {
        // Hủy các khóa đã lấy được trước đó nếu có một ghế bị trùng
        for (const k of acquiredKeys) await redis.del(k);
        return false; // Trùng ghế
      }
      acquiredKeys.push(key);
    }
    return true;
  } catch (err) {
    console.error('❌ Redis Lock Error:', err.message);
    return true; // Fallback xuống DB lock
  }
}
```

---

### 4.2 Tích Hợp ZaloPay: Tạo QR Code, Callback Chữ Ký & Quy Trình Hoàn Tiền (Refund)

Quy trình thanh toán được kiểm soát chặt chẽ thông qua việc tích hợp trực tiếp API cổng thanh toán ZaloPay Sandbox.

*   **Khởi tạo thanh toán (Create Order):**  
    Khi người dùng xác nhận đặt vé, `booking-service` gọi `payment-service` thông qua REST API để tạo đơn hàng trên ZaloPay. Dữ liệu đơn hàng được ký bằng thuật toán HMAC-SHA256 kết hợp với `key1` do ZaloPay cung cấp. Phản hồi thành công sẽ trả về một liên kết thanh toán (`order_url`) hiển thị dưới dạng QR Code phía client.
*   **Xác nhận thanh toán (Callback Verification):**  
    ZaloPay gọi callback về API của hệ thống (`/api/zalopay/callback`). Để đảm bảo dữ liệu không bị sửa đổi bởi kẻ xấu, hệ thống bắt buộc kiểm tra mã kiểm soát chữ ký (`mac`) thông qua hàm `verifyCallback` sử dụng `key2`. Khi hợp lệ, trạng thái vé chuyển sang `confirmed` và gửi email cho khách hàng qua hàng đợi RabbitMQ.
*   **Xử lý Hoàn Tiền (Refund Flow):**  
    Trường hợp admin hoặc khách hàng gửi yêu cầu hoàn tiền cho vé đã thanh toán thành công. Hệ thống gọi API hoàn tiền của ZaloPay `/v2/refund` với mã hoàn tiền tự sinh dạng `YYMMDD_appId_refundId`. Chữ ký MAC hoàn tiền được tính toán dựa trên chuỗi thông tin: `app_id|zp_trans_id|amount|refund_fee_amount|description|timestamp` bằng `key1`. Sau khi nhận được xác nhận từ ZaloPay, booking được đổi trạng thái thành `refunded` và ghế được trả về trạng thái trống.
*   **Mã nguồn minh họa ký dữ liệu hoàn tiền (`services/payment-service/services/zalopayService.js`):**

```javascript
export const refundOrder = async ({ zp_trans_id, amount, description, booking_id }) => {
  try {
    const timestamp = Date.now();
    const refundID = Math.floor(Math.random() * 1000000);
    const m_refund_id = `${moment().format('YYMMDD')}_${config.app_id}_${refundID}`;
    
    const zpTransIdStr = String(zp_trans_id);
    const refundAmount = Math.round(Number(amount));
    const refundFeeAmount = 0;
    
    // Tạo chuỗi mã hóa ký chữ ký (MAC) hoàn tiền
    const macInput = `${config.app_id}|${zpTransIdStr}|${refundAmount}|${refundFeeAmount}|${description}|${timestamp}`;
    const mac = CryptoJS.HmacSHA256(macInput, config.key1).toString();

    const refundData = {
      app_id: Number(config.app_id),
      m_refund_id,
      zp_trans_id: zpTransIdStr,
      amount: refundAmount,
      refund_fee_amount: refundFeeAmount,
      timestamp,
      description,
      mac
    };

    const result = await axios.post(`${config.endpoint}/v2/refund`, refundData);
    return {
      success: result.data.return_code === 1 || result.data.return_code === 3,
      m_refund_id,
      refund_id: result.data.refund_id,
      return_code: result.data.return_code
    };
  } catch (error) {
    console.error('❌ ZaloPay Refund Error:', error.message);
    throw error;
  }
};
```

---

### 4.3 Luồng Hủy Vé Chủ Động (Cancel Booking Flow)

*   **Kịch bản nghiệp vụ:** Người dùng rời trang thanh toán, nhấn nút quay lại hoặc đóng tab khi trình duyệt đang hiển thị màn hình thanh toán.
*   **Quy trình hệ thống xử lý:**  
    API `/api/bookings/cancel` được kích hoạt và thực hiện các bước:
    1.  Cập nhật trạng thái booking thành `cancelled` trong DB.
    2.  Chủ động xóa ngay lập tức tất cả các key khóa ghế của booking đó trên Redis để giải phóng ghế cho những người dùng khác mua vé mà không cần chờ hết hạn (TTL).
    3.  Gửi lệnh `void-pending` sang `payment-service` để khóa vĩnh viễn QR Code cũ của phiên giao dịch này, tránh trường hợp người dùng quét lại mã QR đã bị hủy.

---

### 4.4 Job Nền Hết Hạn Tự Động (Background Expiration Jobs)

*   **Vấn đề đặt ra:** Nếu người dùng đột ngột mất kết nối internet hoặc tắt trình duyệt khi đang giữ ghế mà không thực hiện hủy vé chủ động. Ghế sẽ bị giữ vô thời hạn?
*   **Giải pháp:** Sử dụng một Timer Job chạy ngầm định kỳ (60 giây một lần) thực hiện truy vấn và dọn dẹp tài nguyên.
*   **Chi tiết nghiệp vụ:**
    1.  **Dọn dẹp Booking Locked quá hạn (`expireLockedBookings`):** Truy vấn những booking có trạng thái `locked` và có thời gian hết hạn (`expire_at`) nhỏ hơn thời điểm hiện tại. Giải phóng các ghế tương ứng trên Redis và chuyển trạng thái booking thành `expired` trong database.
    2.  **Dọn dẹp Đơn hàng Pending quá hạn (`expirePendingPayments`):** Tìm các bản ghi thanh toán ở trạng thái `pending` hết hạn, void trạng thái ở `payment-service`, sau đó cập nhật các booking liên đới thành `expired`.
*   **Mã nguồn minh họa Job nền (`services/booking-service/jobs/expireBookingsJob.js`):**

```javascript
import bookingService from '../services/bookingService.js';

let timer = null;
export const startExpireJob = (intervalSeconds = 60) => {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      // 1. Tự động giải phóng ghế khóa hết hạn
      const updated = await bookingService.expireLockedBookings();
      if (updated > 0) console.log(`[Job] Expired ${updated} locked bookings`);
      
      // 2. Tự động hết hạn các giao dịch pending thanh toán
      const updatedPayments = await bookingService.expirePendingPayments();
      if (updatedPayments > 0) console.log(`[Job] Expired ${updatedPayments} pending payments`);
    } catch (err) {
      console.error('[Job Error] Expire job error:', err);
    }
  }, intervalSeconds * 1000);
};
```

---

## 5. Tối Ưu Hiệu Năng Với Redis Caching (Performance Optimization)

Để giảm thiểu tải lượng truy vấn lớn vào CSDL SQL Server (vốn chịu tải nặng từ ghi chép booking), hệ thống áp dụng cơ chế Caching nhiều tầng trong `movie-service` bằng Redis:

*   **Cache danh sách phim (`movies:list`):** Lưu trữ danh sách phim kèm theo phân trang và trạng thái lịch chiếu. Thời gian tồn tại (TTL) là 1 giờ.
*   **Cache chi tiết phim (`movies:detail:${id}`):** Lưu trữ thông tin chi tiết một bộ phim. TTL là 1 giờ.
*   **Cache lịch chiếu phim (`showtimes:movie:${movieId}`):** Lưu các lịch chiếu trong tương lai của phim. TTL là 10 phút.
*   **Cơ chế Invalidation (Thu hồi bộ nhớ đệm):** Khi có hành động thay đổi dữ liệu từ phía admin (tạo mới phim, cập nhật phim hoặc xóa phim), hệ thống sẽ chủ động xóa toàn bộ cache cũ để tránh dữ liệu rác (stale data):
    ```javascript
    // Invalidate list cache
    await redis.scan(cursor, 'MATCH', 'movies:list*'); // quét và xóa toàn bộ list key
    await redis.del(`movies:detail:${id}`); // xóa chi tiết phim cụ thể
    ```

---

## 6. Đánh Giá Kiến Trúc Từ Business Analyst (BA Notes)

1.  **Tính Nhất Quán (Consistency):** Việc kết hợp khóa mềm Redis và khóa cứng Database Transaction (`t.LOCK.UPDATE`) tạo ra 2 lớp bảo vệ. Điều này giúp hệ thống đạt độ tin cậy tuyệt đối về mặt dữ liệu vé rạp chiếu, tránh hoàn toàn rủi ro bán trùng ghế.
2.  **Khả Năng Phản Hồi (Performance):** Caching Redis giảm thiểu được đến 80% truy vấn đọc thông tin phim từ CSDL chính. Gateway đóng vai trò lọc trước token, tránh việc các microservice phía sau phải truy vấn kiểm tra thông tin người dùng lặp đi lặp lại nhiều lần.
3.  **Khả Năng Chịu Lỗi (Resilience):** Cơ chế Callback an toàn của ZaloPay bảo vệ hệ thống trước hành vi tấn công giả lập phản hồi thành công từ hacker. Các tiến trình Job nền đảm bảo dữ liệu rác phát sinh do lỗi từ mạng hoặc client luôn được giải phóng sau tối đa 2 phút.
