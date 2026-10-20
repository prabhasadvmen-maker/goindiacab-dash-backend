# GoIndiaCab — Website API Documentation

APIs used by the public booking website (Next.js) and managed from the **Super Admin → Website** page.

- **Base URL:** `https://<your-backend>` (local: `http://localhost:5000`)
- **Public APIs:** no login, JSON in/out, mounted at `/api`
- **Admin APIs:** `Authorization: Bearer <superadmin/admin JWT>`, mounted at `/api/admins/website`
- **Amounts:** whole rupees (INR), except Razorpay `amount` which is in paise.

## Setup

| Variable (backend `.env`) | Purpose |
|---|---|
| `MONGODB_URI`, `JWT_SECRET` | already present |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | payments (secret never leaves the backend) |
| `GEOAPIFY_API_KEY` | city suggestions top-up + automatic distance |
| `WEBSITE_URL` | **new** — allowed CORS origin(s) of the website, comma-separated (default `http://localhost:3000`). Dashboard origin stays in `FRONTEND_URL` |
| `EMAIL_ENABLED=true`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `APP_NAME` | booking confirmation email |

Website `.env.local`: only `NEXT_PUBLIC_API_URL=https://<your-backend>` is needed. `NEXT_PUBLIC_RAZORPAY_KEY_ID` is optional because `create-order` already returns `keyId`.

**First-time data:** Super Admin → Website → **Load default data** (20 cities + 4 vehicle fare rules). Without fare rules `/api/fare/calculate` returns `VEHICLE_NOT_FOUND`.

## Error format

Every failure from the public APIs:

```json
{ "success": false, "error": "ERROR_CODE", "message": "Human readable message" }
```

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | missing / invalid field |
| 404 | `BOOKING_NOT_FOUND`, `VEHICLE_NOT_FOUND` | unknown id / vehicle |
| 409 | `DUPLICATE_BOOKING`, `ALREADY_PAID`, `BOOKING_CANCELLED`, `NOT_PAID` | state conflict |
| 400 | `SIGNATURE_MISMATCH`, `ORDER_MISMATCH` | payment verification failed |
| 422 | `DISTANCE_UNAVAILABLE` | route could not be resolved |
| 429 | `RATE_LIMITED` | per-IP per-minute limit hit |
| 502 / 503 | `PAYMENT_GATEWAY_ERROR`, `PAYMENT_NOT_CONFIGURED` | Razorpay problem / keys missing |
| 500 | `SERVER_ERROR` | unexpected |

Rate limits (per IP per minute): suggest 120, distance 60, fare vehicles 60, fare calculate 120, booking create 10, booking get 60, create-order 10, verify 20, notify 10.

---

## Public APIs

### 1. Location autocomplete — `GET /api/locations/suggest?q={query}`

Admin-managed cities (popular first, prefix match), topped up from Geoapify if fewer than 6. Returns `[]` for `q` shorter than 2 characters.

```json
{ "suggestions": [ { "label": "Delhi, Delhi", "value": "Delhi" }, { "label": "New Delhi, Delhi", "value": "New Delhi" } ] }
```
Use `value` as the city name in every other API; `label` is for display.

### 2. Distance — `GET /api/distance?from=Delhi&to=Agra`

Lookup order: Super Admin route (either direction) → Geoapify routing (result is cached as an `auto` route).

```json
{ "distanceKm": 212, "durationMins": 140, "routeLabel": "Delhi → Agra", "source": "api" }
```
`source`: `admin` | `cache` | `api`. Errors: `400` missing params, `422 DISTANCE_UNAVAILABLE` (e.g. same city, unknown city).

### 3a. Vehicle list — `GET /api/fare/vehicles`  *(extra)*

Active vehicles to render the cab cards.

```json
{ "vehicles": [ { "id": "sedan", "name": "Sedan", "model": "Dzire, Etios or similar", "seats": 4, "imageUrl": "",
                  "packages": [ { "label": "8 Hrs / 80 Km", "hours": 8, "km": 80, "price": 2200 } ] } ] }
```

### 3b. Fare calculation — `POST /api/fare/calculate`

```json
{ "vehicleType": "sedan", "distanceKm": 212, "tripType": "oneway", "package": "", "days": 1 }
```
| Field | Notes |
|---|---|
| `vehicleType` | vehicle `id` from 3a |
| `distanceKm` | one-way route distance from API 2 (0–6000) |
| `tripType` | `oneway` (default), `roundtrip`, `local` |
| `package` | required label for `local` (first package used if omitted/unknown) |
| `days` | `roundtrip` only, default 1 |

Response:

