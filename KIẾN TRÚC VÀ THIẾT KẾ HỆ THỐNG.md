<a name="_ty36njwgskp2"></a>CHƯƠNG 1

**DANH SÁCH NHIỆM VỤ - CHƯƠNG 1: XÁC ĐỊNH YÊU CẦU HỆ THỐNG**

**1.1. GIỚI THIỆU ĐỀ TÀI & MỤC TIÊU**

- ` `Viết lý do chọn đề tài (nhu cầu thị trường, lợi ích)
- ` `Liệt kê các mục tiêu chính của hệ thống
- ` `Mô tả nhanh tính năng kính

**1.2. HIỆN TRẠNG VÀ YÊU CẦU**

- ` `Phân tích hiện trạng quản lý rạp phim truyền thống
- ` `Liệt kê các vấn đề hiện tại (xung đột ghế, quản lý khó khăn, v.v.)
- ` `Xác định yêu cầu cụ thể của hệ thống mới

**1.3 Mô tả yêu cầu hệ thống**

- ` `**Yêu cầu chức năng - Khách hàng:** Đăng ký, đăng nhập, xem phim, chọn ghế, đặt vé, thanh toán, xem vé, hủy vé, yêu cầu hoàn tiền
- ` `**Yêu cầu chức năng - Quản trị viên (Admin):** Quản lý phim, rạp, suất chiếu, người dùng, xem thống kê, quản lý ghế
- ` `**Yêu cầu phi chức năng:** Hiệu năng, bảo mật, sẵn sàng cao, nhất quán dữ liệu, xử lý hoàn tiền tự động đúng điều kiện

**1.4 Mô tả usecase**

- ` `Use Case 1: Đăng ký tài khoản
- ` `Use Case 2: Đăng nhập
- ` `Use Case 3: Xem danh sách phim
- ` `Use Case 4: Đặt vé
- ` `Use Case 5: Thanh toán qua ZaloPay
- ` `Use Case 6: Hủy vé / Hoàn tiền do khách thực hiện
- ` `Use Case 7: Quản lý phim (Admin)
- ` `Use Case 8: Quản lý suất chiếu (Admin)
- ` `Use Case 9: Xem vé đã mua
- ` `Use Case 10: Quản lý rạp / phòng chiếu (Admin)

**1.5 Biểu đồ tuần tự/giao tiếp**

- ` `Sequence Diagram: Đặt vé & Thanh toán
- ` `Sequence Diagram: Hủy vé & Hoàn tiền tự động
- ` `Sequence Diagram: Đăng ký / Đăng nhập

**1.6 Biểu đồ hoạt động**

- ` `Activity Diagram: Quy trình đặt vé
- ` `Activity Diagram: Quy trình hủy vé / hoàn tiền tự động
- ` `Activity Diagram: Quy trình Admin quản lý phim

**1.7 Biểu đồ lớp**

- ` `Domain Model: User, Booking, Movie, Showtime, Seat, Payment, Refund, Cinema, CinemaHall
- ` `Module User: Register, Login, Profile
- ` `Module Booking: Reserve, Confirm, Cancel, Refund
- ` `Module Payment: ZaloPay Payment, Refund
- ` `Module Movie Catalog: Browse, Search, Admin Manage
- ` `Module Seat Management: View, Lock, Release Seat
- ` `Module Admin: Dashboard, Manage Movies, Manage Cinemas, Statistics



<a name="_hx8fhc67wh8r"></a>CHƯƠNG 2

**CHƯƠNG 2: THIẾT KẾ HỆ THỐNG — DANH SÁCH NHIỆM VỤ**

**2.1 Thiết kế kiến trúc hệ thống**

- ` `Mô tả mô hình Client–Server của hệ thống XEMPHIM
- ` `Trình bày kiến trúc theo hướng 3 tầng:
  - ` `Presentation: frontend React
  - ` `Application: API Gateway và các microservice
  - ` `Data: MSSQL, Redis, RabbitMQ
- ` `Vẽ sơ đồ kiến trúc tổng thể của hệ thống
- ` `Mô tả luồng xử lý từ client → gateway → service → database
- ` `Nêu rõ 2 vai trò chính: admin và customer
- ` `Mô tả cơ chế xác thực JWT qua Gateway
- ` `Mô tả mô hình auth cookie-based: Gateway dùng cookie `access_token` cho toàn bộ luồng frontend trên trình duyệt
- ` `Mô tả cách các service giao tiếp với nhau:
  - ` `Đồng bộ: request/response
  - ` `Bất đồng bộ: message queue
- ` `Mô tả Redis không chỉ dùng để khóa ghế mà còn dùng để cache danh sách phim, chi tiết phim và lịch chiếu; seat map vẫn có thể fallback sang DB lock khi cần
- ` `Mô tả các job nền tự động: hết hạn booking khóa, hết hạn payment pending, giải phóng ghế tạm thời
- ` `Mô tả thư mục gateway thực tế đang dùng là `gateway/`, còn `api-gateway/` chỉ là thư mục/package còn sót

