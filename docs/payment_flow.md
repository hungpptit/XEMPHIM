# Payment Flow — XEMPHIM

This document describes the end-to-end payment and booking lifecycle in the XEMPHIM project (frontend + backend), including API endpoints, DB notes, status transitions, cron jobs, webhook handling, race-condition mitigation, and recommended tests/migrations.

---

## Summary (high level)

Typical user flow:

1. User selects seats → `lockSeats` (backend) → Booking created with `status = "locked"` and `expire_at` set (hold window).
2. User proceeds to payment → frontend creates a Sepay QR via `createSepayQR` → `Payment` record created with `status = "pending"` (and `expire_at`).
3. User pays using bank/QR app → external webhook or manual confirmation calls `confirmPayment` / `confirmPaymentHandler` → pending payment updated to `paid` and Booking → `confirmed`.
4. If the QR expires before payment → cron `expirePendingPayments` sets `Payment.status = "expired"` and if booking still locked, `Booking.status = "expired"`.
5. If user cancels before paying → frontend calls `cancelBooking` → `Booking.status = "cancelled"` and associated `Payment` rows in `pending|expired` → `cancelled`.
6. If user requests refund after paid (or admin issues refund) → `refundBooking` creates a negative `Payment` with `status = "refunded"` and updates previous `paid` payments to `refunded`; Booking → `refunded`.

This doc maps the concrete endpoints, DB shape, and implementation notes present in the repository as of this commit.

---

## Models & important fields

### Booking (table: `Bookings`)
- id (int)
- user_id (int) — customer who made booking
- showtime_id (int)
- booking_code (string)
- total_price (decimal)
- status (string) — important values: `locked`, `confirmed`, `expired`, `cancelled`, `refunded`
- created_at, updated_at, expire_at (datetime)

### Payment (table: `Payments`)
- id (int)
- booking_id (int)
- payment_method (string) — e.g. `sepay`, `sepay-webhook`, `refund`
- payment_code (string) — internal unique code (uuid)
- amount (decimal)
- qr_url (string)
- expire_at (datetime)
- status (string) — important values: `pending`, `paid`, `expired`, `cancelled`, `refunded`
- transaction_ref, response_code, secure_hash
- created_at, updated_at

Notes:
- `Payment` rows are append-only for audit/history except status updates — refunds are recorded as separate negative-amount `Payment` rows with `status = 'refunded'`.

---

## Backend endpoints (routes)

All backend routes under `/api` (see `frontend` Axios config expecting `http://localhost:8080/api`). The booking routes live in `backend/src/routes/bookingRoutes.js`.

- POST /bookings/lock-seat
  - Controller: `bookingController.lockSeatHandler` → service `bookingService.lockSeats`
  - Body: { user_id, showtime_id, seat_ids }
  - Creates a `Booking` with `status='locked'` and `BookingSeat` rows; sets `expire_at` with hold window.

- POST /bookings/:bookingId/create-sepay-qr
  - Controller: `bookingController.createSepayQRHandler` → service `bookingService.createSepayQR`
  - Returns: { qr_url, expires_in, expires_at, payment_id }
  - Implementation notes: service attempts to reuse an existing non-expired `Payment` with status `pending` or create one atomically in a transaction (row locking + unique-constraint fallback). QR image URL is generated using configured SEPAY account.

- GET /bookings/:bookingId/status
  - Controller: `bookingController.getBookingStatusHandler` → `bookingService.getBookingStatus`
  - Returns: { id, status, booking_code }
  - Used by frontend payment polling to detect `confirmed`.

- POST /bookings/:bookingId/confirm-payment
  - Controller: `bookingController.confirmPaymentHandler` → `bookingService.confirmPayment`
  - Body: { payment_method, payment_payload }
  - Service verifies booking is `locked` and not expired, creates `Payment` with `status='paid'` and updates Booking to `status='confirmed'`.

