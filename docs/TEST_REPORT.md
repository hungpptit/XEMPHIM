# Test Report — XEMPHIM

**Generated**: 2026-08-22 (Updated post-security patch)  
**Branch**: `SWE_BE_1`  
**Version**: 1.0.0  
**Report Type**: Unit Test + Security Audit

---

## Executive Summary

| Category | Result |
|----------|--------|
| Total Test Suites | 3 |
| Total Unit Tests | **25 tests** |
| Tests Passed | ✅ **25 / 25 (100%)** |
| Tests Failed | ❌ 0 |
| Critical / High Vulnerabilities | ✅ **0 (Đã vá toàn bộ)** |
| Remaining Vulnerabilities | 🟡 10 Moderate (Non-exploitable `uuid` inside `sequelize`) |

---

## PHẦN 1 — Unit Tests

### 1.1 Testing Pyramid — Services Covered

```
            ┌───────────────────────────┐
            │   Manual / E2E Test       │  ← Not automated (out of scope)
            └────────────┬──────────────┘
            ┌────────────▼──────────────┐
            │  API/Contract Test        │  ← Planned (Phase 2)
            └────────────┬──────────────┘
            ┌────────────▼──────────────┐
            │  Integration Test         │  ← Partially covered
            └────────────┬──────────────┘
            ┌────────────▼──────────────┐
            │  Unit Test ✅             │  ← THIS REPORT (25/25 PASS)
            └───────────────────────────┘
```

---

### 1.2 Booking Service — Unit Tests

**File**: [`services/booking-service/tests/bookingService.test.js`](../services/booking-service/tests/bookingService.test.js)  
**Framework**: Jest 29  
**Status**: ✅ **PASS (4/4)**

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `getBookingStatus` | Should return booking status if booking exists | ✅ PASS | 3ms |
| 2 | `getBookingStatus` | Should return null if booking does not exist | ✅ PASS | 1ms |
| 3 | `cancelBooking` | Should successfully cancel a locked booking | ✅ PASS | 3ms |
| 4 | `cancelBooking` | Should fail to cancel if booking is already confirmed | ✅ PASS | 2ms |

---

### 1.3 Payment Service (ZaloPay) — Unit Tests

**File**: [`services/payment-service/tests/zalopayService.test.js`](../services/payment-service/tests/zalopayService.test.js)  
**Framework**: Jest 29  
**Status**: ✅ **PASS (13/13)**

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `verifyCallback` | Returns TRUE when MAC matches | ✅ PASS | 31ms |
| 2 | `verifyCallback` | Returns FALSE when MAC is tampered | ✅ PASS | 2ms |
| 3 | `verifyCallback` | Returns FALSE when MAC is empty string | ✅ PASS | 1ms |
| 4 | `verifyCallback` | Handles CryptoJS exception gracefully → false | ✅ PASS | 22ms |
| 5 | `createOrder` | Creates ZaloPay order → success=true | ✅ PASS | 3ms |
| 6 | `createOrder` | Returns success=false when return_code ≠ 1 | ✅ PASS | 3ms |
| 7 | `createOrder` | Throws when ZaloPay API unreachable | ✅ PASS | 6ms |
| 8 | `createOrder` | Rounds decimal amount to integer | ✅ PASS | 3ms |
| 9 | `createOrder` | Calls HMAC-SHA256 for MAC signature | ✅ PASS | 5ms |
| 10 | `refundOrder` | Returns success=true on return_code 1 (immediate) | ✅ PASS | 2ms |
| 11 | `refundOrder` | Returns success=true on return_code 3 (processing) | ✅ PASS | 2ms |
| 12 | `refundOrder` | Returns success=false on return_code -1 (failure) | ✅ PASS | 1ms |
| 13 | `refundOrder` | Throws when refund API unreachable | ✅ PASS | 4ms |

---

### 1.4 Movie Service — Unit Tests