**2.2 Lựa chọn cơ sở dữ liệu**

- ` `Giới thiệu hệ quản trị cơ sở dữ liệu đang dùng trong project là MSSQL
- ` `Lý do lựa chọn MSSQL cho hệ thống đặt vé xem phim
- ` `Trình bày ưu điểm của CSDL quan hệ:
  - ` `Hỗ trợ transaction
  - ` `Đảm bảo tính ACID
  - ` `Phù hợp với dữ liệu liên kết nhiều bảng
- ` `Trình bày cách liên kết giữa các bảng bằng khóa ngoại
- ` `Mô tả nhu cầu transaction trong các nghiệp vụ:
  - ` `Đặt vé
  - ` `Giữ ghế
  - ` `Thanh toán
  - ` `Hoàn tiền
- ` `Nêu vai trò của Redis trong khóa ghế tạm thời và caching dữ liệu phim, suất chiếu; seat map có thể fallback sang DB lock khi cần
- ` `Nêu vai trò của RabbitMQ trong xử lý bất đồng bộ và thông báo
- ` `Mô tả việc expire booking/payment bằng job định kỳ thay vì chỉ dựa vào queue
- ` `So sánh ngắn với một số CSDL khác nếu cần
- ` `Lock ghế thực tế đang chạy với TTL 180 giây ở controller/QR flow.
- ` `Refund không tách thành bảng riêng mà được ghi nhận bằng bảng Payments với `amount` âm và `status = refunded`.

**2.3 Các công nghệ ứng dụng trong hệ thống**

**Backend**

- ` `Trình bày Node.js và Express trong xây dựng API
- ` `Trình bày Sequelize ORM trong thao tác dữ liệu
- ` `Trình bày JWT trong xác thực và phân quyền
- ` `Trình bày bcrypt trong mã hóa mật khẩu
- ` `Trình bày kiến trúc microservices đang áp dụng trong project

**Frontend**

- ` `Trình bày ReactJS trong xây dựng giao diện
- ` `Trình bày React Router trong điều hướng trang
- ` `Trình bày CSS Modules hoặc công nghệ style đang dùng trong project

**Triển khai**

- ` `Trình bày Docker hoặc Docker Compose nếu project có sử dụng
- ` `Mô tả cách chạy hệ thống ở môi trường local
- ` `Mô tả cách triển khai hoặc mô phỏng production nếu có
- ` `Nêu các công cụ hỗ trợ:
  - ` `npm
  - ` `nodemon
  - ` `ngrok

**2.4 Lược đồ thiết kế cơ sở dữ liệu**

- ` `Liệt kê toàn bộ bảng dữ liệu trong hệ thống
- ` `Mô tả bảng Users với 2 role:
  - ` `admin
  - ` `customer
- ` `Mô tả bảng Movies
- ` `Mô tả bảng Genres và MovieGenres
- ` `Mô tả bảng Cinemas và CinemaHalls
- ` `Mô tả bảng Seats
- ` `Mô tả bảng Showtimes
- ` `Mô tả bảng Bookings
- ` `Mô tả bảng BookingSeats
- ` `Mô tả bảng Payments
- ` `Mô tả bảng Refunds nếu hệ thống có tách riêng
  - ` `Lưu ý: hệ thống hiện tại không tách riêng bảng Refund, mà ghi nhận hoàn tiền qua bảng Payments với trạng thái `refunded`
- ` `Xác định khóa chính và khóa ngoại cho từng bảng
- ` `Xác định các ràng buộc trạng thái:
  - ` `booking
  - ` `payment
  - ` `seat
- ` `Vẽ ERD toàn hệ thống
- ` `Mô tả quan hệ giữa các bảng dữ liệu 

<a name="_n6ifa58o4ulq"></a>CHƯƠNG 3

**CHƯƠNG 3: TRIỂN KHAI HỆ THỐNG**

**3.1 Một số giao diện chính của phần mềm**

- Trang chủ hiển thị danh sách phim đang chiếu.
- Trang danh sách phim và trang chi tiết phim.
- Trang chọn ghế và đặt vé.
- Trang thanh toán ZaloPay.
- Trang vé của tôi / lịch sử đặt vé.
- Trang đăng nhập / đăng ký.
- Khu vực quản trị phim.
- Khu vực quản trị rạp, phòng chiếu, ghế.
- Khu vực quản trị suất chiếu.
- Các popup xác nhận thao tác và thông báo kết quả.

**3.2 Một số đoạn mã và cách áp dụng design pattern**