- POST /bookings/:bookingId/cancel
  - Controller: `bookingController.cancelBookingHandler` → `bookingService.cancelBooking`
  - Cancels a booking prior to payment. Implementation updates `Booking.status = 'cancelled'` and updates related Payments (pending / expired) to `status = 'cancelled'`.

- POST /bookings/:bookingId/refund
  - Controller: `bookingController.refundBookingHandler` → `bookingService.refundBooking`
  - Creates a negative `Payment` row with `status='refunded'`, updates any `paid` payments to `refunded` and sets Booking → `refunded`.

- GET /bookings/user/:userId
  - Controller: `bookingController.getUserBookingsHandler` → `bookingService.getUserBookings`
  - Returns booking list with showtime, seats, movie mapping for FE.

---

## Cron jobs & background tasks

- `expireLockedBookings` — sets `Booking.status='expired'` for locked bookings whose `expire_at < SYSUTCDATETIME()` (server-side datetime usage to avoid timezone parsing issues).
- `expirePendingPayments` — sets `Payment.status='expired'` for `pending` payments with `expire_at < now`. When payments expire, if their booking is still `locked`, booking is set to `expired` as well.

Where: job runner code exists in repository (cron or `setInterval`) — ensure it runs in production.

---

## Webhook / External payment confirmation

- The project contains logic to accept webhook-style confirmations (for example `sepay-webhook`) — when a webhook indicates payment success, backend should call `bookingService.confirmPayment` or equivalent to transition `Payment.pending` → `paid` and `Booking.locked` → `confirmed`.
- Webhook handlers must be idempotent (replay-safe) and match payments by `booking_code` or `transaction_ref`.
  
Note: QR addInfo now uses a combined identifier `BOOK{booking.id}-{booking_code}` (e.g. `BOOK60-0dff3b4c-5a5f-4c2b-878f-2918aaddba59`). Webhook handlers should parse this format by splitting on `-` after the numeric id (or better: parse with a regex that extracts the numeric id then the UUID), or match against `booking_code` directly.

---

## Concurrency & duplicate pending payments

Problem: multiple concurrent requests creating a `pending` Payment for the same booking cause duplicates. Current mitigations in code:

1. `createSepayQR` now runs inside a transaction and tries to find+lock an existing `pending` Payment (using transaction row lock) and reuse it when not expired.
2. On create, code catches `SequelizeUniqueConstraintError` as a fallback and re-queries existing `pending` Payment.

Recommended DB-level hardening (strongly advised):

- Add a unique filtered index on `Payments(booking_id)` where `status = 'pending'` to enforce at the DB that only one pending Payment per booking may exist. This avoids race-condition duplicates that application-level locking can't fully prevent across multiple app instances.

Suggested migration SQL (MS SQL Server):

```sql
-- Cleanup duplicates (keep newest pending per booking)
WITH Duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY booking_id ORDER BY created_at DESC) AS rn
  FROM Payments
  WHERE status = 'pending'
)
DELETE p
FROM Payments p
INNER JOIN Duplicates d ON p.id = d.id
WHERE d.rn > 1;

-- Create unique filtered index
CREATE UNIQUE INDEX UX_Payments_Booking_Pending
ON Payments (booking_id)
WHERE status = 'pending';
```

Notes: run cleanup before adding index.

---

## FE behavior & guidance (current code)

- `Payment` page (`frontend/src/modules/Payment/Payment.js`):
  - Calls `createSepayQR` to get a QR and starts polling `GET /bookings/:bookingId/status` every ~2s to detect `confirmed`.
  - Shows timer counting down to `expires_at` and a refresh button. Added 'Hủy đặt vé' (cancel) button which calls `POST /bookings/:bookingId/cancel` and navigates away on success.
  - On confirmed, shows a popup and redirects to `/my-tickets`.

- `MyTickets` page should not show cancel for confirmed tickets (that was corrected). Cancel only available from Payment (pending) view.

