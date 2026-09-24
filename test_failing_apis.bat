@echo off
set TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjUxMWU3Y2E4OGI0ZWU5YTk4ZjU4ZSIsImlhdCI6MTc5MDI1MTg0NCwiZXhwIjoxNzkyODQzODQ0fQ.jB2FhVbZLSydiKbTu73pppIMRiytJ73gjmt8Ffd3LIs
set ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYTg0MzlmNGI1MTlhNjE4ZGE3YzRjZSIsImlhdCI6MTc5MDI1MTgzMSwiZXhwIjoxNzkyODQzODMxfQ.VRP_LLNFivEoPPZeLrHzwKJhs8rMXOLNu0wWrh0K5x8
set BASE=http://localhost:5000/api/v2/partner
set BASE2=http://localhost:5000/api/partner
set H1=Content-Type: application/json
set H2=Authorization: Bearer %TOKEN%
set H3=Authorization: Bearer %ADMIN_TOKEN%

echo ============================================================
echo RETESTING PREVIOUSLY FAILING APIs
echo ============================================================

echo.
echo --- [2] POST /auth/verify (OTP fix) ---
curl -s -X POST %BASE%/auth/login -H "%H1%" -d "{\"phone\":\"9911225010\"}"
curl -s -X POST %BASE%/auth/verify -H "%H1%" -d "{\"phone\":\"9911225010\",\"otp\":\"1234\"}"

echo.
echo --- [82] POST /auth/verify-otp (old route) ---
curl -s -X POST %BASE2%/auth/send-otp -H "%H1%" -d "{\"phone\":\"9911225010\"}"
curl -s -X POST %BASE2%/auth/verify-otp -H "%H1%" -d "{\"phone\":\"9911225010\",\"otp\":\"1234\"}"

echo.
echo --- [44] POST /bookings/REAL_ID/accept (using real booking) ---
curl -s -X GET %BASE%/bookings/requests -H "%H2%"

echo.
echo --- [83] POST /onboarding/vehicle-check (with year) ---
curl -s -X POST %BASE2%/onboarding/vehicle-check -H "%H1%" -H "%H2%" -d "{\"vehicleNumber\":\"DL1ZC9988\",\"vehicleRegistrationYear\":\"2023\"}"

echo.
echo --- [84] PUT /onboarding/personal-details ---
curl -s -X PUT %BASE2%/onboarding/personal-details -H "%H1%" -H "%H2%" -d "{\"name\":\"Rahul Kumar\",\"email\":\"rahul_test_9911@test.com\",\"dateOfBirth\":\"1995-06-15\",\"gender\":\"Male\"}"

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
curl -s -X PUT %BASE2%/onboarding/vehicle-documents -H "%H1%" -H "%H2%" -d "{\"rc\":{\"number\":\"RC123456\",\"expiryDate\":\"2030-01-01\",\"image\":\"https://example.com/rc.jpg\"},\"insurance\":{\"policyNumber\":\"POL123456\",\"expiryDate\":\"2030-01-01\",\"image\":\"https://example.com/ins.jpg\"},\"puc\":{\"certificateNumber\":\"PUC123\",\"expiryDate\":\"2026-01-01\",\"image\":\"https://example.com/puc.jpg\"}}"

echo.
echo --- [92] PUT /onboarding/vehicle-photos ---
curl -s -X PUT %BASE2%/onboarding/vehicle-photos -H "%H1%" -H "%H2%" -d "{\"front\":\"https://example.com/front.jpg\",\"back\":\"https://example.com/back.jpg\",\"left\":\"https://example.com/left.jpg\",\"right\":\"https://example.com/right.jpg\",\"interior\":\"https://example.com/interior.jpg\"}"

echo.
echo --- [94] POST /onboarding/payment ---
curl -s -X POST %BASE2%/onboarding/payment -H "%H1%" -H "%H2%" -d "{\"transactionId\":\"TXN_TEST_123456\"}"

echo.
echo --- [95] POST /onboarding/submit ---
curl -s -X POST %BASE2%/onboarding/submit -H "%H1%" -H "%H2%"

echo.
echo --- [97] PUT /status ---
curl -s -X PUT %BASE2%/status -H "%H1%" -H "%H2%" -d "{\"isOnline\":true}"

echo.
echo --- [106] GET /admin/applications (admin token) ---
curl -s -X GET %BASE2%/admin/applications -H "%H3%"

echo.
echo --- [107] GET /admin/applications/6ab511e7ca88b4ee9a98f58e (admin token) ---
curl -s -X GET %BASE2%/admin/applications/6ab511e7ca88b4ee9a98f58e -H "%H3%"

echo.
echo --- [108] PUT /admin/review/6ab511e7ca88b4ee9a98f58e (admin token) ---
curl -s -X PUT %BASE2%/admin/review/6ab511e7ca88b4ee9a98f58e -H "%H1%" -H "%H3%" -d "{\"decision\":\"approved\"}"

echo.
echo ============================================================
echo DONE
echo ============================================================