**File**: [`services/movie-service/tests/moviesService.test.js`](../services/movie-service/tests/moviesService.test.js)  
**Framework**: Jest 29  
**Status**: ✅ **PASS (8/8)**

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `getMovieById` | Returns movie from DB when cache MISS | ✅ PASS | 2ms |
| 2 | `getMovieById` | Returns null when movie not found in DB | ✅ PASS | 1ms |
| 3 | `getMovieById` | Returns cached movie without hitting DB (cache HIT) | ✅ PASS | 1ms |
| 4 | `getMovieById` | Stores movie in cache after DB fetch (TTL=3600s) | ✅ PASS | 1ms |
| 5 | `invalidateListCache` | Scans and deletes all movies:list* keys | ✅ PASS | 1ms |
| 6 | `invalidateListCache` | Does not throw if Redis DEL fails | ✅ PASS | 1ms |
| 7 | `listMovies` | Returns paginated movies (page/limit) | ✅ PASS | 316ms |
| 8 | `listMovies` | Returns cached result when paginated movies in cache | ✅ PASS | 1ms |

---

### 1.5 Unit Test Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIT TEST RESULTS                        │
├──────────────────────┬──────────┬──────────┬───────────────┤
│ Service              │ Tests    │ Passed   │ Status        │
├──────────────────────┼──────────┼──────────┼───────────────┤
│ booking-service      │    4     │    4     │ ✅ PASS       │
│ payment-service      │   13     │   13     │ ✅ PASS       │
│ movie-service        │    8     │    8     │ ✅ PASS       │
├──────────────────────┼──────────┼──────────┼───────────────┤
│ TOTAL                │   25     │   25     │ ✅ 100% PASS  │
└──────────────────────┴──────────┴──────────┴───────────────┘
```

---

## PHẦN 2 — Security Audit (npm audit) — Post-Patch

### 2.1 Kết Quả Sau Khi Vá Lỗ Hổng

| Service | Low | Moderate | High | Critical | Total | Tình Trạng |
|---------|-----|----------|------|----------|-------|------------|
| `user-service` | 0 | 2 | 0 | 0 | **2** | 🟡 Moderate (uuid/sequelize) |
| `booking-service` | 0 | 2 | 0 | 0 | **2** | 🟡 Moderate (uuid/sequelize) |
| `payment-service` | 0 | 2 | 0 | 0 | **2** | 🟡 Moderate (uuid/sequelize) |
| `movie-service` | 0 | 2 | 0 | 0 | **2** | 🟡 Moderate (uuid/sequelize) |
| `seat-service` | 0 | 2 | 0 | 0 | **2** | 🟡 Moderate (uuid/sequelize) |
| `notification-service` | 0 | 0 | 0 | 0 | **0** | ✅ **CLEAN (0 vulns)** |

### 2.2 Các Lỗ Hổng Đã Được Khắc Phục Thành Công

- ✅ **`axios` (High)**: Nâng cấp lên bản mới nhất, triệt tiêu nguy cơ DoS và Prototype Pollution.
- ✅ **`form-data` (High)**: Vá lỗi CRLF injection trong multipart body.
- ✅ **`brace-expansion` (High)**: Vá lỗi DoS qua exponential expansion.
- ✅ **`js-yaml` (High)**: Vá lỗi CPU DoS.
- ✅ **`body-parser` (Low)**: Vá lỗi invalid limit size enforcement.
- ✅ **`nodemailer` (High)**: Nâng cấp lên 9.0.5 tại notification-service, khắc phục triệt để nguy cơ SMTP Command Injection & SSRF.

### 2.3 Giải Thích Về 2 Lỗ Hổng Moderate Còn Lại (`uuid`)
- **Nguyên nhân**: Thư viện ORM `sequelize` v6 phụ thuộc nội bộ vào `uuid < 11.1.1`.
- **Đánh giá rủi ro**: 🟢 **RẤT THẤP / KHÔNG ẢNH HƯỞNG**. Lỗi này chỉ xảy ra khi gọi `uuid.v3/v5/v6` với buffer tùy chỉnh do người dùng cung cấp trực tiếp. Hệ thống XEMPHIM chỉ dùng uuid v4 tiêu chuẩn để sinh mã `booking_code`.
- **Khuyến nghị**: Không dùng `npm audit fix --force` vì sẽ ép hạ cấp Sequelize xuống v3 gây vỡ kiến trúc ORM.

---

## PHẦN 3 — Kết Luận & Khuyến Nghị

1. **Chất lượng kiểm thử**: 100% (25/25) unit tests chạy thành công trong thời gian dưới 1 giây.
2. **Bảo mật**: Toàn bộ lỗ hổng mức độ **High** và **Critical** đã được khắc phục. Hệ thống đạt tiêu chuẩn an toàn cho môi trường staging/production.

---

*Báo cáo cập nhật: 2026-08-22 | Branch: SWE_BE_1 | Author: Phạm Tuấn Hưng*
