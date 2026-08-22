# Contributing Guide — XEMPHIM

Cảm ơn bạn quan tâm đến dự án! Hướng dẫn này mô tả quy trình đóng góp code theo chuẩn **Software Engineering**.

---

## 1. Git Branching Strategy

Dự án sử dụng mô hình **GitHub Flow** kết hợp **Feature Branch**:

```
main          ← Production-ready code
  └── SWE_BE_1   ← Backend development branch
  └── feature/xxx  ← Feature branches (từ SWE_BE_1)
  └── fix/xxx      ← Bugfix branches
  └── docs/xxx     ← Documentation branches
  └── test/xxx     ← Testing branches
```

### Branch Naming Convention

```bash
feature/<ticket-id>-short-description     # Tính năng mới
fix/<ticket-id>-short-description         # Sửa lỗi
docs/<ticket-id>-short-description        # Tài liệu
test/<ticket-id>-short-description        # Tests
refactor/<ticket-id>-short-description    # Refactoring
chore/<ticket-id>-short-description       # Config, dependencies
```

**Ví dụ:**
```bash
feature/SWE-42-add-admin-dashboard
fix/SWE-55-fix-redis-lock-timeout
docs/SWE-60-update-api-reference
test/SWE-61-add-payment-unit-tests
```

---

## 2. Commit Message Convention (Conventional Commits)

Format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Khi nào dùng |
|------|-------------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `docs` | Thay đổi tài liệu |
| `test` | Thêm hoặc sửa tests |
| `refactor` | Refactoring (không thêm tính năng, không fix bug) |
| `perf` | Cải thiện hiệu suất |
| `chore` | Cập nhật dependencies, config, build |
| `ci` | Thay đổi CI/CD pipeline |

### Scope (tùy chọn)

```
feat(booking-service): add seat expiry cron job
fix(payment-service): handle ZaloPay callback timeout
docs(api): update booking endpoint documentation
test(movie-service): add cache-aside unit tests
```

### Ví dụ commit tốt

```bash
git commit -m "feat(booking-service): implement Redis distributed lock for seat reservation"
git commit -m "fix(gateway): correctly parse JWT from Authorization header"
git commit -m "test(booking-service): add unit tests for cancelBooking function"
git commit -m "docs: add database setup guide to docs/guides/"
```

---

## 3. Development Workflow

### Setup
```bash
git clone https://github.com/hungpptit/XEMPHIM.git
cd XEMPHIM
git checkout SWE_BE_1        # Checkout development branch
npm run install-all          # Install all dependencies
cp .env.example .env         # Configure environment
```

### Tạo feature branch
```bash
git checkout -b feature/SWE-XX-your-feature-name
```

### Develop & Test
```bash
# Phát triển tính năng...

# Chạy tests trước khi commit
npm test --prefix services/booking-service
npm test --prefix services/payment-service
npm test --prefix services/movie-service
```

### Commit & Push
```bash
git add .
git commit -m "feat(service-name): description of change"
git push origin feature/SWE-XX-your-feature-name
```

### Tạo Pull Request
1. Mở PR từ branch của bạn → `SWE_BE_1`
2. Điền mô tả rõ ràng (what, why, how)
3. Đảm bảo tất cả tests pass
4. Chờ code review

---

## 4. Code Style Guidelines

### JavaScript / Node.js

```javascript
// ✅ Tốt - async/await với error handling
export const getMovieById = async (id) => {
  try {
    const movie = await Movie.findByPk(id);
    if (!movie) return null;
    return movie;
  } catch (err) {
    console.error(`[MovieService] Error fetching movie ${id}:`, err.message);
    throw err;
  }
};

// ❌ Tránh - callback hell
Movie.findByPk(id, function(err, movie) {
  if (err) { ... }
  // ...
});
```

### Logging Convention

```javascript
// Format: [ServiceName] [Level] message
console.log(`✅ [BookingService] Booking #${id} confirmed successfully`);
console.warn(`⚠️ [Redis] Connection failed, falling back to DB lock`);
console.error(`❌ [PaymentService] ZaloPay callback verification failed`);
```

### Error Response Convention

```javascript
// Luôn return consistent error format
return res.status(400).json({
  success: false,
  message: 'Human-readable message for client',
});
```

---

## 5. Testing Requirements

Mọi tính năng mới **bắt buộc** phải có unit tests:

```bash
# Kiểm tra test coverage trước khi merge
npm test --prefix services/<service-name> -- --coverage
```

**Coverage target**: ≥ 70% cho service logic functions.

---

## 6. Environment & Security

- **Không commit** file `.env` lên Git
- **Không hardcode** credentials trong source code
- Dùng `process.env.VARIABLE` cho tất cả sensitive values
- ZaloPay Sandbox keys trong `.env` chỉ dùng cho local dev

---

*Xem thêm: [System Overview](./architecture/system-overview.md) | [API Reference](./api/README.md)*
