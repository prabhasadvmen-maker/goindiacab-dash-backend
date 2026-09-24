# GoIndiaCab Complete Partner API Documentation (108 APIs)

**Target Audience:** Android / iOS Developers  
**Base URL (V2):** `https://api.goindiacab.com/api/v2/partner`  
**Base URL (V1 Legacy):** `https://api.goindiacab.com/api/partner`  
**Authentication:** Pass `Authorization: Bearer <TOKEN>` in the headers for routes marked with ✅.

---

## 🟢 PART A: Granular V2 APIs (80 APIs)
*Base Route:* `/api/v2/partner`

### 1. Auth & Basic Profile (10 APIs)

#### 1. Login (Send OTP)
- **Method:** `POST` | **Endpoint:** `/auth/login` | **Auth:** ❌
- **Request:** `{"phone": "9876543210"}`
- **Response:** `{"success": true, "message": "OTP sent"}`

#### 2. Verify OTP
- **Method:** `POST` | **Endpoint:** `/auth/verify` | **Auth:** ❌
- **Request:** `{"phone": "9876543210", "otp": "1234"}`
- **Response:** `{"success": true, "data": {"token": "jwt_token_here", "partner": {}}}`

#### 3. Resend OTP
- **Method:** `POST` | **Endpoint:** `/auth/resend` | **Auth:** ❌
- **Request:** `{"phone": "9876543210"}`
- **Response:** `{"success": true, "message": "OTP resent"}`

#### 4. Logout
- **Method:** `POST` | **Endpoint:** `/auth/logout` | **Auth:** ✅
- **Request:** `{}`
- **Response:** `{"success": true, "message": "Logged out"}`

#### 5. Get My Profile
- **Method:** `GET` | **Endpoint:** `/profile/me` | **Auth:** ✅
- **Response:** `{"success": true, "data": {"name": "...", "phone": "..."}}`

