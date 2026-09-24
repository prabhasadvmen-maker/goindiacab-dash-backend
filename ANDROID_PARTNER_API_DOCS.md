# GoIndiaCab - Partner (Driver) API Documentation
**Version:** 2.0 (Granular Architecture)
**Target:** Android App Developers
**Base URL:** `https://api.goindiacab.com/api/v2/partner` (Replace with Dev/Staging URL)

---

## 📌 General Instructions for Android Team

### 1. Authentication
All endpoints (except `/auth/send-otp` & `/auth/verify-otp`) require a JWT token in the header.
```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

### 2. Standard Response Format
All APIs return a standard JSON response to make parsing easier in Android (using Retrofit/Gson).

**✅ Success Response (HTTP 200/201):**
```json
{
  "success": true,
  "message": "Optional success message",
  "data": { ... } // Varies per endpoint
}
```

**❌ Error Response (HTTP 400/401/404/500):**
```json
{
  "success": false,
  "message": "Error description here"
}
```

### 3. File Uploads (Images/Documents)
For APIs involving file uploads (e.g., RC Book, Photos, DL), the Android app should either:
- Send `multipart/form-data` with the file if the server handles raw files.
- **(Current V2 Approach):** The Android app first uploads the image to AWS S3 / Cloudflare R2, gets the image URL, and sends the URL in a standard JSON `PATCH` request.
*Example:* `{"imageUrl": "https://pub-r2.dev/xyz.jpg"}`

---

## 🚀 1. Authentication & Onboarding

### 1.1 Send OTP
- **Endpoint:** `POST /auth/send-otp`
- **Body:** `{"phone": "9876543210"}`
- **Response:** `{"success": true, "message": "OTP Sent"}`

### 1.2 Verify OTP & Login
- **Endpoint:** `POST /auth/verify-otp`
- **Body:** `{"phone": "9876543210", "otp": "1234"}`
- **Response:** 
```json
{
  "success": true, 
  "data": {
    "token": "eyJhbGci...",
    "partner": { "id": "...", "name": "...", "phone": "9876543210" }
  }
}
```

---

## 👤 2. Profile Management

All profile updates use the `PATCH` method for atomicity.

- `GET /profile/me` 
  - **Returns:** The complete partner object.
- `PATCH /profile/name` 
  - **Body:** `{"name": "Rahul Kumar"}`
- `PATCH /profile/email` 
  - **Body:** `{"email": "rahul@email.com"}`
- `PATCH /profile/gender` 
  - **Body:** `{"gender": "Male"}`
- `PATCH /profile/address/city` 
  - **Body:** `{"city": "New Delhi"}`
- `PATCH /profile/bank/account-number` 
  - **Body:** `{"accountNumber": "9876543210123"}`

---

## 🚗 3. Vehicle & Documents

- `POST /vehicle/check-eligibility`
  - **Body:** `{"vehicleNumber": "DL1ZC9988"}`
- `PATCH /vehicle/make`
  - **Body:** `{"make": "Maruti Suzuki"}`
- `PATCH /vehicle/model`
  - **Body:** `{"model": "Dzire"}`

### Document Uploads (Send Image URL after cloud upload)
- `PATCH /profile/kyc/dl-front` -> `{"imageUrl": "url_here"}`
- `PATCH /profile/kyc/aadhaar-front` -> `{"imageUrl": "url_here"}`
- `PATCH /vehicle/docs/rc` -> `{"imageUrl": "url_here"}`
- `PATCH /vehicle/docs/insurance` -> `{"imageUrl": "url_here"}`

---

## 🟢 4. Driver Status & Live Location

### 4.1 Toggle Online / Offline
- **Endpoint:** `PUT /activity/status`
- **Body:** `{"isOnline": true}`
- **Response:** `{"success": true, "message": "You are now online"}`

### 4.2 Ping Live Location
*Android Note: Run this in a Foreground Service every 10-15 seconds while Online.*
- **Endpoint:** `PATCH /activity/location`
- **Body:** `{"lat": 28.7041, "lng": 77.1025}`

---

## 🚖 5. Booking & Ride Flow

### 5.1 Listen for New Rides (WebSockets)
The app must connect to the Socket.io server to receive real-time ride requests.
- **Event:** `newBookingRequest`
- **Payload Received:** `{ "id": "...", "pickup": "...", "fare": 450, "distance": "5km" }`

### 5.2 Accept Ride
- **Endpoint:** `POST /bookings/{bookingId}/accept`
- **Body:** `{}`
- **Response:** `{"success": true, "data": { ...bookingDetails }}`

### 5.3 Ride Lifecycle Updates
- **Arrive at Pickup:** 
  - `PATCH /bookings/{bookingId}/arrive`
- **Start Trip (Requires OTP from Customer):** 
  - `PATCH /bookings/{bookingId}/start`
  - **Body:** `{"otp": "4321"}`
- **Complete Trip:** 
  - `PATCH /bookings/{bookingId}/complete`

### 5.4 Get Active Booking (App Restart Recovery)
*Call this when the app opens to check if the driver is currently in the middle of a trip.*
- **Endpoint:** `GET /bookings/active`
- **Response:** `{"success": true, "data": { "status": "IN_PROGRESS", "pickup": {...} }}` (or `data: null` if free).

---

## 💰 6. Finance & Earnings

- `GET /finance/wallet/balance`
  - **Returns:** `{"success": true, "data": {"balance": 3250}}`
- `GET /finance/wallet/transactions`
  - **Returns:** List of passbook entries (Credits/Debits).
- `POST /finance/wallet/withdraw`
  - **Body:** `{"amount": 1000}`
- `GET /finance/earnings/today`
  - **Returns:** `{"success": true, "data": {"today": 1500, "trips": 5}}`
- `GET /finance/settlements/history`
  - **Returns:** List of past bank payouts.

---

## 🎧 7. Support & SOS

- `GET /support/tickets`
  - **Returns:** List of support tickets.
- `POST /support/tickets/create`
  - **Body:** `{"subject": "Fare Issue", "description": "Didn't get paid"}`
- `POST /support/emergency/sos`
  - **Body:** `{"lat": 28.5, "lng": 77.1}`
  - **Description:** Triggers emergency police/admin alert.

---

## 🔔 8. Settings & Push Notifications

### 8.1 Register FCM Device Token
*Android Note: Call this silently on login so the backend can send Push Notifications (Firebase).*
- **Endpoint:** `POST /settings/device-token`
- **Body:** `{"token": "fcm_token_xyz123"}`

### 8.2 Get Notifications
- **Endpoint:** `GET /notifications/all`
- **Returns:** Array of alerts.

---

*For any questions regarding these endpoints or specific JSON properties, please contact the Backend/API Architect.*
