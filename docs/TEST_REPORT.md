# Test Report — XEMPHIM

**Generated**: 2026-08-22  
**Branch**: `SWE_BE_1`  
**Version**: 1.0.0  
**Report Type**: Unit Test + Security Audit

---

## Executive Summary

| Category | Result |
|----------|--------|
| Total Test Suites | 3 |
| Total Unit Tests | **25 tests** |
| Tests Passed | ✅ **25 / 25** |
| Tests Failed | ❌ 0 |
| Test Coverage | Service Logic Functions |
| Security Audit | ⚠️ Vulnerabilities found (fixable) |

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
            │  Unit Test ✅             │  ← THIS REPORT
            └───────────────────────────┘
```

---

### 1.2 Booking Service — Unit Tests

**File**: [`services/booking-service/tests/bookingService.test.js`](../services/booking-service/tests/bookingService.test.js)  
**Framework**: Jest 29  
**Run time**: ~16s  
**Status**: ✅ PASS

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `getBookingStatus` | Should return booking status if booking exists | ✅ PASS | 9ms |
| 2 | `getBookingStatus` | Should return null if booking does not exist | ✅ PASS | 1ms |
| 3 | `cancelBooking` | Should successfully cancel a locked booking | ✅ PASS | 3ms |
| 4 | `cancelBooking` | Should fail to cancel if booking is already confirmed | ✅ PASS | 1ms |

**Result**: **4 / 4 passed** ✅

**Mocks used**:
- `../models/index.js` → Sequelize Booking, BookingSeat models
- `axios` → HTTP calls to ZaloPay / other services
- `ioredis` → Redis distributed lock
- `amqplib` → RabbitMQ connection

---

### 1.3 Payment Service (ZaloPay) — Unit Tests

**File**: [`services/payment-service/tests/zalopayService.test.js`](../services/payment-service/tests/zalopayService.test.js)  
**Framework**: Jest 29  
**Run time**: ~0.8s  
**Status**: ✅ PASS

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `verifyCallback` | Returns TRUE when MAC matches | ✅ PASS | 26ms |
| 2 | `verifyCallback` | Returns FALSE when MAC is tampered | ✅ PASS | 2ms |
| 3 | `verifyCallback` | Returns FALSE when MAC is empty string | ✅ PASS | 5ms |
| 4 | `verifyCallback` | Handles CryptoJS exception gracefully → false | ✅ PASS | 20ms |
| 5 | `createOrder` | Creates ZaloPay order → success=true | ✅ PASS | 2ms |
| 6 | `createOrder` | Returns success=false when return_code ≠ 1 | ✅ PASS | 2ms |
| 7 | `createOrder` | Throws when ZaloPay API unreachable | ✅ PASS | 5ms |
| 8 | `createOrder` | Rounds decimal amount to integer | ✅ PASS | 2ms |
| 9 | `createOrder` | Calls HMAC-SHA256 for MAC signature | ✅ PASS | 2ms |
| 10 | `refundOrder` | Returns success=true on return_code 1 (immediate) | ✅ PASS | 2ms |
| 11 | `refundOrder` | Returns success=true on return_code 3 (processing) | ✅ PASS | 1ms |
| 12 | `refundOrder` | Returns success=false on return_code -1 (failure) | ✅ PASS | 1ms |
| 13 | `refundOrder` | Throws when refund API unreachable | ✅ PASS | 3ms |

**Result**: **13 / 13 passed** ✅

**What's tested**:
- ✅ MAC verification (HMAC-SHA256) — core security function
- ✅ ZaloPay order creation flow
- ✅ Amount rounding to integer
- ✅ Return code interpretation (1=success, 3=processing, -1=fail)
- ✅ Error propagation when external API fails

---

### 1.4 Movie Service — Unit Tests

**File**: [`services/movie-service/tests/moviesService.test.js`](../services/movie-service/tests/moviesService.test.js)  
**Framework**: Jest 29  
**Run time**: ~23s  
**Status**: ✅ PASS

| # | Test Suite | Test Case | Result | Duration |
|---|-----------|-----------|--------|----------|
| 1 | `getMovieById` | Returns movie from DB when cache MISS | ✅ PASS | 13ms |
| 2 | `getMovieById` | Returns null when movie not found in DB | ✅ PASS | 1ms |
| 3 | `getMovieById` | Returns cached movie without hitting DB (cache HIT) | ✅ PASS | 3ms |
| 4 | `getMovieById` | Stores movie in cache after DB fetch (TTL=3600s) | ✅ PASS | 1ms |
| 5 | `invalidateListCache` | Scans and deletes all movies:list* keys | ✅ PASS | 2ms |
| 6 | `invalidateListCache` | Does not throw if Redis DEL fails | ✅ PASS | 1ms |
| 7 | `listMovies` | Returns paginated movies (page/limit) | ✅ PASS | 15010ms |
| 8 | `listMovies` | Returns cached result when paginated movies in cache | ✅ PASS | 2ms |

**Result**: **8 / 8 passed** ✅

**What's tested**:
- ✅ Cache-Aside Pattern (cache hit → no DB call)
- ✅ Cache MISS → DB query → store in Redis
- ✅ Cache invalidation with SCAN pattern
- ✅ Graceful handling of Redis DEL failure
- ✅ Pagination: offset/limit calculation

---

### 1.5 Overall Unit Test Summary

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

**Pass Rate**: **100%** (25/25 tests passed)

---

## PHẦN 2 — Security Audit (npm audit)

### 2.1 Audit Summary by Service

| Service | Low | Moderate | High | Critical | Total | Fixable |
|---------|-----|----------|------|----------|-------|---------|
| user-service | 1 | 2 | 0 | 0 | **3** | ✅ `npm audit fix` |
| booking-service | 1 | 2 | 4 | 0 | **7** | ✅ `npm audit fix` |
| payment-service | 0 | 0 | 0 | 0 | **0** | ✅ Clean |
| movie-service | 0 | 0 | 0 | 0 | **0** | ✅ Clean |
| seat-service | 1 | 2 | 2 | 0 | **5** | ✅ `npm audit fix` |
| notification-service | 1 | 0 | 1 | 0 | **2** | ⚠️ Breaking change |

### 2.2 Vulnerability Details

#### booking-service (7 vulnerabilities)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `axios` 1.0.0–1.17.0 | 🔴 High | Prototype pollution, DoS via recursion, max body bypass | `npm audit fix` |
| `body-parser` 2.0.0–2.2.2 | 🟡 Low | DoS via invalid limit value | `npm audit fix` |
| `brace-expansion` ≤1.1.17 | 🔴 High | DoS via exponential expansion | `npm audit fix` |
| `form-data` 4.0.0–4.0.5 | 🔴 High | CRLF injection in multipart | `npm audit fix` |
| `js-yaml` 3.x | 🔴 High | Quadratic CPU consumption DoS | `npm audit fix` |
| `uuid` <11.1.1 | 🟠 Moderate | Buffer bounds check missing | `npm audit fix --force` |

#### seat-service (5 vulnerabilities)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `axios` 1.0.0–1.17.0 | 🔴 High | Multiple DoS & prototype pollution issues | `npm audit fix` |
| `body-parser` 2.0.0–2.2.2 | 🟡 Low | DoS via invalid limit | `npm audit fix` |
| `form-data` 4.0.0–4.0.5 | 🔴 High | CRLF injection | `npm audit fix` |
| `uuid` <11.1.1 | 🟠 Moderate | Buffer bounds check | `npm audit fix --force` |

#### notification-service (2 vulnerabilities)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `body-parser` 2.0.0–2.2.2 | 🟡 Low | DoS via invalid limit | `npm audit fix` |
| `nodemailer` ≤9.0.0 | 🔴 High | SMTP injection, TLS bypass, SSRF, DoS | `npm audit fix --force` (breaking) |

#### user-service (3 vulnerabilities)

| Package | Severity | Issue | Fix |
|---------|----------|-------|-----|
| `body-parser` 2.0.0–2.2.2 | 🟡 Low | DoS via invalid limit | `npm audit fix` |
| Various | 🟠 Moderate | 2 moderate issues | `npm audit fix` |

### 2.3 Fix Commands

```bash
# Fix non-breaking vulnerabilities (safe to run)
npm audit fix --prefix services/user-service
npm audit fix --prefix services/booking-service
npm audit fix --prefix services/payment-service
npm audit fix --prefix services/movie-service
npm audit fix --prefix services/seat-service
npm audit fix --prefix services/notification-service

