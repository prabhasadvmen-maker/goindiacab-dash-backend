import fs from 'fs';

const rawData = `
Step 1: Auth & Basic Profile
1	POST	/api/v2/partner/auth/login	{"phone":"9876543210"}
2	POST	/api/v2/partner/auth/verify	{"phone":"9876543210", "otp":"1234"}
3	POST	/api/v2/partner/auth/resend	{"phone":"9876543210"}
4	POST	/api/v2/partner/auth/logout	{}
5	GET	/api/v2/partner/profile/me	
6	PATCH	/api/v2/partner/profile/name	{"name":"John Doe"}
7	PATCH	/api/v2/partner/profile/email	{"email":"john@example.com"}
8	PATCH	/api/v2/partner/profile/dob	{"dob":"1990-01-01"}
9	PATCH	/api/v2/partner/profile/gender	{"gender":"Male"}
10	PATCH	/api/v2/partner/profile/photo	{"photoUrl":"http://..."}
Step 2: Address & Vehicle Basics
11	PATCH	/api/v2/partner/profile/address/street	{"street":"123 Main"}
12	PATCH	/api/v2/partner/profile/address/city	{"city":"New Delhi"}
13	PATCH	/api/v2/partner/profile/address/state	{"state":"Delhi"}
14	PATCH	/api/v2/partner/profile/address/pincode	{"pincode":"110001"}
15	POST	/api/v2/partner/vehicle/check-eligibility	{"registrationYear":2021}
16	PATCH	/api/v2/partner/vehicle/make	{"make":"Maruti"}
17	PATCH	/api/v2/partner/vehicle/model	{"model":"Swift"}
18	PATCH	/api/v2/partner/vehicle/year	{"year":2021}
19	PATCH	/api/v2/partner/vehicle/color	{"color":"White"}
20	PATCH	/api/v2/partner/vehicle/plate-number	{"plateNumber":"DL1ZC1234"}
Step 3: Driver KYC & Vehicle Docs
21	PATCH	/api/v2/partner/profile/kyc/dl-front	{"imageUrl":"http://..."}
22	PATCH	/api/v2/partner/profile/kyc/dl-back	{"imageUrl":"http://..."}
23	PATCH	/api/v2/partner/profile/kyc/aadhaar-front	{"imageUrl":"http://..."}
24	PATCH	/api/v2/partner/profile/kyc/aadhaar-back	{"imageUrl":"http://..."}
25	PATCH	/api/v2/partner/profile/kyc/pan	{"imageUrl":"http://..."}
26	PATCH	/api/v2/partner/vehicle/docs/rc	{"imageUrl":"http://..."}
27	PATCH	/api/v2/partner/vehicle/docs/insurance	{"imageUrl":"http://..."}
28	PATCH	/api/v2/partner/vehicle/docs/permit	{"imageUrl":"http://..."}
29	PATCH	/api/v2/partner/vehicle/docs/fitness	{"imageUrl":"http://..."}
30	PATCH	/api/v2/partner/vehicle/photos/front	{"imageUrl":"http://..."}
Step 4: Vehicle Photos, Bank & Payment
31	PATCH	/api/v2/partner/vehicle/photos/back	{"imageUrl":"http://..."}
32	PATCH	/api/v2/partner/vehicle/photos/left	{"imageUrl":"http://..."}
33	PATCH	/api/v2/partner/vehicle/photos/right	{"imageUrl":"http://..."}
34	PATCH	/api/v2/partner/profile/bank/account-name	{"accountName":"John Doe"}
35	PATCH	/api/v2/partner/profile/bank/account-number	{"accountNumber":"123456789"}
36	PATCH	/api/v2/partner/profile/bank/ifsc	{"ifsc":"HDFC0001"}
37	PATCH	/api/v2/partner/profile/bank/bank-name	{"bankName":"HDFC"}
38	POST	/api/v2/partner/onboarding/payment-initiate	{}
39	POST	/api/v2/partner/onboarding/payment-verify	{"orderId":"123","paymentId":"456"}
40	POST	/api/v2/partner/onboarding/submit-application	{}
Step 5: Bookings & Active Rides
41	GET	/api/v2/partner/bookings/active	
42	GET	/api/v2/partner/bookings/history	
43	GET	/api/v2/partner/bookings/requests	
44	POST	/api/v2/partner/bookings/:id/accept	{}
45	POST	/api/v2/partner/bookings/:id/decline	{}
46	PATCH	/api/v2/partner/bookings/:id/arrive	{}
47	PATCH	/api/v2/partner/bookings/:id/start	{"otp":"1234"}
48	PATCH	/api/v2/partner/bookings/:id/complete	{}
49	PATCH	/api/v2/partner/bookings/:id/cancel	{"reason":"delayed"}
50	GET	/api/v2/partner/bookings/:id/route	
Step 6: Finance, Wallet & Earnings
51	GET	/api/v2/partner/finance/wallet/balance	
52	GET	/api/v2/partner/finance/wallet/transactions	
53	POST	/api/v2/partner/finance/wallet/withdraw	{"amount":100}
54	GET	/api/v2/partner/finance/earnings/today	
55	GET	/api/v2/partner/finance/earnings/weekly	
56	GET	/api/v2/partner/finance/earnings/monthly	
57	GET	/api/v2/partner/finance/settlements/history	
58	GET	/api/v2/partner/finance/settlements/pending	
59	GET	/api/v2/partner/finance/invoices/:tripId	
60	GET	/api/v2/partner/finance/taxes/tds-summary	
Step 7: Support, SOS & Settings
61	GET	/api/v2/partner/support/tickets	
62	GET	/api/v2/partner/support/tickets/:id	
63	POST	/api/v2/partner/support/tickets/create	{"subject":"Issue","description":"...","tripId":"..."}
64	POST	/api/v2/partner/support/tickets/:id/reply	{"message":"..."}
65	POST	/api/v2/partner/support/emergency/sos	{"lat":28,"lng":77,"tripId":"..."}
66	GET	/api/v2/partner/settings/preferences	
67	PATCH	/api/v2/partner/settings/language	{"language":"en"}
68	PATCH	/api/v2/partner/settings/navigation	{"appName":"GMAP"}
69	PATCH	/api/v2/partner/settings/notifications	{"enabled":true}
70	POST	/api/v2/partner/settings/device-token	{"token":"...","deviceOs":"android"}
Step 8: Performance, Referrals & Alerts
71	GET	/api/v2/partner/performance/ratings	
72	GET	/api/v2/partner/performance/metrics	
73	GET	/api/v2/partner/activity/logs	
74	PUT	/api/v2/partner/activity/status	{"isOnline":true}
75	PATCH	/api/v2/partner/activity/location	{"lat":28,"lng":77}
76	GET	/api/v2/partner/referrals/code	
77	GET	/api/v2/partner/referrals/history	
78	POST	/api/v2/partner/referrals/claim	{}
79	GET	/api/v2/partner/notifications/all	
80	PATCH	/api/v2/partner/notifications/:id/read	{}
Unique V1 APIs
81	GET	/api/partner/bookings?status=ACTIVE	
82	GET	/api/partner/bookings/:id	
83	PUT	/api/partner/bookings/:id/status	{"status":"ARRIVED","cancelReason":""}
84	GET	/api/partner/dashboard-stats	
85	GET	/api/partner/admin/applications?status=submitted&page=1&limit=20	
86	GET	/api/partner/admin/applications/:partnerId	
87	PUT	/api/partner/admin/review/:partnerId	{"decision":"approve","rejectionReason":"","correctionFields":[],"correctionNote":""}
`;