```json
{
  "baseFare": 3250, "extraKmFare": 0, "driverAllowance": 300, "gst": 178, "total": 3728,
  "billableKm": 250, "includedKm": 250, "perKmAfter": 13,
  "paymentOptions": {
    "full": { "paidNow": 3728, "payLater": 0 },
    "part": { "percent": 25, "paidNow": 932, "payLater": 2796 }
  }
}
```

Formulas (all values come from the fare rule in the admin panel):

| Trip | Base fare | Extra km fare | Driver allowance |
|---|---|---|---|
| `oneway` | `max(distance, minKmOneway) × perKmOneway` | 0 | `driverAllowance` |
| `roundtrip` | `minKmPerDay × days × perKmRound` | `max(0, distance×2 − minKmPerDay×days) × perKmRound` | `driverAllowancePerDay × days` |
| `local` | package `price` | `max(0, distance − package.km) × package.extraKmRate` | 0 |

`gst = round((base + extra + allowance) × gstPercent / 100)`, `total = base + extra + allowance + gst`.

### 4. Create booking — `POST /api/booking/create`

Body exactly as in the website spec (`passenger`, `trip`, `vehicle`, `fare`). Extra optional fields: `trip.package`, `trip.days`.

```json
{
  "passenger": { "name": "Rahul Sharma", "mobile": "9876543210", "email": "rahul@example.com",
                 "pickupAddress": "123 Main Street, Connaught Place, Delhi", "dropAddress": "", "instructions": "" },
  "trip": { "from": "Delhi", "to": "Agra", "date": "2030-08-15", "time": "10:00", "tripType": "oneway", "distanceKm": 212 },
  "vehicle": { "id": "sedan" },
  "fare": { "paymentOption": "part" }
}
```

**Server-side rules (anti-tampering):** distance is re-resolved from `trip.from/to`; the fare is recomputed from the fare rule; the client's `fare.total/paidNow/payLater` are **ignored** — only `fare.paymentOption` (`part` default | `full`) is used. Mobile must be a valid 10-digit Indian number, date `YYYY-MM-DD` not in the past (IST), time `HH:mm`, `to` required unless `tripType` is `local`.

Success `201`:
```json
{ "success": true, "bookingId": "GIC-7K2MQ9XPA", "status": "confirmed",
  "fare": { "total": 3728, "paymentOption": "part", "paidNow": 932, "payLater": 2796 },
  "message": "Booking created successfully" }
```
Use `fare.paidNow` returned here for display. Duplicate (same mobile + from + to + date + time, not cancelled): `409 DUPLICATE_BOOKING`.

### 5. Get booking — `GET /api/booking/{bookingId}`

```json
{
  "bookingId": "GIC-7K2MQ9XPA", "status": "confirmed",
  "passenger": { "name": "...", "mobile": "...", "email": "...", "pickupAddress": "..." },
  "trip": { "from": "Delhi", "to": "Agra", "date": "2030-08-15", "time": "10:00", "tripType": "oneway", "distanceKm": 212 },
  "vehicle": { "name": "Sedan", "model": "Dzire, Etios or similar" },
  "fare": { "baseFare": 3250, "extraKmFare": 0, "driverAllowance": 300, "gst": 178, "total": 3728, "paidNow": 932, "payLater": 2796 },
  "paymentStatus": "paid",
  "bookedAt": "2030-08-14T10:30:00.000Z"
}
```
`status`: `confirmed | assigned | in_progress | completed | cancelled`. `paymentStatus`: `pending | paid | failed` (new field, use it to show "payment pending"). Unknown id → `404 BOOKING_NOT_FOUND`. Booking IDs are random (9 chars), so possession of the ID is the access control; keep them out of public listings.

### 6. Create payment order — `POST /api/payment/create-order`

```json
{ "bookingId": "GIC-7K2MQ9XPA" }
```
`amount` and `currency` in the request are ignored — the amount is always the booking's `paidNow`.

```json
{ "orderId": "order_Tq...", "amount": 93200, "currency": "INR", "keyId": "rzp_..." }
```
`amount` is in **paise**. Errors: `404`, `409 ALREADY_PAID | BOOKING_CANCELLED`, `503 PAYMENT_NOT_CONFIGURED`, `502 PAYMENT_GATEWAY_ERROR`. Calling it again (retry) creates a fresh order and replaces the stored one.

### 7. Verify payment — `POST /api/payment/verify`

Call from the Razorpay `handler` callback.

```json
{ "razorpay_order_id": "order_Tq...", "razorpay_payment_id": "pay_...", "razorpay_signature": "...", "bookingId": "GIC-7K2MQ9XPA" }
```
Success: `{ "success": true, "bookingId": "...", "paymentId": "pay_...", "status": "paid" }` (idempotent).
Failure `400`: `SIGNATURE_MISMATCH` (HMAC-SHA256 of `order_id|payment_id` with the key secret did not match) or `ORDER_MISMATCH` (order does not belong to this booking). Only redirect to `/booking/[id]` when `success` is `true`. A confirmation email is sent automatically after success.

