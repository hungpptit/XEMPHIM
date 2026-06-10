# 🎬 Cinema Management System - Business Logic Guide

**Hướng Dẫn Logic Quản Lý Rạp Chiếu Phim**

---

## 📐 Quy Trình Quản Lý Rạp - Real World Logic

### 1️⃣ Tạo Rạp Chiếu (Cinemas)

#### Business Rules:
```
✅ Tên rạp: Bắt buộc, unique, trừ khoảng trắng
✅ Địa chỉ: Chi tiết, không được trống
✅ Thành phố: Nên có trong danh sách cities
✅ Trạng thái: Active (hoạt động) hoặc Inactive (ngưng hoạt động)
✅ Hot contact: Số điện thoại (optional)
✅ Email: Email liên hệ (optional)

⛔ Không thể xoá rạp nếu:
   - Có phòng chiếu
   - Có lịch chiếu tương lai
   - Có booking chưa xử lý
```

#### Validation:
```javascript
// Input validation
- name: String, 2-255 chars, trimmed, unique
- address: String, 5-500 chars
- city: String, must exist in cities list
- status: 'Active' or 'Inactive'
- phone: Optional, 10-15 digits
- email: Optional, valid email format
```

---

### 2️⃣ Tạo Phòng Chiếu (Cinema Halls)

#### Business Rules:
```
✅ Tên phòng: Unique per cinema (A, B, VIP, IMAX, etc.)
✅ Loại phòng: 2D, 3D, IMAX, 4DX, etc.
✅ Sức chứa: 50-500 ghế (điển hình 150-300)
✅ Hàng/Ghế: 
   - Hàng: A-Z (max 26 hàng)
   - Ghế: 1-50 ghế/hàng
   - Tối đa: 26 * 50 = 1,300 ghế

⛔ Không thể xoá phòng nếu:
   - Có lịch chiếu tương lai
   - Có ghế được booking
```

#### Cấu Hình Ghế Tiêu Biểu:
```
Standard (Ghế Thường):    hàng B-T, hàng giữa
VIP (Ghế VIP):           hàng D-R (hàng giữa nhất)
Couple (Ghế Đôi):        hàng A,B,Y,Z (cạnh),số 1-2, 19-20
Premium (Ghế Cao Cấp):   hàng G-O (ghế số 5-16, giữa)
Disabled (Ghế Khuyết):   hàng A hoặc Z, ghế số 1 hoặc 20
```

---

### 3️⃣ Phân Loại & Định Giá Ghế (Seats)

#### Loại Ghế & Hệ Số Giá:

```
Loại Ghế          | Hệ Số Giá | Ví Dụ Giá      | Vị Trí Tiêu Biểu
───────────────────────────────────────────────────────────────────
Standard          | 1.0       | 70,000 VNĐ     | Hàng B-T, số bất kỳ
VIP               | 1.5       | 105,000 VNĐ    | Hàng D-R, số 5-16
Couple            | 2.0       | 140,000 VNĐ    | Hàng cạnh, số cặp
Premium           | 2.5       | 175,000 VNĐ    | Hàng giữa nhất, số giữa
Disabled          | 0.5       | 35,000 VNĐ     | Hàng A/Z, vị trí trước
```

#### Rules:
```javascript
// Validation
- seat_type: 'Standard', 'VIP', 'Couple', 'Premium', 'Disabled'
- price_modifier: 0.5 - 3.0 (hệ số nhân với giá cơ bản)
- is_active: true/false (ghế có sử dụng được không)

// Business rules
- Ghế Couple: phải tạo thành cặp (A1-A2, A3-A4, ...)
- Ghế Disabled: tối đa 10% sức chứa phòng
- Ghế Disabled phải gần lối thoát, không blocked
- Ghế Premium: tối đa 20% sức chứa
- Ghế VIP: tối đa 30% sức chứa
```

#### Mặc Định Cho Phòng Mới:

