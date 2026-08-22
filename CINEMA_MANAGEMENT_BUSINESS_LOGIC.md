# 🎬 Cinema Management System — Business Logic Guide

**Tài Liệu Quy Chuẩn Nghiệp Vụ Quản Lý Rạp & Phòng Chiếu**

Phiên bản: 1.0.0  
Cập nhật: Tháng 8/2026  
Hệ thống: XEMPHIM Microservices

---

## 📐 Quy Trình & Nghiệp Vụ Thực Tế

### 1️⃣ Tạo & Quản Lý Rạp Chiếu (Cinemas)

#### Business Rules:
- ✅ **Tên rạp**: Bắt buộc, độ dài 2-255 ký tự, không chứa ký tự đặc biệt nguy hiểm.
- ✅ **Địa chỉ**: Chi tiết, bao gồm số nhà/tòa nhà, đường, quận/huyện.
- ✅ **Thành phố**: Bắt buộc (VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng).
- ✅ **Trạng thái**: `active` (đang mở cửa đón khách) hoặc `inactive` (tạm đóng/sửa chữa).

#### Ràng Buộc Khi Xóa Rạp (Deletion Constraints):
```
⛔ KHÔNG THỂ xóa rạp nếu:
   1. Rạp đang có phòng chiếu (Cinema Halls) trực thuộc
   2. Rạp có các suất chiếu trong tương lai
   3. Rạp có đơn đặt vé (Bookings) chưa xử lý xong hoặc đang active

✅ Giải pháp an toàn: Chuyển trạng thái rạp sang 'inactive' thay vì Hard Delete.
```

---

### 2️⃣ Tạo & Cấu Hình Phòng Chiếu (Cinema Halls)

#### Business Rules:
- ✅ **Tên phòng**: Phân biệt trong cùng một rạp (VD: Phòng 01, Phòng 02, IMAX Laser).
- ✅ **Số hàng ghế (Rows)**: 1 đến 26 hàng (tương ứng chữ cái A đến Z).
- ✅ **Số ghế mỗi hàng (Seats per row)**: 1 đến 50 ghế.
- ✅ **Tổng số ghế**: Tự động tính toán: `total_seats = rows × seats_per_row`.

#### Cơ Chế Tự Động Sinh Ghế (Auto-Generation):
Khi Admin tạo phòng chiếu mới, hệ thống tự động:
1. Tạo bản ghi `cinema_halls` trong cơ sở dữ liệu `XemPhim_Movie`.
2. Khởi tạo hàng loạt (bulk create) danh sách ghế trong bảng `seats`:
   - `row_name`: A, B, C, ...
   - `seat_number`: 1, 2, 3, ...
   - `seat_type`: Mặc định là `Standard`
   - `price_modifier`: Mặc định là `1.00`
   - `is_active`: Mặc định là `1` (True)

---

### 3️⃣ Phân Loại Ghế & Cơ Chế Định Giá (Seats & Price Modifiers)

Hệ thống tính giá vé dựa trên **công thức nhân hệ số**:
$$\text{Giá Vé} = \text{round}(\text{base\_price} \times \text{price\_modifier})$$

Trong đó:
- `base_price`: Giá vé cơ bản của từng suất chiếu (Showtime).
- `price_modifier`: Hệ số giá của từng chiếc ghế.

#### Bảng Phân Loại & Hệ Số Chuẩn:

| Loại Ghế (`seat_type`) | Hệ Số Giá (`price_modifier`) | Ví dụ Base Price = 80.000đ | Vị Trí Bố Trí Tiêu Chuẩn |
|------------------------|------------------------------|----------------------------|--------------------------|
| **Standard** | `1.00` | 80.000 VNĐ | Các hàng đầu và giữa mép cánh (A - C, các ghế ngoài) |
| **VIP** | `1.50` | 120.000 VNĐ | Các hàng trung tâm (D - H, ghế giữa 4 - 15) |
| **Couple** | `2.00` | 160.000 VNĐ | Hàng ghế cuối cùng (Sweetbox / Ghế đôi) |
| **Premium** | `2.50` | 200.000 VNĐ | Ghế ngả da cao cấp, trung tâm góc nhìn tốt nhất |
| **Disabled** | `0.50` | 40.000 VNĐ | Hàng ghế đầu gần lối thoát hiểm / lối đi xe lăn |

