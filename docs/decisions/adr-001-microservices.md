# ADR-001: Microservices Architecture

**Date**: 2026-06-01  
**Status**: Accepted  
**Deciders**: Phạm Tuấn Hưng (Backend Developer)

---

## Context & Problem Statement

Cần xây dựng hệ thống đặt vé xem phim xử lý được:
1. **Concurrency cao**: Nhiều người đặt cùng ghế trong cùng thời điểm
2. **Scalability**: Hệ thống tăng tải vào giờ cao điểm (tối cuối tuần)
3. **Reliability**: Một lỗi trong Payment không nên làm sập Movie browsing
4. **Maintainability**: Team có thể phát triển từng nghiệp vụ độc lập

---

## Decision Drivers

- Yêu cầu xử lý concurrency (nhiều người đặt cùng ghế)
- Cần tích hợp bên thứ 3 (ZaloPay) độc lập với core booking logic
- Notification (gửi email) không nên block API response
- Hệ thống cần dễ mở rộng theo nghiệp vụ

---

## Considered Options

| Option | Pros | Cons |
|--------|------|------|
| **Monolith** | Đơn giản, dễ debug | Khó scale, tight coupling |
| **Microservices** | Scale từng phần, loose coupling | Phức tạp hơn, network overhead |
| **Modular Monolith** | Cân bằng giữa 2 cách | Vẫn deploy cùng nhau |

---

## Decision Outcome

**Chọn: Microservices Architecture**

### Phân tách services theo nghiệp vụ:

| Service | Responsibility | Scale reason |
|---------|---------------|--------------|
| User Service | Auth (ít thay đổi) | Low traffic |
| Movie Service | Read-heavy (nhiều query danh sách) | Cache với Redis |
| Seat Service | Read-heavy (check trạng thái ghế) | Cache friendly |
| Booking Service | Write-heavy + concurrency critical | Horizontal scale |
| Payment Service | External API integration (ZaloPay) | Isolate external dependency |
| Notification Service | Async (email sending) | Decouple from main flow |

---

## Architecture Decisions Made

### Decision 1: Database-per-Service
**Lý do**: Mỗi service cần tự chủ về data schema, tránh coupling qua shared DB.

### Decision 2: Redis Distributed Lock cho Seat Reservation
**Lý do**: Cần ngăn race condition trước khi hit DB. Redis SET NX PX đảm bảo chỉ 1 client acquire lock trong cùng thời điểm với độ trễ cực thấp.

**Fallback**: Nếu Redis offline → DB Pessimistic Lock (Sequelize LOCK.UPDATE) đảm bảo correctness (nhưng performance thấp hơn).

### Decision 3: RabbitMQ cho Email Notifications
**Lý do**: Email gửi qua SMTP mất 1-3 giây. Nếu gọi đồng bộ trong API response → user phải chờ. Publish sang queue → response ngay → consumer gửi email bất đồng bộ.

**Fallback**: Nếu RabbitMQ offline → HTTP call trực tiếp đến Notification Service (synchronous, nhưng đảm bảo email được gửi).

### Decision 4: API Gateway làm Single Entry Point
**Lý do**: Tập trung JWT validation, tránh mỗi service phải tự implement auth. Giải quyết CORS tập trung.

### Decision 5: REST over gRPC
**Lý do**: Team quen với REST, JSON, dễ debug. Traffic nội bộ không đủ lớn để justify gRPC overhead.

---

## Consequences

### Positive
- ✅ Mỗi service deploy/restart độc lập
- ✅ Booking Service có thể scale riêng trong giờ cao điểm
- ✅ Notification không ảnh hưởng latency của booking flow
- ✅ Payment integration cô lập, dễ thay đổi provider

### Negative
- ❌ Phức tạp hơn Monolith (nhiều service, nhiều cổng)
- ❌ Network call nội bộ (Booking → Movie Service, Booking → Seat Service) có latency
- ❌ Distributed tracing khó hơn
- ❌ Cần quản lý nhiều `package.json`, môi trường

### Mitigations
- Dùng `concurrently` để chạy tất cả services trong 1 lệnh (developer experience)
- Log format thống nhất (`[ServiceName] message`) để dễ trace
- Fallback mechanisms cho Redis và RabbitMQ đảm bảo graceful degradation

---

## References
- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)
- [Redis SET NX PX — Distributed Lock](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Database-per-Service Pattern](https://microservices.io/patterns/data/database-per-service.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html) *(considered for future)*
