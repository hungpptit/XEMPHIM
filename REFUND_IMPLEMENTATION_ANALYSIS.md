# 🔍 Phân tích khả năng triển khai Refund Flow

**Ngày phân tích:** 23/10/2025  
**Tài liệu tham khảo:** `refund_flow.md`

---

## ✅ TÓM TẮT: CÓ THỂ TRIỂN KHAI ĐƯỢC

Hệ thống hiện tại **đã có nền tảng cơ bản** để hỗ trợ refund flow, nhưng **cần bổ sung thêm:**
1. Bảng `RefundRequests` (chưa có)
2. Bảng `UserBankAccounts` (chưa có)
3. Các API endpoints mới cho refund workflow
4. Cập nhật webhook server để xử lý refund confirmation

---

## 📊 1. ĐÁNH GIÁ DB HIỆN TẠI

### ✅ Những gì đã có (từ DB diagram):

| Bảng | Cột quan trọng | Trạng thái |
|------|---------------|-----------|
| `bookings` | `id`, `user_id`, `showtime_id`, `booking_code`, `total_price`, `status` | ✅ Đã có |
| `payments` | `id`, `booking_id`, `payment_method`, `amount`, `status`, `transaction_ref` | ✅ Đã có |
| `users` | `id`, `full_name`, `email`, `phone_number`, `role` | ✅ Đã có |
| `showtimes` | `id`, `movie_id`, `start_time`, `end_time` | ✅ Đã có (để check thời gian trước giờ chiếu) |

### ❌ Những gì còn thiếu:

#### 1. Bảng `RefundRequests` (cần tạo mới)

```sql
CREATE TABLE refund_requests (
  id INT PRIMARY KEY IDENTITY(1,1),
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  reason NVARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, approved, done, rejected
  external_ref VARCHAR(100),  -- reference_number từ SePay webhook
  qr_url NVARCHAR(500),
  created_at DATETIME DEFAULT GETUTCDATE(),
  processed_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index để tìm nhanh
CREATE INDEX idx_refund_booking ON refund_requests(booking_id);
CREATE INDEX idx_refund_status ON refund_requests(status);
```

#### 2. Bảng `UserBankAccounts` (cần tạo mới)

```sql
CREATE TABLE user_bank_accounts (
  id INT PRIMARY KEY IDENTITY(1,1),
  user_id INT NOT NULL,
  bank_code VARCHAR(20) NOT NULL,  -- VCB, TPB, VTB, etc.
  account_number VARCHAR(50) NOT NULL,
  account_name NVARCHAR(100) NOT NULL,
  is_primary BIT DEFAULT 0,
  is_verified BIT DEFAULT 0,
  created_at DATETIME DEFAULT GETUTCDATE(),
  updated_at DATETIME DEFAULT GETUTCDATE(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index
CREATE INDEX idx_bank_user ON user_bank_accounts(user_id);
```

**Lưu ý bảo mật:** Nên mã hóa `account_number` bằng AES-256 hoặc lưu qua service riêng.

---

## 🧩 2. ĐÁNH GIÁ CODE BACKEND HIỆN TẠI

### ✅ Những gì đã có:

#### A. Service `bookingService.js`
```javascript
// Đã có function refundBooking
export const refundBooking = async ({ booking_id, reason = null }) => {
  // ✅ Kiểm tra booking.status === 'confirmed'
  // ✅ Tạo Payment âm với status='refunded'
  // ✅ Cập nhật Payments cũ thành 'refunded'
  // ✅ Cập nhật Bookings.status='refunded'
}
```

**Vấn đề:** Function này là **refund trực tiếp**, không qua workflow phê duyệt (pending → approved → done).

#### B. Controller & Route
```javascript
// backend/src/controllers/bookingController.js
export const refundBookingHandler = async (req, res) => { ... }

// backend/src/routes/bookingRoutes.js
router.post('/:bookingId/refund', bookingController.refundBookingHandler);
```

**Endpoint hiện tại:** `POST /api/bookings/:bookingId/refund`  
→ Refund ngay lập tức, không có bước "user request → admin approve → payment".

---

### ❌ Những gì cần bổ sung:

#### 1. Model `RefundRequest`
Tạo file `backend/src/models/refund_request.js`:

```javascript
export default (sequelize, DataTypes) => {
  const RefundRequest = sequelize.define('RefundRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    refund_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING(500)
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending'
    },
    external_ref: {
      type: DataTypes.STRING(100)
    },
    qr_url: {
      type: DataTypes.STRING(500)
    },
    created_at: {
      type: DataTypes.DATE
    },
    processed_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'refund_requests',
    timestamps: false
  });

  return RefundRequest;
};
```