#### Business Rules Ghế:
```javascript
// Validation & Constraints
- seat_type: 'Standard' | 'VIP' | 'Couple' | 'Premium' | 'Disabled'
- price_modifier: 0.50 đến 3.00
- Unique Constraint: Duy nhất cặp (hall_id, row_name, seat_number)
- Ghế Disabled: Tối đa 5-10% tổng sức chứa phòng, ưu tiên lối ra vào
```

---

### 4️⃣ Vòng Đời Trạng Thái Ghế & Khóa Ghế (Seat State Machine)

Khi người dùng đặt vé, trạng thái ghế được kiểm soát qua **Redis Distributed Lock** và **Database Lifecycle**:

```
 ┌─────────────┐
 │  Available  │ ◄─── Ghế trống, sẵn sàng chọn
 └──────┬──────┘
        │ User chọn ghế (acquire lock SET NX PX TTL=120s)
 ┌──────▼──────┐
 │   Locked    │ ◄─── Đang giữ chỗ trong 2 phút chờ thanh toán
 └──────┬──────┘
        │
   ┌────┴──────────────────────────┐
   │ Thanh toán ZaloPay thành công  │ Hết hạn 120s / User hủy
 ┌─▼───────────┐             ┌─────▼───────┐
 │  Confirmed  │             │  Available  │
 │  (Booked)   │             │ (Lock giải) │
 └─────────────┘             └─────────────┘
```

---

### 5️⃣ Ràng Buộc Toàn Vẹn Dữ Liệu (Integrity Constraints)

```
Cinemas (XemPhim_Movie)
  └── 1 : N ── Cinema Halls (XemPhim_Movie)
                 ├── 1 : N ── Seats (XemPhim_Movie & XemPhim_Seat)
                 └── 1 : N ── Showtimes (XemPhim_Movie)
                                └── 1 : N ── Bookings (XemPhim_Booking)
```

1. **Không cho phép xóa ghế** nếu ghế đó đã từng phát sinh giao dịch trong lịch sử `booking_seats`.
2. **Nếu ghế bị hỏng hoặc bảo trì**: Admin chuyển `is_active = false` để loại khỏi sơ đồ hiển thị khi người dùng đặt vé.
3. **Khi thay đổi cấu hình phòng**: Chỉ được thực hiện khi phòng không có suất chiếu nào đang hoạt động trong tương lai.

---

### 6️⃣ API Workflow Mẫu (Ví dụ Thiết Lập Cụm Rạp)

```bash
# 1. Admin tạo Rạp mới
POST http://localhost:8080/api/admin/cinemas
{
  "name": "CGV Vincom Đồng Khởi",
  "address": "72 Lê Thánh Tôn, Bến Nghé, Quận 1",
  "city": "TP. Hồ Chí Minh",
  "status": "active"
}

# 2. Tạo Phòng Chiếu 01 (10 hàng x 16 ghế = 160 ghế Standard)
POST http://localhost:8080/api/admin/halls
{
  "cinemaId": 1,
  "name": "Phòng 01 (IMAX)",
  "rows": 10,
  "seatsPerRow": 16
}

# 3. Lấy layout sơ đồ ghế để kiểm tra
GET http://localhost:8080/api/admin/halls/1/detail

# 4. Nâng cấp hàng D, E, F thành VIP (hệ số 1.5)
PUT http://localhost:8080/api/admin/seats/45
{
  "seat_type": "VIP",
  "price_modifier": 1.50,
  "is_active": true
}
```

---

*Cập nhật: Tháng 8/2026 | Phiên bản: 1.0.0 | Tác giả: Phạm Tuấn Hưng*