# For notification-service nodemailer (breaking change - test carefully):
npm audit fix --force --prefix services/notification-service
```

### 2.4 Risk Assessment

| Risk Level | Assessment |
|-----------|-----------|
| **Critical** | ✅ None found |
| **High** | ⚠️ Axios DoS (internal service, not public-facing) |
| **High** | ⚠️ Nodemailer SMTP injection (notification service only) |
| **Overall Risk** | 🟡 **MEDIUM** — vulnerabilities are in internal dependencies, most fixable automatically |

> **Note**: Payment Service and Movie Service have **zero vulnerabilities** — cleanest services.

---

## PHẦN 3 — Code Quality Observations

### 3.1 Strengths Found During Testing

| Feature | Assessment |
|---------|-----------|
| Error Handling | ✅ Consistent try/catch with rollback in all transactions |
| Fallback Mechanisms | ✅ Redis → DB lock fallback, RabbitMQ → HTTP fallback |
| Logging | ✅ Emoji-prefixed structured logs for easy debugging |
| Security | ✅ MAC verification on ZaloPay callbacks (HMAC-SHA256) |
| Concurrency | ✅ Redis distributed lock + DB pessimistic lock |
| Test Design | ✅ Proper mock isolation (ES modules with jest.unstable_mockModule) |

### 3.2 Areas for Improvement

| Issue | Service | Priority |
|-------|---------|----------|
| No unit tests for `lockSeats` function | booking-service | Medium |
| No unit tests for `confirmPayment` function | booking-service | Medium |
| No API/HTTP tests (supertest) | all services | Medium |
| Dependency vulnerabilities (axios, nodemailer) | multiple | High |
| No input validation tests | all services | Low |

---

## PHẦN 4 — Recommendations

### Immediate Actions (High Priority)
1. **Run `npm audit fix`** for all services to patch fixable vulnerabilities
2. **Update axios** to latest version in booking-service and seat-service
3. **Update nodemailer** in notification-service (test email functionality after)

### Short-term (Medium Priority)
4. **Add more unit tests** for `lockSeats` and `confirmPayment` in booking-service
5. **Add API tests** using `supertest` for gateway endpoints
6. **Add test:coverage** to CI pipeline with minimum threshold (70%)

### Long-term (Low Priority)
7. **Integration tests**: Test full booking flow (lock → payment → confirm → notify)
8. **Load testing**: Test concurrent seat booking (simulate race conditions)
9. **Docker Compose**: Containerize for reproducible test environments

---

## PHẦN 5 — Test Commands Reference

```bash
# Run all unit tests
npm test --prefix services/booking-service
npm test --prefix services/payment-service
npm test --prefix services/movie-service

# Run with coverage report
npm run test:coverage --prefix services/booking-service
npm run test:coverage --prefix services/payment-service
npm run test:coverage --prefix services/movie-service

# Security audit
npm audit --prefix services/user-service
npm audit --prefix services/booking-service
npm audit --prefix services/payment-service
npm audit --prefix services/movie-service
npm audit --prefix services/seat-service
npm audit --prefix services/notification-service

# Fix vulnerabilities
npm audit fix --prefix services/booking-service
npm audit fix --prefix services/seat-service
npm audit fix --prefix services/notification-service
```

---

*Report generated on: 2026-08-22 | Branch: SWE_BE_1 | Author: Phạm Tuấn Hưng*