UI decisions to keep consistent:
- Disable cancel once booking status is `confirmed`.
- If payment is `expired`, offer a "Làm mới" (regenerate QR) button which calls `createSepayQR` again (code handles reusing or creating a pending payment).
- When cancel succeeds, refresh listings (frontend `MyTickets.getUserBookings`) to reflect DB state.

---

## Data shapes (JSON) — important examples

Lock seats result (201):
```json
{ "success": true, "booking": { "id": 123, "booking_code": "...", "status": "locked", "expire_at": "2025-10-15T12:34:00Z", ... } }
```

Create Sepay QR result:
```json
{ "qr_url": "https://img.vietqr.io/..", "expires_in": 60, "expires_at": "2025-10-15T12:34:00Z", "payment_id": 999 }
```

Get booking status:
```json
{ "id": 123, "status": "locked", "booking_code": "..." }
```

Confirm payment result:
```json
{ "booking": { ... status: "confirmed" ... }, "payment": { id: 1000, status: "paid", amount: 5000 } }
```

Cancel booking success:
```json
{ "success": true, "booking": { id: 123, status: "cancelled" } }
```

Refund result:
```json
{ "success": true, "booking": { id: 123, status: "refunded" }, "refund": { id: 2000, amount: -5000, status: 'refunded' } }
```

---

## Tests & verification steps (manual + automated)

Manual smoke tests:
1. Lock seats → verify Booking `locked` created and booking_seats inserted.
2. Create QR → verify Payment row `pending` created, `qr_url` returned and `expire_at` set.
3. Confirm payment (call confirm API) → verify Payment `paid` created/updated and Booking `confirmed`.
4. Cancel before paying (on Payment page) → verify Booking `cancelled` and Payment `pending|expired` -> `cancelled` in DB.
5. Expire path: create QR and wait > expire_in → run cron job `expirePendingPayments` → verify Payment `expired` and Booking `expired`.
6. Refund path: after confirmed, call refund endpoint → verify negative Payment with `refunded` and Booking `refunded`.

Automated tests (suggested):
- Unit test `bookingService.createSepayQR` for reuse vs create path (mock DB transaction).\
- Integration test: simulate two concurrent `createSepayQR` calls for the same booking (use test harness or promise-based concurrency) and assert only one `pending` Payment remains.

---

## Edge cases & error handling

- Race conditions on creating pending Payment: mitigated by row locks + unique index + fallback. DB constraint is recommended for final hardening.
- Time timezone issues: code uses `SYSUTCDATETIME()` server-side for comparisons/creation where possible to avoid SQL Server timezone parsing problems.
- Confirming payment after expiry: `confirmPayment` checks `booking.expire_at` and rejects with message `Booking expired` if expired.
- Cancel vs refund: `cancelBooking` applies only when booking not `confirmed`; `refundBooking` requires `confirmed`.

---

## Recommended follow-ups / TODOs

- Add the DB unique filtered index migration (SQL above) and a one-off cleanup script to remove legacy duplicate `pending` Payments.
- Add an integration test that reproduces the concurrent QR creation race and verifies de-duplication.
- Ensure webhook endpoint (if any) is idempotent and maps transaction refs safely to existing Payment rows.
- Add monitoring/alert if many `pending` payments accumulate for the same booking (indicates race or bot activity).

---

## Where to look in the codebase
- Backend services: `backend/src/services/bookingService.js`
- Controllers: `backend/src/controllers/bookingController.js`
- Routes: `backend/src/routes/bookingRoutes.js`
- Frontend payment UI: `frontend/src/modules/Payment/Payment.js` and `frontend/src/modules/Payment/Payment.module.css`

---

If you want, I can now:
- Generate the DB migration SQL file and add it to `backend/migrations/` (I can create `20251018_add_unique_pending_payments.sql`) and a simple cleanup script. 
- Add a small integration test harness to simulate concurrent QR creation.

Tell me which of the follow-ups you want me to implement next.
