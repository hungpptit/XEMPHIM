# Environment Variables Guide — XEMPHIM

Danh sách đầy đủ các biến môi trường cần cấu hình. Tạo file `.env` ở thư mục gốc.

> ⚠️ **Không commit file `.env` lên Git!** File này đã được thêm vào `.gitignore`.

---

## Template đầy đủ

```env
# ─────────────────────────────────────────
# Application
# ─────────────────────────────────────────
NODE_ENV=development
PORT=8080
HOSTNAME=localhost

# ─────────────────────────────────────────
# Microsoft SQL Server
# ─────────────────────────────────────────
DB_HOST=localhost
DB_PORT=1433
DB_USERNAME=sa
DB_PASS=YourStrong@Password123
DB_ENCRYPT=false
SA_PASSWORD=YourStrong@Password123

# Database Names
USER_DB_NAME=XemPhim_User
MOVIE_DB_NAME=XemPhim_Movie
SEAT_DB_NAME=XemPhim_Seat
BOOKING_DB_NAME=XemPhim_Booking
PAYMENT_DB_NAME=XemPhim_Payment

# ─────────────────────────────────────────
# Service Ports (optional - defaults below)
# ─────────────────────────────────────────
USER_SERVICE_PORT=4001
MOVIE_SERVICE_PORT=4002
SEAT_SERVICE_PORT=4003
BOOKING_SERVICE_PORT=4004
PAYMENT_SERVICE_PORT=4005
NOTIFICATION_SERVICE_PORT=4006

# Service internal URLs (used for inter-service calls)
USER_SERVICE_URL=http://localhost:4001
MOVIE_SERVICE_URL=http://localhost:4002
SEAT_SERVICE_URL=http://localhost:4003
PAYMENT_SERVICE_URL=http://localhost:4005
NOTIFICATION_SERVICE_URL=http://localhost:4006

# ─────────────────────────────────────────
# JWT Configuration
# ─────────────────────────────────────────
JWT_SECRET=change_this_to_a_very_long_random_secret_key
JWT_EXPIRE=7d

# ─────────────────────────────────────────
# Redis (Optional — enables cache + distributed lock)
# ─────────────────────────────────────────
# Leave empty to disable Redis (fallback to DB lock)
REDIS_URL=redis://localhost:6379

# ─────────────────────────────────────────
# RabbitMQ (Optional — enables async notifications)
# ─────────────────────────────────────────
# Leave empty to fallback to HTTP notification
RABBITMQ_URL=amqp://localhost
# Or use CloudAMQP:
# CLOUDAMQP_URL=amqps://user:pass@fox.rmq.cloudamqp.com/vhost

# ─────────────────────────────────────────
# ZaloPay (Sandbox)
# ─────────────────────────────────────────
APP_ID=2554
KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn
# Requires Ngrok tunnel for local development:
ZALOPAY_CALLBACK_URL=https://your-subdomain.ngrok-free.dev/api/zalopay/callback

# ─────────────────────────────────────────
# Email — Nodemailer (Gmail SMTP)
# ─────────────────────────────────────────
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM="XemPhim PTIT <your_email@gmail.com>"
```

---

## Biến bắt buộc

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | SQL Server hostname | `localhost` |
| `DB_USERNAME` | SQL Server username | `sa` |
| `DB_PASS` | SQL Server password | `YourStrong@Password` |
| `JWT_SECRET` | Secret key cho JWT signing | Chuỗi ngẫu nhiên ≥ 32 ký tự |

---

## Biến tùy chọn (Optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `REDIS_URL` | *(none)* | Nếu không set → fallback to DB lock |
| `RABBITMQ_URL` | *(none)* | Nếu không set → fallback to HTTP notification |
| `ZALOPAY_CALLBACK_URL` | *(hardcoded)* | Cần Ngrok URL cho local dev |
| `EMAIL_USER` / `EMAIL_PASS` | *(none)* | Cần để gửi email xác nhận vé |

---

## Tạo Gmail App Password

1. Vào [Google Account Security](https://myaccount.google.com/security)
2. Bật **2-Factor Authentication**
3. Tìm **App passwords** → Create
4. Chọn `Mail` + `Windows Computer`
5. Copy 16-character password → dùng làm `EMAIL_PASS`

---

## Tạo JWT Secret an toàn

```bash
# PowerShell
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

*Xem thêm: [ZaloPay Integration Guide](./zalopay-integration.md) | [Database Setup](./database-setup.md)*
