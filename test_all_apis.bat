@echo off
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjUxMWU3Y2E4OGI0ZWU5YTk4ZjU4ZSIsImlhdCI6MTc5MDI1MTU4NywiZXhwIjoxNzkyODQzNTg3fQ.6MnhDubxauOyNmDPRaeDo2ld_zNeG3q5nZzJtyma7o4
set BASE=http://localhost:5000/api/v2/partner
set BASE2=http://localhost:5000/api/partner
set H1=Content-Type: application/json
set H2=Authorization: Bearer %TOKEN%

echo ============================================================
echo TESTING ALL PARTNER APIs
echo ============================================================

echo.
echo --- [1] POST /auth/login ---
curl -s -X POST %BASE%/auth/login -H "%H1%" -d "{\"phone\":\"9911225010\"}"

echo.
echo --- [2] POST /auth/verify ---
curl -s -X POST %BASE%/auth/verify -H "%H1%" -d "{\"phone\":\"9911225010\",\"otp\":\"1234\"}"

echo.
echo --- [3] POST /auth/resend ---
curl -s -X POST %BASE%/auth/resend -H "%H1%" -d "{\"phone\":\"9911225010\"}"

echo.
echo --- [4] POST /auth/logout ---
curl -s -X POST %BASE%/auth/logout -H "%H1%" -H "%H2%"

echo.
echo --- [5] GET /profile/me ---
curl -s -X GET %BASE%/profile/me -H "%H2%"

echo.
echo --- [6] PATCH /profile/name ---
curl -s -X PATCH %BASE%/profile/name -H "%H1%" -H "%H2%" -d "{\"name\":\"Rahul Kumar\"}"

echo.
echo --- [7] PATCH /profile/email ---
curl -s -X PATCH %BASE%/profile/email -H "%H1%" -H "%H2%" -d "{\"email\":\"rahul@test.com\"}"

echo.
echo --- [8] PATCH /profile/dob ---
curl -s -X PATCH %BASE%/profile/dob -H "%H1%" -H "%H2%" -d "{\"dob\":\"1995-06-15\"}"

echo.
echo --- [9] PATCH /profile/gender ---
curl -s -X PATCH %BASE%/profile/gender -H "%H1%" -H "%H2%" -d "{\"gender\":\"Male\"}"

echo.
echo --- [10] PATCH /profile/photo ---
curl -s -X PATCH %BASE%/profile/photo -H "%H1%" -H "%H2%" -d "{\"photoUrl\":\"https://example.com/photo.jpg\"}"

echo.
echo --- [11] PATCH /profile/address/street ---
curl -s -X PATCH %BASE%/profile/address/street -H "%H1%" -H "%H2%" -d "{\"street\":\"123 Main Street\"}"

echo.
echo --- [12] PATCH /profile/address/city ---
curl -s -X PATCH %BASE%/profile/address/city -H "%H1%" -H "%H2%" -d "{\"city\":\"New Delhi\"}"

echo.
echo --- [13] PATCH /profile/address/state ---
curl -s -X PATCH %BASE%/profile/address/state -H "%H1%" -H "%H2%" -d "{\"state\":\"Delhi\"}"

echo.
echo --- [14] PATCH /profile/address/pincode ---
curl -s -X PATCH %BASE%/profile/address/pincode -H "%H1%" -H "%H2%" -d "{\"pincode\":\"110001\"}"

echo.
echo --- [15] POST /vehicle/check-eligibility ---
curl -s -X POST %BASE%/vehicle/check-eligibility -H "%H1%" -H "%H2%" -d "{\"registrationYear\":\"2020\"}"

echo.
echo --- [16] PATCH /vehicle/make ---
curl -s -X PATCH %BASE%/vehicle/make -H "%H1%" -H "%H2%" -d "{\"make\":\"Maruti Suzuki\"}"

echo.
echo --- [17] PATCH /vehicle/model ---
curl -s -X PATCH %BASE%/vehicle/model -H "%H1%" -H "%H2%" -d "{\"model\":\"Dzire\"}"

echo.
echo --- [18] PATCH /vehicle/year ---
curl -s -X PATCH %BASE%/vehicle/year -H "%H1%" -H "%H2%" -d "{\"year\":2020}"

echo.
echo --- [19] PATCH /vehicle/color ---
curl -s -X PATCH %BASE%/vehicle/color -H "%H1%" -H "%H2%" -d "{\"color\":\"White\"}"