- **Singleton**: kết nối CSDL được khởi tạo tập trung trong các file models/index.js.
- **Factory**: các model Sequelize được tạo thông qua hàm nhận sequelize và DataTypes.
- **Authentication / JWT**: dùng để đăng nhập và phân quyền người dùng.
- **Booking / lock ghế**: dùng để giữ ghế tạm thời khi người dùng đặt vé.
- **Payment / ZaloPay**: dùng để tạo QR thanh toán, xác nhận thanh toán và xử lý hoàn tiền.
- **Admin authentication**: dùng middleware kiểm tra quyền admin trước khi cho phép truy cập các API quản trị.
- Cấu trúc code được chia theo module/service rõ ràng: user-service, movie-service, booking-service, payment-service, seat-service, notification-service, frontend, gateway.
- **Redis cache**: dùng để cache danh sách phim, chi tiết phim và lịch chiếu nhằm giảm tải truy vấn.
- **Job nền**: dùng để tự động hết hạn booking locked và payment pending theo chu kỳ.
- **Luồng cancel booking**: dùng khi người dùng rời trang thanh toán, bấm quay lại hoặc đóng tab.

**3.3 Triển khai hệ thống**

- Hệ thống được triển khai theo mô hình nhiều service chạy riêng.
- Frontend React được chạy độc lập với backend.
- Các service backend được cấu hình qua file .env.
- Cơ sở dữ liệu sử dụng MSSQL.
- Thanh toán tích hợp ZaloPay sandbox.
- Redis được dùng cho seat lock và cache dữ liệu phim/suất chiếu.
- RabbitMQ được dùng cho notification bất đồng bộ.
- Toàn bộ luồng auth trên trình duyệt sử dụng cookie HttpOnly qua Gateway.
- Callback ZaloPay được hỗ trợ qua ngrok trong môi trường local.
- Các công cụ sử dụng trong quá trình chạy và phát triển gồm: npm, nodemon, ngrok.



` `<a name="_hcvpjsyv879l"></a>CHƯƠNG 4

**CHƯƠNG 4: TỔNG KẾT**

- **4.1 Kết quả đạt được:** Tóm tắt những gì hệ thống đã làm được.
- **4.2 Đánh giá ưu, khuyết điểm:** Nhìn nhận khách quan về sản phẩm.
- **4.3 Hướng phát triển trong tương lai:** Các tính năng cần hoàn thiện hoặc mở rộng

---

## ⚠️ LƯU Ý QUAN TRỌNG KHI LÀM BÁO CÁO

Dưới đây là đối chiếu thực tế giữa nội dung báo cáo bên trên và mã nguồn hiện tại của hệ thống để chuẩn bị tốt nhất khi bảo vệ/demo:

### 1. Các chức năng có ghi trong báo cáo nhưng thực tế là "Nửa Vời" (Đã code backend/frontend nhưng chưa liên kết hoàn chỉnh)

*   **Quản lý rạp chiếu (Cinema Management) ở Frontend:**
    *   *Ghi nhận trong báo cáo:* Dòng 20, 56, 167.
    *   *Thực tế code:* Backend có API đầy đủ, Frontend đã có file `CinemaList.js` trong thư mục `CinemaManagement` nhưng **chưa được import** vào file định tuyến `App.js` hoặc menu sidebar `Admin/index.js`.
*   **Quản lý ghế (Seat Management) ở Frontend:**
    *   *Ghi nhận trong báo cáo:* Dòng 20, 55, 167.
    *   *Thực tế code:* Backend có API đầy đủ để quản lý và chỉnh sửa loại ghế (VIP/Regular). Frontend mới chỉ có giao diện quản lý phòng chiếu (Hall) tự tính tổng số ghế (hàng x cột), chưa có giao diện sơ đồ ghế trực quan để admin chỉnh sửa loại ghế cụ thể.

### 2. Các chức năng có ghi trong báo cáo nhưng "Chưa có trong code" (Chưa cài đặt)

*   **Quản lý người dùng (User Management) của Admin:**
    *   *Ghi nhận trong báo cáo:* Dòng 20.
    *   *Thực tế code:* `user-service` hiện tại chỉ phục vụ auth (đăng ký, đăng nhập, đăng xuất, profile cá nhân). Không có API hay giao diện nào cho phép Admin quản lý danh sách người dùng, xóa hoặc đổi vai trò của người dùng khác.
*   **Xem thống kê / Báo cáo doanh thu (Statistics / Dashboard) của Admin:**
    *   *Ghi nhận trong báo cáo:* Dòng 20, 56.
    *   *Thực tế code:* Giao diện Admin có chừa sẵn 3 thẻ thống kê (Tổng phòng chiếu, Phim đang chiếu, Vé bán ra hôm nay) nhưng tất cả hiển thị `...` vì code gọi API `/api/admin/dashboard-stats` đang bị comment ở frontend và backend chưa hề xây dựng API này.
*   **Quản lý suất chiếu (Showtime Management) của Admin:**
    *   *Ghi nhận trong báo cáo:* Dòng 20, 32, 168.
    *   *Thực tế code:* Backend chưa viết các API CRUD suất chiếu cho admin, frontend chưa có giao diện lịch chiếu để admin thao tác.

