# 🎬 HƯỚNG DẪN ĐẦY ĐỦ: HỆ THỐNG ĐẶT VÉ XEM PHIM VỚI ZALOPAY

## 📋 MỤC LỤC
1. [Cấu hình môi trường](#1-cấu-hình-môi-trường)
2. [Khởi động hệ thống](#2-khởi-động-hệ-thống)
3. [Quy trình đặt vé và thanh toán](#3-quy-trình-đặt-vé-và-thanh-toán)
4. [Quy trình hoàn tiền](#4-quy-trình-hoàn-tiền)
5. [Kiểm tra và xử lý lỗi](#5-kiểm-tra-và-xử-lý-lỗi)

---

## 1. CẤU HÌNH MÔI TRƯỜNG

### 1.1. Cấu hình Backend (.env)

File: `backend/.env`

```env
# Database
DB_SERVER=DESKTOP-28TV5T9\\SQLEXPRESS
DB_NAME=XemPhim
DB_USER=
DB_PASSWORD=
DB_ENCRYPT=true
DB_TRUST_CERT=true

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# ZaloPay Configuration
ZALOPAY_APP_ID=2554
ZALOPAY_KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
ZALOPAY_KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
ZALOPAY_CALLBACK_URL=https://unsentiently-fattenable-daria.ngrok-free.dev/api/zalopay/callback
```

### 1.2. Cấu trúc Database

**Bảng `bookings`** - Check constraint đã được cập nhật:
```sql
ALTER TABLE bookings DROP CONSTRAINT CK_bookings_status;
ALTER TABLE bookings ADD CONSTRAINT CK_bookings_status 
CHECK ([status]='locked' OR [status]='pending' OR [status]='confirmed' 
       OR [status]='cancelled' OR [status]='expired' OR [status]='refunded');
```

**Các status của booking:**
- `locked`: Ghế đã được giữ chỗ (5 phút)
- `pending`: Đang chờ thanh toán (QR đã tạo, 5 phút)
- `confirmed`: Đã thanh toán thành công
- `cancelled`: Đã hủy (trước khi thanh toán)
- `expired`: Hết hạn (quá 5 phút không thanh toán)
- `refunded`: Đã hoàn tiền

**Bảng `payments`** - Lưu thông tin thanh toán:
- `payment_code`: Mã giao dịch merchant (app_trans_id, ví dụ: `251024_641790`)
- `transaction_ref`: Mã giao dịch ZaloPay (zp_trans_id, ví dụ: `251024000114790`)
- `status`: `pending` → `paid` → `refunded`
- `payment_method`: `zalopay`, `zalopay_refund`

---

## 2. KHỞI ĐỘNG HỆ THỐNG

### 2.1. Bước 1: Khởi động Ngrok

**Mục đích:** Tạo public URL để ZaloPay gọi callback về local backend

```powershell
# Terminal 1: Chạy ngrok
ngrok http 8080
```

**Output mẫu:**
```
Session Status                online
Account                       hungpptit
Version                       3.x.x
Region                        Asia Pacific (ap)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://unsentiently-fattenable-daria.ngrok-free.dev -> http://localhost:8080
```

**⚠️ QUAN TRỌNG:** Copy URL `https://xxxxx.ngrok-free.dev` và cập nhật vào `backend/.env`:
```env
ZALOPAY_CALLBACK_URL=https://xxxxx.ngrok-free.dev/api/zalopay/callback
```

**Lưu ý:**
- URL ngrok thay đổi mỗi lần restart (miễn phí)
- Luôn cập nhật `ZALOPAY_CALLBACK_URL` khi ngrok restart
- Có thể xem requests tại: http://127.0.0.1:4040

### 2.2. Bước 2: Khởi động Backend

```powershell
# Terminal 2: Backend
cd D:\XEMPHIM\backend
npm run dev
```

**Output thành công:**
```
✅ paymentsRoutes loaded
🚀 Backend listening on port 8080
```

**Kiểm tra:**
- Backend chạy tại: http://localhost:8080
- API health check: http://localhost:8080/api/auth/me

### 2.3. Bước 3: Khởi động Frontend

```powershell
# Terminal 3: Frontend
cd D:\XEMPHIM\frontend
npm start
```

**Output thành công:**
```
Compiled successfully!
Local:            http://localhost:3000
```

**Truy cập:** http://localhost:3000

---

## 3. QUY TRÌNH ĐẶT VÉ VÀ THANH TOÁN

### 3.1. Bước 1: Chọn phim và suất chiếu

1. **Vào trang chủ:** http://localhost:3000
2. **Chọn phim** muốn xem
3. **Chọn suất chiếu** (showtime)
4. **Xem sơ đồ ghế** và chọn ghế ngồi

**Backend log:**
```
GET /api/movies requested
GET /api/movies/2 requested
GET /api/movies/2/showtimes requested
GET /api/seats/showtimes/4/seats requested
```

### 3.2. Bước 2: Lock ghế (Giữ chỗ)

**Frontend:** Click "Đặt vé" sau khi chọn ghế

**API Call:**
```
POST /api/bookings/lock-seat
Body: {
  user_id: 5,
  showtime_id: 4,
  seat_ids: [12, 13],
  total_price: 5000
}
```

**Backend log:**
```
POST /api/bookings/lock-seat requested
✅ Seats locked successfully
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": 69,
    "booking_code": "08251b3e-f68a-4b7b-8bbc-bd11cd55bf2b",
    "status": "locked",
    "total_price": 5000,
    "expire_at": "2025-10-24T06:02:01.000Z"
  }
}
```

**Kết quả:**
- Booking status: `locked`
- Ghế bị khóa trong 5 phút
- Chuyển sang trang Payment

### 3.3. Bước 3: Tạo QR Code ZaloPay

**Frontend:** Tự động gọi API tạo QR khi vào trang Payment

**API Call:**
```
POST /api/bookings/69/create-sepay-qr
```

**Backend xử lý:**

1. **Tạo app_trans_id** (Mã giao dịch merchant):
```javascript
const appTransId = `${moment().format('YYMMDD')}_${Math.floor(Math.random() * 1000000)}`;
// Ví dụ: 251024_641790
```

2. **Tạo embed_data** (Metadata):
```json
{
  "booking_id": 69,
  "booking_code": "08251b3e-f68a-4b7b-8bbc-bd11cd55bf2b"
}
```

3. **Tính MAC signature** (HMAC-SHA256 với KEY1):
```javascript
const data = `${app_id}|${app_trans_id}|${app_user}|${amount}|${app_time}|${embed_data}|${item}`;
const mac = CryptoJS.HmacSHA256(data, KEY1).toString();
```

4. **Gọi ZaloPay API:**
```
POST https://sb-openapi.zalopay.vn/v2/create
Body: {
  app_id: 2554,
  app_trans_id: "251024_641790",
  app_user: "user_69",
  app_time: 1761285121941,
  amount: 5000,
  item: '[{"itemid":"movie_ticket","itemname":"Vé xem phim","itemprice":5000,"itemquantity":1}]',
  embed_data: '{"booking_id":69,"booking_code":"08251b3e-f68a-4b7b-8bbc-bd11cd55bf2b"}',
  callback_url: "https://unsentiently-fattenable-daria.ngrok-free.dev/api/zalopay/callback",
  description: "Thanh toán vé xem phim - Booking #69",
  bank_code: "",
  mac: "..."
}
```

**Backend log:**
```
📤 [ZaloPay] Creating order: {
  app_trans_id: '251024_641790',
  booking_id: 69,
  booking_code: '08251b3e-f68a-4b7b-8bbc-bd11cd55bf2b',
  amount: 5000,
  callback_url: 'https://unsentiently-fattenable-daria.ngrok-free.dev/api/zalopay/callback'
}
✅ [ZaloPay] Order created: {
  return_code: 1,
  return_message: 'Giao dịch thành công',
  order_url: 'https://qcgateway.zalopay.vn/openinapp?order=...',
  order_token: 'ACV2no62KDlpOD_mhJUgHOYA'
}
```

5. **Lưu Payment record:**
```javascript
await Payment.create({
  booking_id: 69,
  payment_method: 'zalopay',
  payment_code: '251024_641790', // app_trans_id
  amount: 5000,
  qr_url: 'https://qcgateway.zalopay.vn/openinapp?order=...',
  expire_at: new Date(Date.now() + 5 * 60 * 1000), // +5 phút
  status: 'pending'
});
```

6. **Cập nhật Booking:**
```javascript
booking.status = 'pending'; // locked → pending
await booking.save();
```

**Response:**
```json
{
  "success": true,
  "qr_url": "https://qcgateway.zalopay.vn/openinapp?order=eyJ6cHRyYW5zdG9rZW4iOiJBQ1Yybm82MktEbHBPRF9taEpVZ0hPWUEiLCJhcHBpZCI6MjU1NH0=",
  "amount": 5000,
  "expire_at": "2025-10-24T06:02:01.795Z"
}
```

### 3.4. Bước 4: Hiển thị QR Code

**Frontend (Payment.js):**

```javascript
import QRCodeSVG from 'qrcode.react';

<QRCodeSVG 
  value={qrUrl}  // ZaloPay order_url
  size={250}
  level="H"
/>
```

**UI hiển thị:**
- ✅ QR Code (quét bằng ZaloPay app)
- ⏱️ Countdown timer (300 giây = 5 phút)
- 💰 Số tiền: 5,000đ
- 🔄 Polling status mỗi 3 giây

**Frontend polling:**
```
GET /api/bookings/69/status
→ Kiểm tra booking.status mỗi 3 giây
```

### 3.5. Bước 5: Quét QR và thanh toán

**User action:**
1. Mở **ZaloPay app** trên điện thoại
2. Click **"Thanh toán" (QR icon)**
3. **Quét QR code** trên màn hình
4. **Xác nhận thanh toán** 5,000đ
5. **Nhập PIN** ZaloPay

**ZaloPay xử lý:**
- Trừ tiền từ ví ZaloPay
- Gọi callback về backend

### 3.6. Bước 6: Nhận Callback từ ZaloPay

**ZaloPay gọi webhook:**
```
POST https://unsentiently-fattenable-daria.ngrok-free.dev/api/zalopay/callback
Content-Type: application/x-www-form-urlencoded

data={...}&mac=0b234e3d9a534ee8709a80547441712ab5266bc813e5b62a9afd983ae2809a53
```

**Backend xử lý (zalopayController.js):**

1. **Parse request:**
```javascript
const { data: dataStr, mac: receivedMac } = req.body;
const dataJson = JSON.parse(dataStr);
```

2. **Verify MAC signature** (bằng KEY2):
```javascript
const calculatedMac = CryptoJS.HmacSHA256(dataStr, KEY2).toString();
if (receivedMac !== calculatedMac) {
  return res.json({ return_code: -1, return_message: 'MAC verification failed' });
}
```

**Backend log:**
```
📬 [ZaloPay Callback] Received: {
  dataStr: '{"app_id":2554,"app_trans_id":"251024_641790",...}',
  mac: '0b234e3d9a534ee8709a80547441712ab5266bc813e5b62a9afd983ae2809a53'
}
🔐 [ZaloPay] Callback MAC verification: {
  received: '0b234e3d9a534ee8709a80547441712ab5266bc813e5b62a9afd983ae2809a53',
  calculated: '0b234e3d9a534ee8709a80547441712ab5266bc813e5b62a9afd983ae2809a53',
  valid: true
}
```

3. **Extract data:**
```javascript
const {
  app_trans_id,      // "251024_641790"
  zp_trans_id,       // 251024000114790 (ZaloPay transaction ID)
  amount,            // 5000
  embed_data: embedDataStr
} = dataJson;

const embedData = JSON.parse(embedDataStr);
// { booking_id: 69, booking_code: "..." }
```

4. **Cập nhật Payment:**
```javascript
const payment = await Payment.findOne({
  where: { 
    booking_id: embedData.booking_id,
    status: 'pending'
  }
});

payment.payment_code = app_trans_id;        // Lưu app_trans_id
payment.transaction_ref = String(zp_trans_id); // Lưu zp_trans_id
payment.status = 'paid';
await payment.save();
```

5. **Cập nhật Booking:**
```javascript
const booking = await Booking.findByPk(embedData.booking_id);
booking.status = 'confirmed'; // pending → confirmed
await booking.save();
```

6. **Cập nhật Seats:**
```javascript
const bookingSeats = await BookingSeat.findAll({
  where: { booking_id: embedData.booking_id }
});

for (const bs of bookingSeats) {
  await Seat.update(
    { status: 'booked' },
    { where: { id: bs.seat_id } }
  );
}
```

**Backend log:**
```
✅ [ZaloPay Callback] Valid payment: {
  app_trans_id: '251024_641790',
  zp_trans_id: 251024000114790,
  amount: 5000
}
✅ [ZaloPay Callback] Booking 69 confirmed successfully
```

**Response to ZaloPay:**
```json
{
  "return_code": 1,
  "return_message": "success"
}
```

### 3.7. Bước 7: Frontend nhận kết quả

**Polling phát hiện thay đổi:**
```
GET /api/bookings/69/status
→ status: "confirmed" (đã thanh toán)
```

**Frontend:**
- ✅ Hiển thị "Thanh toán thành công!"
- 🎫 Chuyển sang trang "Vé của tôi"
- 📧 (Optional) Gửi email xác nhận

**Kết quả cuối cùng:**
- Booking status: `confirmed`
- Payment status: `paid`
- Seat status: `booked`
- User có thể vào rạp với booking_code

---

## 4. QUY TRÌNH HOÀN TIỀN

### 4.1. Điều kiện hoàn tiền

**Frontend (MyTickets.js) - Function `canRefundTicket()`:**

```javascript
const canRefundTicket = (ticket) => {
  // 1. Chỉ hoàn tiền được vé đã thanh toán
  if (ticket.status !== 'confirmed') return false;
  
  // 2. Phải còn ít nhất 2 giờ trước giờ chiếu
  const showtime = new Date(ticket.showtime);
  const now = new Date();
  const hoursUntilShow = (showtime - now) / (1000 * 60 * 60);
  
  return hoursUntilShow >= 2;
};
```

**Hiển thị:**
- ✅ Button "Hoàn tiền" nếu đủ điều kiện
- ❌ Button bị disable nếu không đủ điều kiện
- 📝 Tooltip hiển thị lý do không thể hoàn tiền

### 4.2. Bước 1: User yêu cầu hoàn tiền

**Frontend:** Click "Hoàn tiền" → Nhập lý do → Xác nhận

**API Call:**
```
POST /api/bookings/69/refund
Body: {
  reason: "Có việc đột xuất không thể đi xem"
}
```

### 4.3. Bước 2: Backend xử lý refund

**Backend flow (bookingService.js - refundBooking()):**

#### 4.3.1. Validate quyền sở hữu
```javascript
const booking = await Booking.findByPk(booking_id, {
  include: [{ model: Showtime }]
});

// Kiểm tra user có phải chủ booking không
if (booking.user_id !== user_id) {
  throw new Error('Unauthorized');
}
```

#### 4.3.2. Kiểm tra thời gian
```javascript
const showtime = new Date(booking.Showtime.start_time);
const now = new Date();
const hoursUntil = (showtime - now) / (1000 * 60 * 60);

if (hoursUntil < 2) {
  return {
    success: false,
    message: 'Cannot refund: Less than 2 hours before showtime'
  };
}
```

#### 4.3.3. Tìm Payment record
```javascript
const originalPayment = await Payment.findOne({
  where: {
    booking_id: booking.id,
    status: 'paid',
    transaction_ref: { [Op.ne]: null } // Có zp_trans_id
  },
  order: [['created_at', 'DESC']]
});
```

**Backend log:**
```
🔍 [Refund] Looking for paid payment with transaction_ref for booking: 69
🔍 [Refund] Found payment: {
  id: 112,
  payment_code: '251024_641790',
  transaction_ref: '251024000114790',
  status: 'paid',
  created_at: 2025-10-24T05:52:01.795Z
}
```

#### 4.3.4. Query ZaloPay để verify
```javascript
const zpTransId = originalPayment.transaction_ref; // "251024000114790"
const appTransId = originalPayment.payment_code;   // "251024_641790"

const queryResult = await zalopayService.queryOrder(appTransId);
```

**ZaloPay Query API:**
```
POST https://sb-openapi.zalopay.vn/v2/query
Body: {
  app_id: 2554,
  app_trans_id: "251024_641790",
  mac: "...",
  timestamp: 1761285436233
}
```

**Response:**
```json
{
  "return_code": 1,
  "return_message": "Giao dịch thành công",
  "is_processing": false,
  "amount": 5000,
  "zp_trans_id": 251024000114790
}
```

**Backend log:**
```
🔍 [ZaloPay] Querying order: 251024_641790
📊 [ZaloPay] Query result: {
  return_code: 1,
  return_message: 'Giao dịch thành công',
  is_processing: false,
  amount: 5000,
  zp_trans_id: 251024000114790
}
```

**Kiểm tra:**
```javascript
if (queryResult.return_code !== 1) {
  return {
    success: false,
    message: 'Cannot refund: Transaction not found or not successful in ZaloPay'
  };
}
```

#### 4.3.5. Gọi ZaloPay Refund API

**Chuẩn bị data:**
```javascript
const timestamp = Date.now();
const refundID = Math.floor(Math.random() * 1000000);
const m_refund_id = `${moment().format('YYMMDD')}_${config.app_id}_${refundID}`;
// Ví dụ: 251024_2554_724825

const zpTransIdStr = String(zpTransId);           // "251024000114790"
const refundAmount = Math.round(Number(amount));  // 5000
const refundFeeAmount = 0;                        // Merchant không tính phí
```

**Tính MAC signature** (với KEY1):
```javascript
// ⚠️ QUAN TRỌNG: Phải bao gồm refund_fee_amount trong MAC
const macInput = `${app_id}|${zpTransIdStr}|${refundAmount}|${refundFeeAmount}|${description}|${timestamp}`;
// Ví dụ: "2554|251024000114790|5000|0|Có việc đột xuất|1761285743484"

const mac = CryptoJS.HmacSHA256(macInput, KEY1).toString();
```

**Gọi API:**
```javascript
const refundData = {
  app_id: Number(config.app_id),    // 2554
  m_refund_id,                      // "251024_2554_724825"
  zp_trans_id: zpTransIdStr,        // "251024000114790"
  amount: refundAmount,             // 5000
  refund_fee_amount: refundFeeAmount, // 0
  timestamp,                        // 1761285743484
  description,                      // "Có việc đột xuất"
  mac                               // "78bd84318edff26b0b5e..."
};

const result = await axios.post(
  `${config.endpoint}/v2/refund`, 
  refundData,
  { headers: { 'Content-Type': 'application/json' } }
);
```

**Backend log:**
```
💸 [Refund] Calling ZaloPay refund API with zp_trans_id: 251024000114790
💸 [ZaloPay] Creating refund: {
  m_refund_id: '251024_2554_724825',
  zp_trans_id: '251024000114790',
  amount: 5000,
  refund_fee_amount: 0,
  description: 'Có việc đột xuất',
  mac_input: '2554|251024000114790|5000|0|Có việc đột xuất|1761285743484',
  mac: '78bd84318edff26b0b5e...'
}
```

**ZaloPay Response:**
```json
{
  "return_code": 3,
  "return_message": "Giao dịch đang refund!",
  "sub_return_code": 2,
  "sub_return_message": "Giao dịch đang refund!",
  "refund_id": 251024000115043
}
```

**Backend log:**
```
✅ [ZaloPay] Refund response: {
  return_code: 3,
  return_message: 'Giao dịch đang refund!',
  sub_return_code: 2,
  sub_return_message: 'Giao dịch đang refund!',
  refund_id: 251024000115043
}
```

**ZaloPay Return Codes:**
- `1`: Refund thành công ngay lập tức
- `2`: Refund thất bại
- `3`: **Refund đang xử lý** (processing - phổ biến nhất)

#### 4.3.6. Lưu refund record

```javascript
// Tạo Payment record mới cho refund
const refund = await Payment.create({
  booking_id: booking.id,
  payment_method: 'zalopay_refund',
  payment_code: m_refund_id,              // "251024_2554_724825"
  amount: -(booking.total_price || 0),    // -5000 (số âm)
  qr_url: null,
  expire_at: null,
  status: 'refunded',
  transaction_ref: String(refundId),      // "251024000115043"
  response_code: String(return_code),     // "3"
  secure_hash: reason,                    // "Có việc đột xuất"
  created_at: new Date()
});
```

#### 4.3.7. Cập nhật records

```javascript
// 1. Cập nhật Payment gốc
originalPayment.status = 'refunded';
await originalPayment.save();

// 2. Cập nhật Booking
booking.status = 'refunded';
await booking.save();

// 3. Giải phóng ghế (optional - tùy business logic)
const bookingSeats = await BookingSeat.findAll({
  where: { booking_id: booking.id }
});

for (const bs of bookingSeats) {
  await Seat.update(
    { status: 'available' },
    { where: { id: bs.seat_id } }
  );
}
```

#### 4.3.8. Commit transaction

```javascript
await t.commit();

return {
  success: true,
  booking: booking.toJSON(),
  refund: refund.toJSON(),
  zalopay_refund: {
    return_code: 3,
    refund_id: 251024000115043,
    m_refund_id: "251024_2554_724825"
  },
  message: "Yêu cầu hoàn tiền đã được gửi đến ZaloPay! Tiền sẽ được hoàn vào tài khoản ZaloPay của bạn trong vòng 1-3 ngày làm việc."
};
```

### 4.4. Bước 3: Frontend nhận kết quả

**Response:**
```json
{
  "success": true,
  "message": "Yêu cầu hoàn tiền đã được gửi đến ZaloPay! Tiền sẽ được hoàn vào tài khoản ZaloPay của bạn trong vòng 1-3 ngày làm việc.",
  "booking": {
    "id": 69,
    "status": "refunded"
  }
}
```

**Frontend:**
- ✅ Hiển thị thông báo thành công
- 🔄 Reload danh sách vé
- 📧 (Optional) Gửi email xác nhận hoàn tiền

**Kết quả:**
- Booking status: `refunded`
- Payment gốc status: `refunded`
- Refund Payment record đã tạo với amount âm
- User sẽ nhận tiền trong 1-3 ngày làm việc

---

## 5. KIỂM TRA VÀ XỬ LÝ LỖI

### 5.1. Kiểm tra Ngrok hoạt động

**Cách 1: Xem Web Interface**
```
http://127.0.0.1:4040
→ Xem tất cả requests đến ngrok
→ Kiểm tra ZaloPay callback có gọi về không
```

**Cách 2: Test callback endpoint**
```powershell
curl https://xxxxx.ngrok-free.dev/api/zalopay/callback
```

### 5.2. Debug ZaloPay Callback

**Backend log quan trọng:**
```
📬 [ZaloPay Callback] Received: {...}
🔐 [ZaloPay] Callback MAC verification: { valid: true }
✅ [ZaloPay Callback] Valid payment: {...}
✅ [ZaloPay Callback] Booking 69 confirmed successfully
```

**Nếu không nhận được callback:**
1. Kiểm tra ngrok có đang chạy không
2. Kiểm tra `ZALOPAY_CALLBACK_URL` trong .env
3. Kiểm tra firewall/antivirus
4. Xem log tại http://127.0.0.1:4040

### 5.3. Debug Refund

**Các lỗi thường gặp:**

#### Lỗi 1: MAC verification failed (-402)
```
sub_return_code: -402
sub_return_message: 'Thông tin xác thực không đúng'
```

**Nguyên nhân:** MAC signature sai

**Giải pháp:**
- Kiểm tra KEY1 trong .env
- Đảm bảo MAC input đúng format: `app_id|zp_trans_id|amount|refund_fee_amount|description|timestamp`
- ⚠️ **Phải bao gồm `refund_fee_amount` trong MAC input!**

#### Lỗi 2: Invalid transaction (-401)
```
sub_return_code: -401
sub_return_message: 'Dữ liệu yêu cầu không hợp lệ'
```

**Nguyên nhân:** 
- `zp_trans_id` không tồn tại
- Transaction chưa được thanh toán

**Giải pháp:**
- Query ZaloPay trước khi refund
- Kiểm tra `transaction_ref` có được lưu đúng không

#### Lỗi 3: Database constraint
```
The UPDATE statement conflicted with the CHECK constraint "CK_bookings_status"
```

**Nguyên nhân:** Status `'refunded'` không có trong constraint

**Giải pháp:**
```sql
ALTER TABLE bookings DROP CONSTRAINT CK_bookings_status;
ALTER TABLE bookings ADD CONSTRAINT CK_bookings_status 
CHECK ([status]='locked' OR [status]='pending' OR [status]='confirmed' 
       OR [status]='cancelled' OR [status]='expired' OR [status]='refunded');
```

### 5.4. Query trạng thái refund

**API để kiểm tra:**
```
GET /api/zalopay/query-refund/251024_2554_724825
```

**ZaloPay API:**
```
POST https://sb-openapi.zalopay.vn/v2/query_refund
Body: {
  app_id: 2554,
  m_refund_id: "251024_2554_724825",
  timestamp: 1761285743484,
  mac: "..."
}
```

**Response:**
```json
{
  "return_code": 1,
  "return_message": "Hoàn tiền thành công",
  "refund_id": 251024000115043,
  "amount": 5000
}
```

---

## 6. TỔNG KẾT FLOW

### 6.1. Payment Flow
```
1. User chọn ghế
   ↓
2. POST /api/bookings/lock-seat
   → Booking: locked
   → Seat: locked
   ↓
3. POST /api/bookings/{id}/create-sepay-qr
   → Tạo app_trans_id
   → Gọi ZaloPay /v2/create
   → Lưu Payment (status: pending)
   → Booking: pending
   ↓
4. Frontend hiển thị QR Code
   → Countdown 5 phút
   → Polling status mỗi 3s
   ↓
5. User quét QR bằng ZaloPay app
   → ZaloPay trừ tiền
   ↓
6. ZaloPay gọi callback qua ngrok
   → POST /api/zalopay/callback
   → Verify MAC (KEY2)
   → Lưu zp_trans_id
   → Payment: paid
   → Booking: confirmed
   → Seat: booked
   ↓
7. Frontend nhận status = confirmed
   → Hiển thị thành công
   → Chuyển sang My Tickets
```

### 6.2. Refund Flow
```
1. User vào My Tickets
   → Xem vé đã đặt
   ↓
2. Click "Hoàn tiền" (nếu đủ điều kiện)
   → Status = confirmed
   → > 2 giờ trước showtime
   ↓
3. POST /api/bookings/{id}/refund
   → Validate ownership
   → Validate thời gian
   → Query ZaloPay (/v2/query)
   ↓
4. Gọi ZaloPay Refund API
   → Tạo m_refund_id
   → Tính MAC (KEY1) với refund_fee_amount
   → POST /v2/refund
   ↓
5. ZaloPay xử lý
   → return_code: 3 (processing)
   → Trả về refund_id
   ↓
6. Backend cập nhật
   → Tạo Payment (zalopay_refund, amount âm)
   → Payment gốc: refunded
   → Booking: refunded
   → Seat: available
   ↓
7. Frontend nhận kết quả
   → Hiển thị "Yêu cầu hoàn tiền thành công"
   → User nhận tiền trong 1-3 ngày
```

---

## 7. CHECKLIST TRƯỚC KHI CHẠY

### Backend:
- [ ] File `.env` đã cấu hình đúng
- [ ] Database constraint cho phép status `'refunded'`
- [ ] `ZALOPAY_CALLBACK_URL` trỏ đúng ngrok URL
- [ ] Port 8080 không bị chiếm

### Ngrok:
- [ ] Ngrok đã cài đặt và đăng nhập
- [ ] Lấy được public URL (https://xxxxx.ngrok-free.dev)
- [ ] Cập nhật URL vào `.env`
- [ ] Web interface hoạt động (http://127.0.0.1:4040)

### Frontend:
- [ ] Port 3000 không bị chiếm
- [ ] Đã login với user có booking
- [ ] Browser không block localStorage

### ZaloPay:
- [ ] ZaloPay sandbox credentials đúng (APP_ID: 2554)
- [ ] KEY1 và KEY2 chính xác
- [ ] ZaloPay app đã cài trên điện thoại
- [ ] Có tiền trong ví ZaloPay sandbox

---

## 8. THÔNG TIN KỸ THUẬT

### 8.1. MAC Signature

**Payment (KEY1):**
```
app_id|app_trans_id|app_user|amount|app_time|embed_data|item
```

**Callback verify (KEY2):**
```
data_string (toàn bộ JSON)
```

**Query (KEY1):**
```
app_id|app_trans_id|timestamp
```

**Refund (KEY1):**
```
app_id|zp_trans_id|amount|refund_fee_amount|description|timestamp
```
**⚠️ Lưu ý:** Phải bao gồm `refund_fee_amount` ngay cả khi = 0!

### 8.2. Data Types

**Quan trọng - ZaloPay yêu cầu:**
- `app_id`: **Number** (2554)
- `zp_trans_id`: **String** ("251024000114790")
- `amount`: **Number** (5000)
- `refund_fee_amount`: **Number** (0)
- `timestamp`: **Number** (1761285743484)

### 8.3. Timing

- **Lock ghế:** 5 phút
- **Payment QR:** 5 phút
- **Callback timeout:** 30 giây
- **Refund processing:** 1-3 ngày làm việc
- **Refund cutoff:** 2 giờ trước showtime

---

## 9. LƯU Ý QUAN TRỌNG

1. **Ngrok URL thay đổi mỗi lần restart** → Luôn cập nhật vào `.env`
2. **MAC signature phải chính xác 100%** → Sai 1 ký tự là lỗi
3. **Refund phải bao gồm `refund_fee_amount`** → Ngay cả khi = 0
4. **Status transition phải đúng thứ tự:**
   - Payment: `pending` → `paid` → `refunded`
   - Booking: `locked` → `pending` → `confirmed` → `refunded`
5. **Transaction ref phải được lưu từ callback** → Không có thì không refund được
6. **Database constraint phải cho phép `'refunded'`** → Thêm vào CHECK constraint

---

## 10. SUPPORT & DEBUGGING

**Backend logs quan trọng:**
```
✅ - Thành công
❌ - Lỗi
📤 - Gửi request
📬 - Nhận callback
🔐 - Verify MAC
💸 - Refund operation
📊 - Query result
```

**Tools:**
- Ngrok dashboard: http://127.0.0.1:4040
- ZaloPay sandbox: https://sb-openapi.zalopay.vn
- Database: SQL Server Management Studio

**ZaloPay docs:**
- Payment: https://docs.zalopay.vn/v2/start/
- Refund: https://docs.zalopay.vn/v2/refund/

---

**🎉 Chúc bạn triển khai thành công!**
