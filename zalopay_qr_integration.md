# 📘 Hướng dẫn tích hợp ZaloPay QR Động (Dynamic QR)

## 🧩 Mục đích
Tài liệu này hướng dẫn quy trình **tích hợp thanh toán ZaloPay bằng QR Động (Dynamic QR)** trong môi trường **sandbox hoặc production**, cho phép tạo mã QR thanh toán riêng cho từng đơn hàng — phù hợp với web hoặc app có backend xử lý linh hoạt.

---

## ⚙️ I. Chuẩn bị môi trường

### 1️⃣ Tài khoản và thông tin tích hợp
- Đăng ký merchant với ZaloPay để lấy thông tin `APP_ID`, `KEY1`, `KEY2`.
- **Không lưu key trực tiếp trong mã nguồn**, hãy đặt trong file `.env`:

```
APP_ID=2554
KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
```

> ⚠️ Khi deploy production, thay bằng thông tin thật do ZaloPay cấp và bảo mật `.env` khỏi public repo.

### 2️⃣ Tài liệu tham khảo
- [ZaloPay Dynamic QR Guide](https://docs.zalopay.vn/vi/docs/guides/payment-acceptance/qrcode/dynamic-qr)

---

## 🔁 II. Luồng hoạt động tổng quan

```plaintext
Client (User)
   ↓
Backend (Tạo đơn → gọi API CreateOrder)
   ↓
ZaloPay trả về order_url hoặc zp_trans_token
   ↓
Hiển thị mã QR để User quét thanh toán
   ↓
ZaloPay → gửi callback kết quả về backend
```

---

## 🧱 III. Triển khai chi tiết

### 🔹 1. Cấu hình `.env`
```bash
APP_ID=2554
KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
```

### 🔹 2. Tạo đơn hàng (API CreateOrder)
Ví dụ Node.js backend:

```js
import axios from "axios";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();

const createOrder = async (req, res) => {
  const { APP_ID, KEY1, ZALOPAY_ENDPOINT } = process.env;

  const app_trans_id = `${Date.now()}`; // ID đơn hàng duy nhất
  const amount = 50000; // VNĐ
  const app_time = Date.now();
  const app_user = "demo_user";
  const embed_data = {};
  const item = [];

  const data = `${APP_ID}|${app_trans_id}|${app_user}|${amount}|${app_time}|${JSON.stringify(embed_data)}|${JSON.stringify(item)}`;
  const mac = CryptoJS.HmacSHA256(data, KEY1).toString();

  const payload = {
    app_id: APP_ID,
    app_trans_id,
    app_time,
    app_user,
    amount,
    embed_data: JSON.stringify(embed_data),
    item: JSON.stringify(item),
    description: `Thanh toan don hang ${app_trans_id}`,
    callback_url: "https://yourdomain.com/api/zalopay/callback",
    mac,
  };

  const result = await axios.post(`${ZALOPAY_ENDPOINT}/v2/create`, null, { params: payload });

  res.json(result.data);
};
```

✅ **Kết quả trả về:**
```json
{
  "return_code": 1,
  "zp_trans_token": "abcdef...",
  "order_url": "https://sandbox.zalopay.vn/pay/demo123..."
}
```

---

### 🔹 3. Sinh mã QR từ `order_url`

Sử dụng thư viện `qrcode`:

```js
import QRCode from "qrcode";

QRCode.toFile("dynamic_qr.png", order_url, (err) => {
  if (err) throw err;
  console.log("✅ Mã QR động đã được tạo: dynamic_qr.png");
});
```

Hoặc hiển thị trực tiếp trên frontend:
```jsx
<QRCode value={order_url} size={220} />
```

---

### 🔹 4. Callback nhận kết quả thanh toán

Backend cần endpoint `/zalopay/callback` để nhận callback từ ZaloPay:

```js
import express from "express";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/api/zalopay/callback", (req, res) => {
  const { data, mac } = req.body;
  const { KEY2 } = process.env;

  const macCheck = CryptoJS.HmacSHA256(data, KEY2).toString();
  if (macCheck !== mac) {
    console.log("❌ Sai chữ ký MAC");
    return res.json({ return_code: -1, return_message: "mac not equal" });
  }

  const order = JSON.parse(data);
  console.log("✅ Thanh toán thành công:", order);

  // TODO: cập nhật trạng thái đơn hàng trong DB
  res.json({ return_code: 1, return_message: "success" });
});

app.listen(8888, () => console.log("🚀 Callback server chạy tại cổng 8888"));
```

---

### 🔹 5. Truy vấn trạng thái đơn hàng (QueryOrder)

```js
import axios from "axios";
import CryptoJS from "crypto-js";
import dotenv from "dotenv";

dotenv.config();

const { APP_ID, KEY1, ZALOPAY_ENDPOINT } = process.env;
const app_trans_id = "..."; // ID đơn hàng đã tạo

const mac = CryptoJS.HmacSHA256(`${APP_ID}|${app_trans_id}|${KEY1}`, KEY1).toString();

axios.post(`${ZALOPAY_ENDPOINT}/v2/query`, null, {
  params: { app_id: APP_ID, app_trans_id, mac }
});
```

---

## 🧭 IV. Luồng hoạt động chi tiết
```plaintext
1️⃣ Client nhấn “Thanh toán”
2️⃣ Backend gọi API CreateOrder → lấy order_url
3️⃣ Frontend hiển thị QR động
4️⃣ User quét QR bằng app ZaloPay
5️⃣ ZaloPay gửi callback → backend xác nhận
6️⃣ Backend cập nhật trạng thái đơn hàng
```

---

## ⚠️ V. Lưu ý quan trọng
| Mục | Nội dung |
|------|-----------|
| 🧪 Sandbox | Không dùng tiền thật, chỉ test luồng |
| ⏱️ QR động | Mỗi đơn hàng có QR riêng, hết hạn sau vài phút |
| 🔐 Callback | Phải xác thực chữ ký `mac` bằng `key2` |
| ⚙️ Bảo mật | Không log trực tiếp key1/key2, lưu trong `.env` |
| 🤝 Production | Cần ký hợp đồng chính thức với ZaloPay |

---

## 📚 VI. Tham khảo
- [Dynamic QR – ZaloPay Docs](https://docs.zalopay.vn/vi/docs/guides/payment-acceptance/qrcode/dynamic-qr)
- [Quickstart NodeJS Sample](https://github.com/zalopay-samples/quickstart-nextjs-dynamic-qrcode)

---

## ✅ Kết luận
Tài liệu này giúp bạn:
- Tạo đơn hàng động qua API `CreateOrder`.
- Sinh mã QR thanh toán động cho từng đơn.
- Xử lý callback và truy vấn trạng thái giao dịch.
- Bảo mật cấu hình bằng `.env` để dùng cho môi trường thực tế.