#### 2. Model `UserBankAccount`
Tạo file `backend/src/models/user_bank_account.js`:

```javascript
export default (sequelize, DataTypes) => {
  const UserBankAccount = sequelize.define('UserBankAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    bank_code: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    account_number: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    account_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    is_primary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    created_at: {
      type: DataTypes.DATE
    },
    updated_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'user_bank_accounts',
    timestamps: false
  });

  return UserBankAccount;
};
```

#### 3. Service `refundService.js` (mới)

Tạo file `backend/src/services/refundService.js`:

```javascript
import { RefundRequest, Booking, Payment, UserBankAccount, Showtime, sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

// 1. User tạo yêu cầu hoàn tiền
export const createRefundRequest = async ({ booking_id, user_id, reason }) => {
  const t = await sequelize.transaction();
  try {
    // Kiểm tra booking
    const booking = await Booking.findByPk(booking_id, {
      include: [{ model: Showtime }],
      transaction: t
    });
    
    if (!booking) {
      await t.rollback();
      return { success: false, message: 'Booking not found' };
    }

    if (booking.status !== 'confirmed') {
      await t.rollback();
      return { success: false, message: 'Only confirmed bookings can be refunded' };
    }

    // Kiểm tra thời gian (90 phút trước giờ chiếu)
    const now = new Date();
    const showtimeStart = new Date(booking.Showtime.start_time);
    const minutesUntilShow = (showtimeStart - now) / (1000 * 60);
    
    if (minutesUntilShow < 90) {
      await t.rollback();
      return { success: false, message: 'Cannot refund within 90 minutes of showtime' };
    }

    // Kiểm tra đã có refund request chưa
    const existingRefund = await RefundRequest.findOne({
      where: { booking_id, status: ['pending', 'approved'] },
      transaction: t
    });

    if (existingRefund) {
      await t.rollback();
      return { success: false, message: 'Refund request already exists for this booking' };
    }

    // Tạo refund request
    const refundRequest = await RefundRequest.create({
      booking_id,
      user_id,
      refund_amount: booking.total_price,
      reason,
      status: 'pending',
      created_at: new Date()
    }, { transaction: t });

    await t.commit();
    return { success: true, refundRequest: refundRequest.toJSON() };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// 2. Admin lấy danh sách refund requests
export const getRefundRequests = async ({ status = null, limit = 50 }) => {
  const where = status ? { status } : {};
  
  const requests = await RefundRequest.findAll({
    where,
    include: [
      { model: Booking, attributes: ['id', 'booking_code', 'total_price', 'status'] },
      { model: User, attributes: ['id', 'full_name', 'email', 'phone_number'] }
    ],
    order: [['created_at', 'DESC']],
    limit
  });

  return requests;
};

// 3. Admin sinh QR refund
export const generateRefundQR = async ({ refund_id }) => {
  const t = await sequelize.transaction();
  try {
    const refundRequest = await RefundRequest.findByPk(refund_id, {
      include: [{ model: Booking }],
      transaction: t
    });

    if (!refundRequest) {
      await t.rollback();
      return { success: false, message: 'Refund request not found' };
    }

    if (refundRequest.status !== 'pending') {
      await t.rollback();
      return { success: false, message: 'Refund request already processed' };
    }

    // Lấy thông tin STK user
    const userBank = await UserBankAccount.findOne({
      where: { user_id: refundRequest.user_id, is_primary: true },
      transaction: t
    });

    if (!userBank) {
      await t.rollback();
      return { success: false, message: 'User bank account not found. User needs to add bank info.' };
    }

    // Sinh QR URL
    const amount = Number(refundRequest.refund_amount);
    const addInfo = `HT-BOOK${refundRequest.booking_id}-${refundRequest.Booking.booking_code}`;
    const qrUrl = `https://img.vietqr.io/image/${userBank.bank_code}-${userBank.account_number}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}`;

    // Cập nhật refund request
    refundRequest.qr_url = qrUrl;
    refundRequest.status = 'approved';
    await refundRequest.save({ transaction: t });

    await t.commit();
    return { 
      success: true, 
      qr_url: qrUrl,
      refundRequest: refundRequest.toJSON(),
      bankAccount: {
        bank_code: userBank.bank_code,
        account_number: userBank.account_number,
        account_name: userBank.account_name
      }
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// 4. Webhook xác nhận refund đã chuyển tiền
export const confirmRefund = async ({ bookingId, bookingCode, amount, reference, transactionDate }) => {
  const t = await sequelize.transaction();
  try {
    // Tìm refund request
    const refundRequest = await RefundRequest.findOne({
      where: { 
        booking_id: bookingId,
        status: 'approved'
      },
      include: [{ model: Booking }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!refundRequest) {
      await t.rollback();
      return { success: false, message: 'Approved refund request not found for this booking' };
    }

    // Verify booking code
    if (refundRequest.Booking.booking_code !== bookingCode) {
      await t.rollback();
      return { success: false, message: 'Booking code mismatch' };
    }

    // Verify amount
    if (Math.abs(Number(amount) - Number(refundRequest.refund_amount)) > 0.01) {
      await t.rollback();
      return { success: false, message: 'Refund amount mismatch' };
    }

    // Cập nhật refund request
    refundRequest.status = 'done';
    refundRequest.external_ref = reference;
    refundRequest.processed_at = new Date(transactionDate);
    await refundRequest.save({ transaction: t });

    // Tạo Payment âm
    await Payment.create({
      booking_id: bookingId,
      payment_method: 'refund',
      payment_code: `REFUND-${uuidv4()}`,
      amount: -Number(amount),
      status: 'refunded',
      transaction_ref: reference,
      created_at: new Date(transactionDate)
    }, { transaction: t });

    // Cập nhật Payments cũ
    await Payment.update(
      { status: 'refunded' },
      { where: { booking_id: bookingId, status: 'paid' }, transaction: t }
    );

    // Cập nhật Booking
    await Booking.update(
      { status: 'refunded' },
      { where: { id: bookingId }, transaction: t }
    );

    await t.commit();
    return { success: true, message: 'Refund confirmed successfully', refundRequest: refundRequest.toJSON() };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

export default {
  createRefundRequest,
  getRefundRequests,
  generateRefundQR,
  confirmRefund
};
```

#### 4. Controller `refundController.js` (mới)

Tạo file `backend/src/controllers/refundController.js`:

```javascript
import refundService from '../services/refundService.js';

// POST /api/refunds - User tạo yêu cầu hoàn tiền
export const createRefundRequestHandler = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    const userId = req.user?.id; // Từ JWT middleware

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await refundService.createRefundRequest({
      booking_id: bookingId,
      user_id: userId,
      reason
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating refund request:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/refunds - Admin xem danh sách
export const getRefundRequestsHandler = async (req, res) => {
  try {
    const { status, limit } = req.query;
    const requests = await refundService.getRefundRequests({ status, limit: Number(limit) || 50 });
    res.json({ refunds: requests });
  } catch (err) {
    console.error('Error getting refund requests:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/refunds/:id/qr - Admin sinh QR
export const generateRefundQRHandler = async (req, res) => {
  try {
    const refundId = parseInt(req.params.id);
    const result = await refundService.generateRefundQR({ refund_id: refundId });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error('Error generating refund QR:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/refunds/confirm - Webhook callback
export const confirmRefundHandler = async (req, res) => {
  try {
    const { bookingId, bookingCode, amount, reference, transactionDate } = req.body;

    const result = await refundService.confirmRefund({
      bookingId,
      bookingCode,
      amount,
      reference,
      transactionDate
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error('Error confirming refund:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  createRefundRequestHandler,
  getRefundRequestsHandler,
  generateRefundQRHandler,
  confirmRefundHandler
};
```

#### 5. Routes `refundRoutes.js` (mới)

Tạo file `backend/src/routes/refundRoutes.js`:

```javascript
import express from 'express';
import refundController from '../controllers/refundController.js';
// import { authenticateJWT, requireAdmin } from '../middlewares/auth.js'; // Nếu có

const router = express.Router();

// User tạo yêu cầu hoàn tiền
router.post('/', refundController.createRefundRequestHandler);

// Admin xem danh sách yêu cầu
router.get('/', refundController.getRefundRequestsHandler);

// Admin sinh QR refund
router.post('/:id/qr', refundController.generateRefundQRHandler);

// Webhook callback từ SePay (via webhook server)
router.post('/confirm', refundController.confirmRefundHandler);

export default router;
```

Đăng ký route trong `backend/src/index.js`:

```javascript
import refundRoutes from './routes/refundRoutes.js';

// ...
app.use('/api/refunds', refundRoutes);
```

---

## 🔧 3. ĐÁNH GIÁ WEBHOOK SERVER HIỆN TẠI

### ✅ Những gì đã có:

```javascript
// ✅ Đã phân biệt inbound/outbound
const isInbound = parseFloat(amount_in || 0) > 0;
const isOutbound = parseFloat(amount_out || 0) > 0;

// ✅ Đã có logic parse HT-BOOK...
if (isOutbound) {
  const match = transaction_content?.match(/HT-BOOK(\d+)-([A-Za-z0-9\-]+)/);
  if (match) {
    const bookingId = parseInt(match[1]);
    const bookingCode = match[2];
    // ✅ Gọi notifyBackend("refund", ...)
  }
}

// ✅ Đã có hàm notifyBackend
async function notifyBackend(type, payload) {
  const endpoint = type === "payment"
    ? `${backendUrl}/api/payments/confirm`
    : `${backendUrl}/api/refunds/confirm`;  // ✅ Đúng endpoint
  // ...
}
```

### ✅ KẾT LUẬN: Webhook server **ĐÃ SẴN SÀNG**

Không cần chỉnh sửa gì thêm. Chỉ cần:
1. Backend tạo endpoint `/api/refunds/confirm`
2. Webhook server sẽ tự động gọi khi phát hiện giao dịch tiền ra với pattern `HT-BOOK...`

---

## 📋 4. CHECKLIST TRIỂN KHAI

### Bước 1: Tạo DB Tables
- [ ] Chạy SQL tạo bảng `refund_requests`
- [ ] Chạy SQL tạo bảng `user_bank_accounts`
- [ ] Tạo indexes

### Bước 2: Tạo Models
- [ ] `backend/src/models/refund_request.js`
- [ ] `backend/src/models/user_bank_account.js`
- [ ] Cập nhật `backend/src/models/index.js` để import 2 models mới

### Bước 3: Tạo Service Layer
- [ ] `backend/src/services/refundService.js`
  - [ ] `createRefundRequest`
  - [ ] `getRefundRequests`
  - [ ] `generateRefundQR`
  - [ ] `confirmRefund`

### Bước 4: Tạo Controller & Routes
- [ ] `backend/src/controllers/refundController.js`
- [ ] `backend/src/routes/refundRoutes.js`
- [ ] Đăng ký route trong `index.js`

### Bước 5: Frontend (nếu cần)
- [ ] Trang "My Tickets" có nút "Yêu cầu hoàn tiền"
- [ ] Modal nhập lý do hoàn tiền
- [ ] Admin dashboard để duyệt refund requests
- [ ] Hiển thị QR refund cho admin

### Bước 6: Testing
- [ ] Test API `POST /api/refunds` (user tạo request)
- [ ] Test API `GET /api/refunds` (admin xem danh sách)
- [ ] Test API `POST /api/refunds/:id/qr` (sinh QR)
- [ ] Test webhook callback với mock payload
- [ ] Test end-to-end: user → admin → webhook → DB update

---

## ⚠️ 5. LƯU Ý QUAN TRỌNG

### A. Bảo mật thông tin STK
- **PHẢI** mã hóa `UserBankAccounts.account_number` trước khi lưu DB
- Dùng AES-256-GCM với key từ `process.env.BANK_ENCRYPTION_KEY`
- Chỉ decrypt khi cần sinh QR

### B. Idempotency webhook
- Kiểm tra `external_ref` (reference_number) đã tồn tại chưa
- Tránh xử lý trùng lặp khi webhook gửi lại

### C. Time validation
- Kiểm tra `showtime.start_time - now >= 90 phút`
- Sử dụng `SYSUTCDATETIME()` để tránh lỗi timezone

### D. Transaction handling
- Tất cả operations phải wrap trong transaction
- Rollback nếu có lỗi bất kỳ

### E. Admin notification
- Khi user tạo refund request, gửi email/Slack cho admin
- Tích hợp notification service (optional)

---

## 🎯 6. KẾT LUẬN CUỐI CÙNG

### ✅ CÓ THỂ TRIỂN KHAI ĐƯỢC 100%

**Lý do:**
1. ✅ DB có đủ bảng core (bookings, payments, users, showtimes)
2. ✅ Backend đã có `refundBooking` logic cơ bản
3. ✅ Webhook server đã sẵn sàng xử lý outbound + parse HT-BOOK
4. ❌ Chỉ cần bổ sung:
   - 2 bảng mới (RefundRequests, UserBankAccounts)
   - Service/Controller/Routes mới
   - Models mới

**Thời gian ước tính:**
- DB setup: 30 phút
- Code backend: 2-3 giờ
- Testing: 1-2 giờ
- **Tổng: ~4-5 giờ** (nếu có kinh nghiệm)

**Khó khăn duy nhất:**
- User phải nhập thông tin STK trước khi yêu cầu refund
- Cần trang profile để user thêm/quản lý STK

---

## 📞 Gợi ý tiếp theo

Nếu bạn muốn, tôi có thể:
1. ✅ Tạo migration SQL để tạo 2 bảng mới
2. ✅ Tạo đầy đủ code backend (models, services, controllers, routes)
3. ✅ Tạo API docs (Postman collection)
4. ✅ Tạo test cases với mock data

Bạn muốn tôi làm bước nào trước? 🚀