echo.
echo --- [20] PATCH /vehicle/plate-number ---
curl -s -X PATCH %BASE%/vehicle/plate-number -H "%H1%" -H "%H2%" -d "{\"plateNumber\":\"DL1ZC9988\"}"

echo.
echo --- [21] PATCH /profile/kyc/dl-front ---
curl -s -X PATCH %BASE%/profile/kyc/dl-front -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/dl-front.jpg\"}"

echo.
echo --- [22] PATCH /profile/kyc/dl-back ---
curl -s -X PATCH %BASE%/profile/kyc/dl-back -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/dl-back.jpg\"}"

echo.
echo --- [23] PATCH /profile/kyc/aadhaar-front ---
curl -s -X PATCH %BASE%/profile/kyc/aadhaar-front -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/aadhaar-front.jpg\"}"

echo.
echo --- [24] PATCH /profile/kyc/aadhaar-back ---
curl -s -X PATCH %BASE%/profile/kyc/aadhaar-back -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/aadhaar-back.jpg\"}"

echo.
echo --- [25] PATCH /profile/kyc/pan ---
curl -s -X PATCH %BASE%/profile/kyc/pan -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/pan.jpg\"}"

echo.
echo --- [26] PATCH /vehicle/docs/rc ---
curl -s -X PATCH %BASE%/vehicle/docs/rc -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/rc.jpg\"}"

echo.
echo --- [27] PATCH /vehicle/docs/insurance ---
curl -s -X PATCH %BASE%/vehicle/docs/insurance -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/insurance.jpg\"}"

echo.
echo --- [28] PATCH /vehicle/docs/permit ---
curl -s -X PATCH %BASE%/vehicle/docs/permit -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/permit.jpg\"}"

echo.
echo --- [29] PATCH /vehicle/docs/fitness ---
curl -s -X PATCH %BASE%/vehicle/docs/fitness -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/fitness.jpg\"}"

echo.
echo --- [30] PATCH /vehicle/photos/front ---
curl -s -X PATCH %BASE%/vehicle/photos/front -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/veh-front.jpg\"}"

echo.
echo --- [31] PATCH /vehicle/photos/back ---
curl -s -X PATCH %BASE%/vehicle/photos/back -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/veh-back.jpg\"}"

echo.
echo --- [32] PATCH /vehicle/photos/left ---
curl -s -X PATCH %BASE%/vehicle/photos/left -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/veh-left.jpg\"}"

echo.
echo --- [33] PATCH /vehicle/photos/right ---
curl -s -X PATCH %BASE%/vehicle/photos/right -H "%H1%" -H "%H2%" -d "{\"imageUrl\":\"https://example.com/veh-right.jpg\"}"

echo.
echo --- [34] PATCH /profile/bank/account-name ---
curl -s -X PATCH %BASE%/profile/bank/account-name -H "%H1%" -H "%H2%" -d "{\"accountName\":\"Rahul Kumar\"}"

echo.
echo --- [35] PATCH /profile/bank/account-number ---
curl -s -X PATCH %BASE%/profile/bank/account-number -H "%H1%" -H "%H2%" -d "{\"accountNumber\":\"9876543210123\"}"

echo.
echo --- [36] PATCH /profile/bank/ifsc ---
curl -s -X PATCH %BASE%/profile/bank/ifsc -H "%H1%" -H "%H2%" -d "{\"ifsc\":\"SBIN0001234\"}"

echo.
echo --- [37] PATCH /profile/bank/bank-name ---
curl -s -X PATCH %BASE%/profile/bank/bank-name -H "%H1%" -H "%H2%" -d "{\"bankName\":\"State Bank of India\"}"

echo.
echo --- [38] POST /onboarding/payment-initiate ---
curl -s -X POST %BASE%/onboarding/payment-initiate -H "%H1%" -H "%H2%"

echo.
echo --- [39] POST /onboarding/payment-verify ---
curl -s -X POST %BASE%/onboarding/payment-verify -H "%H1%" -H "%H2%" -d "{\"orderId\":\"order_abc123\",\"paymentId\":\"pay_xyz789\"}"

echo.
echo --- [40] POST /onboarding/submit-application ---
curl -s -X POST %BASE%/onboarding/submit-application -H "%H1%" -H "%H2%"

echo.
echo --- [41] GET /bookings/active ---
curl -s -X GET %BASE%/bookings/active -H "%H2%"