```javascript
// Phòng 240 ghế (12 hàng x 20 ghế)
Hàng A:  20 ghế Couple (2 cặp: số 1-2, 19-20) + 16 Disabled phía sau
Hàng B:  12 Standard + 1 Disabled mỗi đầu + 4 vị trí trống
Hàng C-E: 20 Standard
Hàng F-G: 16 VIP + 4 Couple (số 5-6, 15-16)
Hàng H-K: 20 Premium (giữa) + Standard (cạnh)
Hàng L-R: 20 Standard
Hàng S-T: 20 Standard
Hàng U:  16 VIP + 4 Couple
Hàng V-Y: 20 Standard
Hàng Z:  20 ghế Couple + Disabled
```

---

### 4️⃣ Quản Lý Trạng Thái Ghế

#### Trạng Thái Ghế:

```
Trạng Thái        | is_active | Có Thể Book | Ghi Chú
──────────────────────────────────────────────────────────
Available         | true      | ✅ Có       | Ghế sẵn sàng đặt
Booked            | true      | ❌ Không    | Đã được booking
Maintenance       | false     | ❌ Không    | Trong thời gian bảo trì
Broken/Damaged    | false     | ❌ Không    | Ghế bị hỏng, cần sửa chữa
Blocked           | false     | ❌ Không    | Bị khóa tạm thời
Reserved          | true      | ❌ Không    | Dành riêng cho sự kiện
```

#### Validation Rules:
```javascript
// Khi update status
- Ghế Active phải có valid seat_type
- Ghế broken phải track maintenance request
- Không thể disable ghế có booking hiện tại
- Premium/VIP seats phải có price_modifier >= 1.5
```

---

### 5️⃣ Kiểm Tra Ghế Khả Dụng

#### Business Logic:

```javascript
// Ghế khả dụng = Điều kiện:
- is_active = true
- seat_type != 'Disabled' (nếu user bình thường)
- Chưa được book cho showtime này
- Không trong maintenance mode
- Phòng phải active
- Rạp phải active

// Ghế khuyết tật (Disabled):
- Chỉ user có trợ cấp mới thấy
- Needs special handling khi calculate seat layout
- Nên ở gần cửa ra vào
```

---

### 6️⃣ Quy Tắc Xoá & Deactivate

#### DELETE Rạp (Hard Delete):
```
⛔ Điều kiện xoá:
- KHÔNG có phòng chiếu nào
- KHÔNG có lịch chiếu
- KHÔNG có booking nào (cả thành công và pending)

✅ Khi có dữ liệu:
- Mark as inactive thay vì xoá
```

#### DELETE Phòng:
```
⛔ Điều kiện xoá:
- KHÔNG có lịch chiếu tương lai (7 ngày trở lại)
- KHÔNG có booking chưa xử lý

✅ Nếu cần xoá ngay:
- Phải cancel tất cả bookings
- Phải xoá tất cả showtimes
```

#### DELETE Ghế:
```
⛔ Điều kiện xoá:
- KHÔNG được phép xoá ghế đã tạo
- Phải set is_active = false để deactivate

✅ Deactivate:
- Đánh dấu is_active = false
- Track reason (maintenance, broken, etc.)
```

---

## 🎯 Quy Trình Quản Lý Thực Tế

### A. Thiết Lập Rạp Mới

```
1. Admin tạo Cinema (rạp)
   └─ Nhập: name, address, city, phone, email
   └─ System: Auto create ID, timestamps

2. Tạo từng Hall (phòng chiếu)
   └─ Nhập: name, hallType (2D/3D/etc), rows, seatsPerRow
   └─ System: Calculate total_seats = rows × seatsPerRow

3. Auto-generate Seats cho Hall
   └─ System tạo mặc định 100% Standard
   └─ Ghế có: id, hall_id, row_name, seat_number, seat_type, price_modifier

4. Admin customize Seat Layout
   └─ Edit từng vùng ghế: loại, giá
   └─ Bulk update: "Hàng D-G là VIP, hệ số 1.5"
   └─ Set Disabled seats: hàng A (số 1,19,20), hàng Z (số 1,19,20)
```

### B. Cập Nhật Cấu Hình Ghế

```
Trước khi có booking:
├─ Có thể thay đổi seat_type
├─ Có thể xóa/thêm ghế
└─ Có thể deactivate toàn bộ phòng

Khi có booking:
├─ KHÔNG thể thay đổi ghế đã book
├─ Có thể deactivate ghế chưa book
└─ Flexible seat = User chọn ghế khác nếu seat book
```