#### 6. Update Name
- **Method:** `PATCH` | **Endpoint:** `/profile/name` | **Auth:** ✅
- **Request:** `{"name": "John Doe"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 7. Update Email
- **Method:** `PATCH` | **Endpoint:** `/profile/email` | **Auth:** ✅
- **Request:** `{"email": "driver@example.com"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 8. Update DOB
- **Method:** `PATCH` | **Endpoint:** `/profile/dob` | **Auth:** ✅
- **Request:** `{"dob": "1990-01-01"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 9. Update Gender
- **Method:** `PATCH` | **Endpoint:** `/profile/gender` | **Auth:** ✅
- **Request:** `{"gender": "Male"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 10. Update Profile Photo
- **Method:** `PATCH` | **Endpoint:** `/profile/photo` | **Auth:** ✅
- **Request:** `{"photoUrl": "https://s3/link/to/photo.jpg"}`
- **Response:** `{"success": true, "message": "Updated"}`

---

### 2. Address & Vehicle Basics (10 APIs)

#### 11. Update Street Address
- **Method:** `PATCH` | **Endpoint:** `/profile/address/street` | **Auth:** ✅
- **Request:** `{"street": "123 Main St"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 12. Update City
- **Method:** `PATCH` | **Endpoint:** `/profile/address/city` | **Auth:** ✅
- **Request:** `{"city": "New Delhi"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 13. Update State
- **Method:** `PATCH` | **Endpoint:** `/profile/address/state` | **Auth:** ✅
- **Request:** `{"state": "Delhi"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 14. Update Pincode
- **Method:** `PATCH` | **Endpoint:** `/profile/address/pincode` | **Auth:** ✅
- **Request:** `{"pincode": "110001"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 15. Check Vehicle Eligibility
- **Method:** `POST` | **Endpoint:** `/vehicle/check-eligibility` | **Auth:** ✅
- **Request:** `{"vehicleNumber": "DL1ZC1234"}`
- **Response:** `{"success": true, "data": {"eligible": true}}`

#### 16. Update Vehicle Make
- **Method:** `PATCH` | **Endpoint:** `/vehicle/make` | **Auth:** ✅
- **Request:** `{"make": "Maruti Suzuki"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 17. Update Vehicle Model
- **Method:** `PATCH` | **Endpoint:** `/vehicle/model` | **Auth:** ✅
- **Request:** `{"model": "Dzire"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 18. Update Vehicle Year
- **Method:** `PATCH` | **Endpoint:** `/vehicle/year` | **Auth:** ✅
- **Request:** `{"year": 2021}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 19. Update Vehicle Color
- **Method:** `PATCH` | **Endpoint:** `/vehicle/color` | **Auth:** ✅
- **Request:** `{"color": "White"}`
- **Response:** `{"success": true, "message": "Updated"}`

#### 20. Update Plate Number
- **Method:** `PATCH` | **Endpoint:** `/vehicle/plate-number` | **Auth:** ✅
- **Request:** `{"plateNumber": "DL1ZC1234"}`
- **Response:** `{"success": true, "message": "Updated"}`

---

### 3. Driver KYC & Vehicle Docs (10 APIs)
*Note: For all document uploads, the Android App should first upload the image to S3/Cloudflare and send the `imageUrl` in the body.*

#### 21. Upload DL Front
- `PATCH /profile/kyc/dl-front` | `{"imageUrl": "url_here"}`

#### 22. Upload DL Back
- `PATCH /profile/kyc/dl-back` | `{"imageUrl": "url_here"}`

#### 23. Upload Aadhaar Front
- `PATCH /profile/kyc/aadhaar-front` | `{"imageUrl": "url_here"}`

#### 24. Upload Aadhaar Back
- `PATCH /profile/kyc/aadhaar-back` | `{"imageUrl": "url_here"}`

#### 25. Upload PAN Card
- `PATCH /profile/kyc/pan` | `{"imageUrl": "url_here"}`

#### 26. Upload RC Book
- `PATCH /vehicle/docs/rc` | `{"imageUrl": "url_here"}`

#### 27. Upload Commercial Insurance
- `PATCH /vehicle/docs/insurance` | `{"imageUrl": "url_here"}`

#### 28. Upload Transport Permit
- `PATCH /vehicle/docs/permit` | `{"imageUrl": "url_here"}`

#### 29. Upload Fitness Certificate
- `PATCH /vehicle/docs/fitness` | `{"imageUrl": "url_here"}`

#### 30. Upload Vehicle Front Photo
- `PATCH /vehicle/photos/front` | `{"imageUrl": "url_here"}`

---

### 4. Vehicle Photos, Bank & Payment (10 APIs)

#### 31-33. Upload Vehicle Photos (Back, Left, Right)
- `PATCH /vehicle/photos/back` | `{"imageUrl": "url_here"}`
- `PATCH /vehicle/photos/left` | `{"imageUrl": "url_here"}`
- `PATCH /vehicle/photos/right` | `{"imageUrl": "url_here"}`

#### 34. Update Bank Account Name
- `PATCH /profile/bank/account-name` | `{"accountName": "John Doe"}`

#### 35. Update Bank Account Number
- `PATCH /profile/bank/account-number` | `{"accountNumber": "9876543210123"}`

#### 36. Update Bank IFSC
- `PATCH /profile/bank/ifsc` | `{"ifsc": "HDFC0001234"}`

#### 37. Update Bank Name
- `PATCH /profile/bank/bank-name` | `{"bankName": "HDFC Bank"}`

#### 38. Initiate Onboarding Payment
- `POST /onboarding/payment-initiate`
- **Response:** `{"success": true, "data": {"orderId": "order_123"}}`

#### 39. Verify Onboarding Payment
- `POST /onboarding/payment-verify`
- **Request:** `{"orderId": "order_123", "paymentId": "pay_123"}`

#### 40. Submit Application for Review
- `POST /onboarding/submit-application`
- **Response:** `{"success": true, "message": "Submitted to admin"}`

---

### 5. Bookings & Active Rides (10 APIs)

#### 41. Get Active Booking (App Recovery)
- `GET /bookings/active`
- **Response:** `{"success": true, "data": { "_id": "...", "status": "IN_PROGRESS" }}`

#### 42. Get Booking History
- `GET /bookings/history`
- **Response:** `{"success": true, "data": [ { ... } ]}`

#### 43. Get Pending Ride Requests (Radar)
- `GET /bookings/requests`

#### 44. Accept Ride
- `POST /bookings/:id/accept`

#### 45. Decline Ride
- `POST /bookings/:id/decline`

#### 46. Mark Arrived
- `PATCH /bookings/:id/arrive`

#### 47. Start Trip (Requires OTP)
- `PATCH /bookings/:id/start`
- **Request:** `{"otp": "4321"}`

#### 48. Complete Trip
- `PATCH /bookings/:id/complete`

#### 49. Cancel Trip
- `PATCH /bookings/:id/cancel`
- **Request:** `{"reason": "Customer not reachable"}`

#### 50. Get Route Details
- `GET /bookings/:id/route`

---

### 6. Finance, Wallet & Earnings (10 APIs)

#### 51. Get Wallet Balance
- `GET /finance/wallet/balance`
- **Response:** `{"success": true, "data": {"balance": 3250}}`

#### 52. Get Wallet Transactions (Passbook)
- `GET /finance/wallet/transactions`

#### 53. Request Withdrawal
- `POST /finance/wallet/withdraw`
- **Request:** `{"amount": 1000}`

#### 54. Get Today's Earnings
- `GET /finance/earnings/today`
- **Response:** `{"success": true, "data": {"today": 1500, "trips": 5}}`

#### 55. Get Weekly Earnings
- `GET /finance/earnings/weekly`

#### 56. Get Monthly Earnings
- `GET /finance/earnings/monthly`

#### 57. Get Settlements History
- `GET /finance/settlements/history`

#### 58. Get Pending Settlements
- `GET /finance/settlements/pending`

#### 59. Download Trip Invoice
- `GET /finance/invoices/:tripId`

#### 60. Get TDS Summary
- `GET /finance/taxes/tds-summary`

---

### 7. Support, SOS & Settings (10 APIs)

#### 61. List Support Tickets
- `GET /support/tickets`

#### 62. Get Single Ticket Details
- `GET /support/tickets/:id`

#### 63. Create Support Ticket
- `POST /support/tickets/create`
- **Request:** `{"subject": "Fare mismatch", "description": "Didn't get paid for trip"}`

#### 64. Reply on Ticket
- `POST /support/tickets/:id/reply`
- **Request:** `{"message": "Please check again."}`

#### 65. Trigger Emergency SOS
- `POST /support/emergency/sos`
- **Request:** `{"lat": 28.5, "lng": 77.1}`

#### 66. Get App Preferences
- `GET /settings/preferences`

#### 67. Update Language
- `PATCH /settings/language`
- **Request:** `{"language": "hi"}`

#### 68. Update Navigation App
- `PATCH /settings/navigation`
- **Request:** `{"appName": "GMAP"}`

#### 69. Toggle Push Notifications
- `PATCH /settings/notifications`
- **Request:** `{"enabled": true}`

#### 70. Register FCM Device Token
- `POST /settings/device-token`
- **Request:** `{"token": "fcm_token_xyz123"}`

---

### 8. Performance, Referrals & Alerts (10 APIs)

#### 71. Get Performance Ratings
- `GET /performance/ratings`

#### 72. Get Performance Metrics (Online Hours/Acceptance)
- `GET /performance/metrics`

#### 73. Get Activity Logs
- `GET /activity/logs`

#### 74. Toggle Online/Offline Status
- `PUT /activity/status`
- **Request:** `{"isOnline": true}`

#### 75. Ping Live Location (Foreground Service)
- `PATCH /activity/location`
- **Request:** `{"lat": 28.7041, "lng": 77.1025}`

#### 76. Get Referral Code
- `GET /referrals/code`

#### 77. Get Referral History
- `GET /referrals/history`

#### 78. Claim Referral Bonus
- `POST /referrals/claim`

#### 79. Get All Notifications
- `GET /notifications/all`

#### 80. Mark Notification as Read
- `PATCH /notifications/:id/read`

---
---

## 🟡 PART B: V1 Legacy / Consolidated APIs (28 APIs)
*Base Route:* `/api/partner`
*Note: These are mostly used by older app versions or Admin panels. Mobile devs should prefer V2 APIs where possible.*

#### 81. Send OTP
- `POST /auth/send-otp` | `{"phone": "9876543210"}`
#### 82. Verify OTP
- `POST /auth/verify-otp` | `{"phone": "9876543210", "otp": "1234"}`

#### 83-95. Consolidated Onboarding Steps
- `POST /onboarding/vehicle-check`
- `PUT /onboarding/personal-details`
- `PUT /onboarding/address`
- `PUT /onboarding/driving-licence`
- `PUT /onboarding/aadhaar`
- `PUT /onboarding/pan`
- `PUT /onboarding/bank-account`
- `PUT /onboarding/vehicle-details`
- `PUT /onboarding/vehicle-documents`
- `PUT /onboarding/vehicle-photos`
- `GET /onboarding/review`
- `POST /onboarding/payment`
- `POST /onboarding/submit`

#### 96-97. Profile & Status
- `GET /profile`
- `PUT /status` | `{"isOnline": true, "location": {"lat": 28, "lng": 77}}`

#### 98-101. Monolithic Bookings
- `GET /bookings`
- `GET /bookings/:id`
- `POST /bookings/:id/accept`
- `PUT /bookings/:id/status` | `{"status": "ARRIVED"}`

#### 102-105. Earnings & Notifications
- `GET /dashboard-stats`
- `GET /earnings`
- `GET /notifications`
- `PUT /notifications/read`

#### 106-108. Admin Application Review APIs
*(Admin protected endpoints, not for Driver App)*
- `GET /admin/applications`
- `GET /admin/applications/:partnerId`
- `PUT /admin/review/:partnerId` | `{"status": "approved"}`