echo.
echo --- [42] GET /bookings/history ---
curl -s -X GET %BASE%/bookings/history -H "%H2%"

echo.
echo --- [43] GET /bookings/requests ---
curl -s -X GET %BASE%/bookings/requests -H "%H2%"

echo.
echo --- [44] POST /bookings/test123/accept ---
curl -s -X POST %BASE%/bookings/test123/accept -H "%H1%" -H "%H2%"

echo.
echo --- [45] POST /bookings/test123/decline ---
curl -s -X POST %BASE%/bookings/test123/decline -H "%H1%" -H "%H2%"

echo.
echo --- [46] PATCH /bookings/test123/arrive ---
curl -s -X PATCH %BASE%/bookings/test123/arrive -H "%H1%" -H "%H2%"

echo.
echo --- [47] PATCH /bookings/test123/start ---
curl -s -X PATCH %BASE%/bookings/test123/start -H "%H1%" -H "%H2%" -d "{\"otp\":\"4321\"}"

echo.
echo --- [48] PATCH /bookings/test123/complete ---
curl -s -X PATCH %BASE%/bookings/test123/complete -H "%H1%" -H "%H2%"

echo.
echo --- [49] PATCH /bookings/test123/cancel ---
curl -s -X PATCH %BASE%/bookings/test123/cancel -H "%H1%" -H "%H2%" -d "{\"reason\":\"Emergency\"}"

echo.
echo --- [50] GET /bookings/test123/route ---
curl -s -X GET %BASE%/bookings/test123/route -H "%H2%"

echo.
echo --- [51] GET /finance/wallet/balance ---
curl -s -X GET %BASE%/finance/wallet/balance -H "%H2%"

echo.
echo --- [52] GET /finance/wallet/transactions ---
curl -s -X GET %BASE%/finance/wallet/transactions -H "%H2%"

echo.
echo --- [53] POST /finance/wallet/withdraw ---
curl -s -X POST %BASE%/finance/wallet/withdraw -H "%H1%" -H "%H2%" -d "{\"amount\":1000}"

echo.
echo --- [54] GET /finance/earnings/today ---
curl -s -X GET %BASE%/finance/earnings/today -H "%H2%"

echo.
echo --- [55] GET /finance/earnings/weekly ---
curl -s -X GET %BASE%/finance/earnings/weekly -H "%H2%"

echo.
echo --- [56] GET /finance/earnings/monthly ---
curl -s -X GET %BASE%/finance/earnings/monthly -H "%H2%"

echo.
echo --- [57] GET /finance/settlements/history ---
curl -s -X GET %BASE%/finance/settlements/history -H "%H2%"

echo.
echo --- [58] GET /finance/settlements/pending ---
curl -s -X GET %BASE%/finance/settlements/pending -H "%H2%"

echo.
echo --- [59] GET /finance/invoices/test123 ---
curl -s -X GET %BASE%/finance/invoices/test123 -H "%H2%"

echo.
echo --- [60] GET /finance/taxes/tds-summary ---
curl -s -X GET %BASE%/finance/taxes/tds-summary -H "%H2%"

echo.
echo --- [61] GET /support/tickets ---
curl -s -X GET %BASE%/support/tickets -H "%H2%"

echo.
echo --- [62] GET /support/tickets/TKT-1024 ---
curl -s -X GET %BASE%/support/tickets/TKT-1024 -H "%H2%"

echo.
echo --- [63] POST /support/tickets/create ---
curl -s -X POST %BASE%/support/tickets/create -H "%H1%" -H "%H2%" -d "{\"subject\":\"Test Issue\",\"description\":\"Testing ticket creation\"}"

echo.
echo --- [64] POST /support/tickets/TKT-1024/reply ---
curl -s -X POST %BASE%/support/tickets/TKT-1024/reply -H "%H1%" -H "%H2%" -d "{\"message\":\"Please resolve this\"}"

echo.
echo --- [65] POST /support/emergency/sos ---
curl -s -X POST %BASE%/support/emergency/sos -H "%H1%" -H "%H2%" -d "{\"lat\":28.5,\"lng\":77.1}"

echo.
echo --- [66] GET /settings/preferences ---
curl -s -X GET %BASE%/settings/preferences -H "%H2%"

echo.
echo --- [67] PATCH /settings/language ---
curl -s -X PATCH %BASE%/settings/language -H "%H1%" -H "%H2%" -d "{\"language\":\"hi\"}"