### C. Monitoring & Maintenance

```
Hàng ngày:
├─ Check lịch chiếu hôm nay
├─ Monitor ghế broken/damaged
└─ Xử lý refund

Hàng tuần:
├─ Review seat availability stats
├─ Plan maintenance
└─ Update seat pricing nếu cần

Hàng tháng:
├─ Analyze booking patterns
├─ Optimize pricing strategies
└─ Generate revenue reports
```

---

## 📊 Database Relationships

```
cinemas (1)
├── cinema_halls (Many)
│   ├── seats (Many)
│   ├── showtimes (Many)
│   │   ├── bookings (Many)
│   │   └── booking_seats (Many)
│   └── cinema_hall_images (Many)
│
└── cinema_info (Optional, 1)
    ├── contact_info
    ├── opening_hours
    └── amenities
```

---

## ✅ Validation Checklist

### Khi Tạo Cinema:
```
☑ Name: 2-255 chars, not null, trimmed
☑ Address: 5-500 chars, not null
☑ City: valid city code, not null
☑ Status: 'Active' hoặc 'Inactive'
☑ Phone: optional, valid format if provided
☑ Email: optional, valid email if provided
```

### Khi Tạo Hall:
```
☑ Name: unique per cinema, not null
☑ Cinema_id: must exist
☑ Rows: 1-26 (A-Z), not null
☑ SeatsPerRow: 1-50, not null
☑ Total_seats: rows × seatsPerRow (auto calc)
☑ HallType: valid type (2D/3D/IMAX/etc)
```

### Khi Tạo/Update Seats:
```
☑ Hall_id: must exist
☑ Row_name: A-Z, single char
☑ Seat_number: 1-50, positive integer
☑ Seat_type: valid type (Standard/VIP/etc)
☑ Price_modifier: 0.5-3.0 for valid types
☑ Is_active: boolean
☑ Unique constraint: (hall_id, row_name, seat_number)
```

---

## 🔄 API Workflow Example

### Scenario: Thiết Lập Rạp CGV Hà Nội

```bash
# 1. Tạo rạp
POST /admin/cinemas
{
  "name": "CGV Hà Nội Skylake",
  "address": "Tầng 3-4, Tòa Skylake, Phạm Hùng",
  "city": "Hà Nội",
  "phone": "0243-9999-999",
  "email": "hanoi@cgv.vn",
  "status": "Active"
}
// Response: { id: 1, ... }

# 2. Tạo phòng A
POST /admin/halls
{
  "name": "Phòng A",
  "hallType": "2D",
  "rows": 12,
  "seatsPerRow": 20,
  "cinemaId": 1,
  "description": "Phòng 2D tiêu chuẩn, 240 ghế"
}
// Response: { id: 1, total_seats: 240, ... }

# 3. Tạo ghế (tự động tạo 240 ghế Standard)
POST /admin/seats
{
  "hallId": 1,
  "rows": 12,
  "seatsPerRow": 20,
  "defaultSeatType": "Standard",
  "defaultPriceModifier": 1.0
}
// Response: { created: 240, ... }

# 4. Customize seat layout
PUT /admin/halls/1/seats/batch-update
{
  "updates": [
    {
      "rowName": "A",
      "seatType": "Couple",
      "priceModifier": 2.0,
      "seats": [1,2,19,20]
    },
    {
      "rowName": "D",
      "seatType": "VIP",
      "priceModifier": 1.5,
      "seats": "1-20"
    },
    {
      "rowName": "G-H",
      "seatType": "Premium",
      "priceModifier": 2.5,
      "seats": "5-16"
    }
  ]
}
// Updates nhiều ghế trong request duy nhất
```

---

## 📋 Summary of Cinema Management

| Aspect | Detail |
|--------|--------|
| **Entity** | Cinema (Rạp) |
| **Sub-entities** | Halls, Seats |
| **Key Operations** | CRUD Rạp, Phòng, Ghế |
| **Main Validation** | Unique tên (per cinema), status, quantities |
| **Pricing** | Price_modifier (0.5-3.0) × base_price |
| **Deletion** | Mostly deactivate, hard delete chỉ khi sạch sẽ |
| **Complexity** | Medium (multiple levels, many validations) |