### 8. Notify — `POST /api/notify/booking-confirmed` *(optional)*

The backend already sends this after `verify`; the frontend does not need to call it. Body: `{ "bookingId": "GIC-..." }` — contents are read from the database, never from the request. Only works for **paid** bookings (`409 NOT_PAID` otherwise) and is idempotent.

```json
{ "success": true, "emailSent": true, "smsSent": false }
```
`smsSent` is always `false` until a transactional SMS provider is connected (the existing APITxT integration is OTP-only). Email needs `EMAIL_ENABLED=true` + Brevo keys and a passenger email.

---

## Recommended frontend flow

1. Type in city fields → `GET /api/locations/suggest` (debounce 300 ms, show 6, fall back to static `CITIES`).
2. Search page → `GET /api/distance` once, then `GET /api/fare/vehicles` + `POST /api/fare/calculate` per vehicle (fallback to local `calculateFare()` on error).
3. Checkout "Proceed" → `POST /api/booking/create` (show inline error on failure, no redirect) → `POST /api/payment/create-order` → open Razorpay with `orderId`, `amount`, `keyId`.
4. Razorpay success handler → `POST /api/payment/verify` → redirect to `/booking/{bookingId}` only on `success: true`; on failure show "Payment failed, please try again" with retry (retry = call `create-order` again with the same `bookingId`).
5. Booking page → `GET /api/booking/{id}`; on error fall back to localStorage `confirmedBooking`; if both fail show "Booking not found". Check `response.bookingId === id`.

Timeout all calls at 10 s with `AbortController`. Because the booking is created before payment, an abandoned payment leaves a booking with `paymentStatus: "pending"` — visible to Super Admin, who can cancel it.

---

## Admin APIs (Super Admin → Website page)

Base `/api/admins/website`, Bearer JWT required. **Reads** allowed for Admin and SuperAdmin; **writes** (cities, routes, fare rules, seed) are SuperAdmin-only (`403` otherwise). List endpoints take `page`, `limit` and `search` and return `{ success, data, total, page, pages }`.

| Method & path | Description |
|---|---|
| `GET /stats` | counters: bookings, paid, online revenue, cities, routes, fare rules |
| `POST /seed-defaults` | insert default cities and fare rules (skips existing) |
| `GET /cities` · `POST /cities` · `PUT /cities/:id` · `DELETE /cities/:id` | city fields: `name`, `state`, `lat`, `lng`, `isPopular`, `isActive` |
| `GET /routes` · `POST /routes` · `PUT /routes/:id` · `DELETE /routes/:id` | create: `from`, `to`, `distanceKm`, `durationMins`, `isActive`; update: distance/duration/active. Routes work in both directions; a reverse duplicate is rejected (`409`) |
| `GET /fare-rules` · `POST /fare-rules` · `PUT /fare-rules/:id` · `DELETE /fare-rules/:id` | `vehicleType`, `name`, `model`, `seats`, `imageUrl`, `perKmOneway`, `perKmRound`, `minKmOneway`, `minKmPerDay`, `driverAllowance`, `driverAllowancePerDay`, `gstPercent`, `packages[]` (`label`, `hours`, `km`, `price`, `extraKmRate`, `extraHourRate`), `sortOrder`, `isActive` |
| `GET /bookings` | filters: `status`, `payment` (`pending/paid/failed`), `search` (ID, name, mobile, city) |
| `GET /bookings/:bookingId` | full booking incl. payment and notification info |
| `PATCH /bookings/:bookingId` | `{ status?, cancelReason?, adminNote?, assignedPartner? }` |
| `PUT /api/admins/settings` | existing endpoint; new field `webPartPaymentPercent` (1–100, default 25) |

Collections created: `webcities`, `webroutes`, `webfarerules`, `webbookings`. The existing app `Booking` model/APIs are untouched.

## Quick test (curl)

```bash
curl "$API/api/locations/suggest?q=del"
curl "$API/api/distance?from=Delhi&to=Agra"
curl -X POST $API/api/fare/calculate -H 'content-type: application/json' \
  -d '{"vehicleType":"sedan","distanceKm":212,"tripType":"oneway"}'
```

## Notes / limitations

- Fares are computed from admin fare rules, so numbers will differ from the spec's sample JSON until the rules are tuned to your real pricing (the sample values in the spec are not internally consistent).
- Razorpay mode follows the keys in `.env` (currently a **live** key id) — use test keys for development.
- Booking is created before payment (spec order). A paid-booking filter in the admin page (`payment=paid`) shows only confirmed-paid trips.