echo.
echo --- [68] PATCH /settings/navigation ---
curl -s -X PATCH %BASE%/settings/navigation -H "%H1%" -H "%H2%" -d "{\"appName\":\"GMAP\"}"

echo.
echo --- [69] PATCH /settings/notifications ---
curl -s -X PATCH %BASE%/settings/notifications -H "%H1%" -H "%H2%" -d "{\"enabled\":true}"

echo.
echo --- [70] POST /settings/device-token ---
curl -s -X POST %BASE%/settings/device-token -H "%H1%" -H "%H2%" -d "{\"token\":\"fcm_test_token_xyz\"}"

echo.
echo --- [71] GET /performance/ratings ---
curl -s -X GET %BASE%/performance/ratings -H "%H2%"

echo.
echo --- [72] GET /performance/metrics ---
curl -s -X GET %BASE%/performance/metrics -H "%H2%"

echo.
echo --- [73] GET /activity/logs ---
curl -s -X GET %BASE%/activity/logs -H "%H2%"

echo.
echo --- [74] PUT /activity/status ---
curl -s -X PUT %BASE%/activity/status -H "%H1%" -H "%H2%" -d "{\"isOnline\":true}"

echo.
echo --- [75] PATCH /activity/location ---
curl -s -X PATCH %BASE%/activity/location -H "%H1%" -H "%H2%" -d "{\"lat\":28.7041,\"lng\":77.1025}"

echo.
echo --- [76] GET /referrals/code ---
curl -s -X GET %BASE%/referrals/code -H "%H2%"

echo.
echo --- [77] GET /referrals/history ---
curl -s -X GET %BASE%/referrals/history -H "%H2%"

echo.
echo --- [78] POST /referrals/claim ---
curl -s -X POST %BASE%/referrals/claim -H "%H1%" -H "%H2%"

echo.
echo --- [79] GET /notifications/all ---
curl -s -X GET %BASE%/notifications/all -H "%H2%"

echo.
echo --- [80] PATCH /notifications/NOTIF-1/read ---
curl -s -X PATCH %BASE%/notifications/NOTIF-1/read -H "%H1%" -H "%H2%"

echo.
echo ============================================================
echo partnerRoutes.js APIs (BASE2)
echo ============================================================

echo.
echo --- [81] POST /auth/send-otp ---
curl -s -X POST %BASE2%/auth/send-otp -H "%H1%" -d "{\"phone\":\"9911225010\"}"

echo.
echo --- [82] POST /auth/verify-otp ---
curl -s -X POST %BASE2%/auth/verify-otp -H "%H1%" -d "{\"phone\":\"9911225010\",\"otp\":\"1234\"}"

echo.
echo --- [83] POST /onboarding/vehicle-check ---
curl -s -X POST %BASE2%/onboarding/vehicle-check -H "%H1%" -H "%H2%" -d "{\"vehicleNumber\":\"DL1ZC9988\"}"

echo.
echo --- [84] PUT /onboarding/personal-details ---
curl -s -X PUT %BASE2%/onboarding/personal-details -H "%H1%" -H "%H2%" -d "{\"name\":\"Rahul Kumar\",\"email\":\"rahul@test.com\",\"dateOfBirth\":\"1995-06-15\",\"gender\":\"Male\"}"

echo.
echo --- [85] PUT /onboarding/address ---
curl -s -X PUT %BASE2%/onboarding/address -H "%H1%" -H "%H2%" -d "{\"line1\":\"123 Main St\",\"city\":\"Delhi\",\"state\":\"Delhi\",\"pincode\":\"110001\"}"

echo.
echo --- [86] PUT /onboarding/driving-licence ---
curl -s -X PUT %BASE2%/onboarding/driving-licence -H "%H1%" -H "%H2%" -d "{\"number\":\"DL1234567890\",\"expiryDate\":\"2030-01-01\",\"frontImage\":\"https://example.com/dl-front.jpg\",\"backImage\":\"https://example.com/dl-back.jpg\"}"

echo.
echo --- [87] PUT /onboarding/aadhaar ---
curl -s -X PUT %BASE2%/onboarding/aadhaar -H "%H1%" -H "%H2%" -d "{\"number\":\"123456789012\",\"frontImage\":\"https://example.com/aadhaar-front.jpg\",\"backImage\":\"https://example.com/aadhaar-back.jpg\"}"

