# 🚀 HƯỚNG DẪN CHẠY NGROK CHO BACKEND LOCAL (CÁCH 1)

> **Mục đích:** Cho phép Railway Webhook hoặc SePay có thể gửi dữ liệu đến **backend đang chạy trên máy local (port 8080)** thông qua đường hầm ngrok.

---

## ⚙️ 1️⃣ CÁC BƯỚC CHUẨN BỊ

### 🧩 Yêu cầu:
- Backend đang chạy trên **port 8080**  
  _(ví dụ: `http://localhost:8080`)_
- Đã **cài Node.js** (có sẵn lệnh `npx`)
- Đã **đăng ký tài khoản ngrok** và có **authtoken**

---

## ⚙️ 2️⃣ CẤU HÌNH NGROK LẦN ĐẦU

Chạy lệnh sau (chỉ cần 1 lần duy nhất để đăng ký token):

```bash
npx ngrok config add-authtoken <mã_token_ngrok_của_bạn>
```

> 📌 Ví dụ:
> ```bash
> npx ngrok config add-authtoken 33sdmVPPcGXHjYHlJIWI9kVq2aV_MZS2rBmzWDSwni8BLUqV
> ```
> Nếu hiện dòng “Authtoken saved to configuration file” → OK ✅

---

## ⚙️ 3️⃣ MỞ ĐƯỜNG HẦM NGROK MỖI KHI DEV

### Bước 1. Mở terminal tại thư mục backend
```bash
cd D:\XEMPHIM\backend
```

### Bước 2. Khởi động tunnel ngrok
```bash
npx ngrok http 8080
```

---

## ⚙️ 4️⃣ LẤY LINK NGROK PUBLIC

Sau khi chạy, ngrok sẽ hiển thị thông tin tương tự:

```
Session Status                online
Account                       phamtuanhung (Plan: Free)
Forwarding                    https://unsentiently-fattenable-daria.ngrok-free.dev -> http://localhost:8080
```

📎 **Copy link bắt đầu bằng `https://...ngrok-free.dev`**  
Đây là **địa chỉ public** mà Railway có thể gọi tới backend local của bạn.

---

## ⚙️ 5️⃣ CẬP NHẬT `.env` TRÊN RAILWAY (WEBHOOK PROJECT)

Truy cập dashboard Railway → Project webhook → Tab **Variables (.env)**  
Thay dòng `BACKEND_URL` bằng link ngrok mới:

```env
BACKEND_URL=https://unsentiently-fattenable-daria.ngrok-free.dev
```

> 💡 Mỗi lần bạn khởi động ngrok lại, link này **sẽ thay đổi**,  
> vì vậy cần cập nhật lại `.env` mỗi lần test mới.

---

## ⚙️ 6️⃣ REDEPLOY VÀ TEST

### ✅ Redeploy project webhook trên Railway  
Sau khi chỉnh `.env`, ấn “**Redeploy**” để webhook nhận giá trị mới.

### ✅ Test webhook bằng Postman hoặc Reqbin
- **Method:** `POST`
- **URL:**
  ```
  https://sepaywebhooktest-production.up.railway.app/api/sepay/webhook
  ```
- **Body (JSON):**
  ```json
  {
    "transferAmount": 5000,
  "content": "TPB;02042004666;BOOK42-0dff3b4c-5a5f-4c2b-878f-2918aaddba59",
    "accountNumber": "02042004666",
    "transactionDate": "2025-10-11 09:00:00",
    "referenceCode": "TEST12345"
  }
  ```

### ✅ Kiểm tra log
**Tại webhook (Railway):**
```
📩 Webhook nhận được: {...}
🔍 Phát hiện mã booking: BOOK42-0dff3b4c-5a5f-4c2b-878f-2918aaddba59
💰 Số tiền: 5000
🚀 Gửi xác nhận thanh toán tới backend: https://unsentiently-fattenable-daria.ngrok-free.dev/api/payments/confirm
✅ Backend phản hồi [200]: { success: true, message: "Payment confirmed for BOOK42-0dff3b4c-5a5f-4c2b-878f-2918aaddba59" }
```

**Tại backend local:**
```
POST /api/payments/confirm requested
📩 [Webhook] /api/payments/confirm called
✅ Booking BOOK42 marked as confirmed.
```

---

## ⚙️ 7️⃣ LƯU Ý QUAN TRỌNG

| Tình huống | Hành động |
|-------------|------------|
| Tắt terminal ngrok | Tunnel bị ngắt, Railway không gọi được backend |
| Khởi động lại máy | Phải chạy lại `npx ngrok http 8080` |
| Muốn link không đổi | Dùng domain cố định (Cách 2, nâng cao) |
| Deploy backend thật | Không cần ngrok nữa |

---

## ✅ TÓM TẮT NHANH

| Bước | Lệnh | Ghi chú |
|------|------|---------|
| 1️⃣ | `cd D:\XEMPHIM\backend` | Vào thư mục backend |
| 2️⃣ | `npx ngrok http 8080` | Mở tunnel ngrok |
| 3️⃣ | Copy link `https://xxxxx.ngrok-free.dev` | Dán vào `.env` Railway |
| 4️⃣ | Redeploy webhook | Nhận link mới |
| 5️⃣ | Test webhook | Kiểm tra log backend |

---

> 🧠 **Ghi nhớ:**  
> Ngrok là “cầu nối tạm thời” giữa Internet (Railway/SePay) và backend local.  
> Mỗi khi bạn dev lại hoặc restart máy, **hãy mở ngrok trước khi test webhook.**

---

© 2025 **Phạm Tuấn Hưng** – _Ngrok Local Development Guide_