const lines = rawData.trim().split('\n');
let currentFolder = null;

const collection = {
  info: {
    name: "GoIndiaCab Partner APIs",
    description: "Complete 87 APIs for Partner (Driver) - V2 Granular + V1 Unique",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [],
  variable: [
    { key: "baseUrl", value: "http://localhost:5000", type: "string" },
    { key: "token", value: "YOUR_JWT_TOKEN", type: "string" }
  ]
};

for (const line of lines) {
  if (line.startsWith('Step ') || line.startsWith('Unique ')) {
    currentFolder = {
      name: line.trim(),
      item: []
    };
    collection.item.push(currentFolder);
  } else {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const id = parts[0].trim();
      const method = parts[1].trim();
      const endpoint = parts[2].trim();
      const bodyStr = parts[3] ? parts[3].trim() : "";

      const requireAuth = !endpoint.includes('/auth/login') && !endpoint.includes('/auth/verify') && !endpoint.includes('/auth/resend');

      const request = {
        method,
        header: [],
        url: {
          raw: "{{baseUrl}}" + endpoint,
          host: ["{{baseUrl}}"],
          path: endpoint.split('/').filter(p => p !== "")
        }
      };

      if (requireAuth) {
        request.header.push({
          key: "Authorization",
          value: "Bearer {{token}}",
          type: "text"
        });
      }

      if (bodyStr && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        request.body = {
          mode: "raw",
          raw: bodyStr,
          options: {
            raw: { language: "json" }
          }
        };
      }

      currentFolder.item.push({
        name: `${id}. ${endpoint.split('/').pop()}`,
        request
      });
    }
  }
}

fs.writeFileSync('GoIndiaCab_Partner_Postman_Collection.json', JSON.stringify(collection, null, 2));
console.log('Postman collection generated successfully.');