echo.
echo --- [88] PUT /onboarding/pan ---
curl -s -X PUT %BASE2%/onboarding/pan -H "%H1%" -H "%H2%" -d "{\"number\":\"ABCDE1234F\",\"image\":\"https://example.com/pan.jpg\"}"

echo.
echo --- [89] PUT /onboarding/bank-account ---
curl -s -X PUT %BASE2%/onboarding/bank-account -H "%H1%" -H "%H2%" -d "{\"accountNumber\":\"9876543210123\",\"ifscCode\":\"SBIN0001234\",\"bankName\":\"SBI\",\"accountHolderName\":\"Rahul Kumar\"}"

echo.
echo --- [90] PUT /onboarding/vehicle-details ---
curl -s -X PUT %BASE2%/onboarding/vehicle-details -H "%H1%" -H "%H2%" -d "{\"make\":\"Maruti\",\"model\":\"Dzire\",\"color\":\"White\",\"fuelType\":\"CNG\",\"seatingCapacity\":4,\"category\":\"Sedan\"}"

echo.
echo --- [91] PUT /onboarding/vehicle-documents ---
curl -s -X PUT %BASE2%/onboarding/vehicle-documents -H "%H1%" -H "%H2%" -d "{\"rc\":{\"number\":\"RC123\",\"image\":\"https://example.com/rc.jpg\"},\"insurance\":{\"policyNumber\":\"POL123\",\"image\":\"https://example.com/ins.jpg\"}}"

echo.
echo --- [92] PUT /onboarding/vehicle-photos ---
curl -s -X PUT %BASE2%/onboarding/vehicle-photos -H "%H1%" -H "%H2%" -d "{\"front\":\"https://example.com/front.jpg\",\"back\":\"https://example.com/back.jpg\"}"

echo.
echo --- [93] GET /onboarding/review ---
curl -s -X GET %BASE2%/onboarding/review -H "%H2%"

echo.
echo --- [94] POST /onboarding/payment ---
curl -s -X POST %BASE2%/onboarding/payment -H "%H1%" -H "%H2%" -d "{\"transactionId\":\"TXN123\",\"amount\":1999}"

echo.
echo --- [95] POST /onboarding/submit ---
curl -s -X POST %BASE2%/onboarding/submit -H "%H1%" -H "%H2%"

echo.
echo --- [96] GET /profile ---
curl -s -X GET %BASE2%/profile -H "%H2%"

echo.
echo --- [97] PUT /status ---
curl -s -X PUT %BASE2%/status -H "%H1%" -H "%H2%" -d "{\"isOnline\":true}"

echo.
echo --- [98] GET /bookings ---
curl -s -X GET %BASE2%/bookings -H "%H2%"

echo.
echo --- [99] GET /bookings/test123 ---
curl -s -X GET %BASE2%/bookings/test123 -H "%H2%"

echo.
echo --- [100] POST /bookings/test123/accept ---
curl -s -X POST %BASE2%/bookings/test123/accept -H "%H1%" -H "%H2%"

echo.
echo --- [101] PUT /bookings/test123/status ---
curl -s -X PUT %BASE2%/bookings/test123/status -H "%H1%" -H "%H2%" -d "{\"status\":\"COMPLETED\"}"

echo.
echo --- [102] GET /dashboard-stats ---
curl -s -X GET %BASE2%/dashboard-stats -H "%H2%"

echo.
echo --- [103] GET /earnings ---
curl -s -X GET %BASE2%/earnings -H "%H2%"

echo.
echo --- [104] GET /notifications ---
curl -s -X GET %BASE2%/notifications -H "%H2%"

echo.
echo --- [105] PUT /notifications/read ---
curl -s -X PUT %BASE2%/notifications/read -H "%H1%" -H "%H2%"

echo.
echo --- [106] GET /admin/applications ---
curl -s -X GET %BASE2%/admin/applications -H "%H2%"

echo.
echo --- [107] GET /admin/applications/test123 ---
curl -s -X GET %BASE2%/admin/applications/test123 -H "%H2%"

echo.
echo --- [108] PUT /admin/review/test123 ---
curl -s -X PUT %BASE2%/admin/review/test123 -H "%H1%" -H "%H2%" -d "{\"status\":\"approved\"}"

echo.
echo ============================================================
echo ALL APIs TESTED
echo ============================================================
