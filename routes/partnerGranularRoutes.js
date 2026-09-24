import express from 'express';
import { protectPartner } from '../middleware/partnerAuthMiddleware.js';
import {
  initiateLogin, verifyLogin, resendOtp, logout,
  getMyProfile, updateName, updateEmail, updateDOB, updateGender, updatePhoto,
  updateAddressStreet, updateAddressCity, updateAddressState, updateAddressPincode,
  checkVehicleEligibility, updateVehicleMake, updateVehicleModel, updateVehicleYear, updateVehicleColor, updateVehiclePlateNumber,
  updateDLFront, updateDLBack, updateAadhaarFront, updateAadhaarBack, updatePAN,
  updateVehicleRC, updateVehicleInsurance, updateVehiclePermit, updateVehicleFitness, updateVehiclePhotoFront,
  updateVehiclePhotoBack, updateVehiclePhotoLeft, updateVehiclePhotoRight,
  updateBankAccountName, updateBankAccountNumber, updateBankIFSC, updateBankName,
  initiateOnboardingPayment, verifyOnboardingPayment, submitPartnerApplication,
  getActiveBooking, getBookingHistory, getPendingRequests, acceptRideRequest, declineRideRequest,
  markDriverArrived, startTrip, completeTrip, cancelTripByPartner, getBookingRoute,
  getWalletBalance, getWalletTransactions, requestWithdrawal, getTodayEarnings, getWeeklyEarnings,
  getMonthlyEarnings, getSettlementHistory, getPendingSettlements, getTripInvoice, getTdsSummary,
  getSupportTickets, getSingleTicket, createSupportTicket, replyToTicket, triggerSOSAlert,
  getAppSettings, updateLanguage, updateNavigationApp, updatePushPreferences, registerDeviceToken,
  getDriverRatings, getDriverMetrics, getActivityLogs, toggleOnlineStatus, pingLiveLocation,
  getReferralCode, getReferralHistory, claimReferralBonus, getNotifications, markNotificationRead
} from '../controllers/partnerGranularController.js';

const router = express.Router();

// STEP 1: Auth & Basic Profile (10 APIs)
router.post('/auth/login', initiateLogin);        // 1
router.post('/auth/verify', verifyLogin);         // 2
router.post('/auth/resend', resendOtp);           // 3
router.post('/auth/logout', protectPartner, logout); // 4

router.get('/profile/me', protectPartner, getMyProfile);      // 5
router.patch('/profile/name', protectPartner, updateName);    // 6
router.patch('/profile/email', protectPartner, updateEmail);  // 7
router.patch('/profile/dob', protectPartner, updateDOB);      // 8
router.patch('/profile/gender', protectPartner, updateGender); // 9
router.patch('/profile/photo', protectPartner, updatePhoto);  // 10

// STEP 2: Address & Vehicle Basics (10 APIs)
router.patch('/profile/address/street', protectPartner, updateAddressStreet); // 11
router.patch('/profile/address/city', protectPartner, updateAddressCity);     // 12
router.patch('/profile/address/state', protectPartner, updateAddressState);   // 13
router.patch('/profile/address/pincode', protectPartner, updateAddressPincode); // 14

router.post('/vehicle/check-eligibility', protectPartner, checkVehicleEligibility); // 15
router.patch('/vehicle/make', protectPartner, updateVehicleMake);     // 16
router.patch('/vehicle/model', protectPartner, updateVehicleModel);   // 17
router.patch('/vehicle/year', protectPartner, updateVehicleYear);     // 18
router.patch('/vehicle/color', protectPartner, updateVehicleColor);   // 19
router.patch('/vehicle/plate-number', protectPartner, updateVehiclePlateNumber); // 20

// STEP 3: Driver KYC & Vehicle Docs (10 APIs)
router.patch('/profile/kyc/dl-front', protectPartner, updateDLFront);         // 21
router.patch('/profile/kyc/dl-back', protectPartner, updateDLBack);           // 22
router.patch('/profile/kyc/aadhaar-front', protectPartner, updateAadhaarFront); // 23
router.patch('/profile/kyc/aadhaar-back', protectPartner, updateAadhaarBack);   // 24
router.patch('/profile/kyc/pan', protectPartner, updatePAN);                    // 25
router.patch('/vehicle/docs/rc', protectPartner, updateVehicleRC);            // 26
router.patch('/vehicle/docs/insurance', protectPartner, updateVehicleInsurance); // 27
router.patch('/vehicle/docs/permit', protectPartner, updateVehiclePermit);    // 28
router.patch('/vehicle/docs/fitness', protectPartner, updateVehicleFitness);  // 29
router.patch('/vehicle/photos/front', protectPartner, updateVehiclePhotoFront); // 30

// STEP 4: Vehicle Photos, Bank & Payment (10 APIs)
router.patch('/vehicle/photos/back', protectPartner, updateVehiclePhotoBack); // 31
router.patch('/vehicle/photos/left', protectPartner, updateVehiclePhotoLeft); // 32
router.patch('/vehicle/photos/right', protectPartner, updateVehiclePhotoRight); // 33
router.patch('/profile/bank/account-name', protectPartner, updateBankAccountName); // 34
router.patch('/profile/bank/account-number', protectPartner, updateBankAccountNumber); // 35
router.patch('/profile/bank/ifsc', protectPartner, updateBankIFSC); // 36
router.patch('/profile/bank/bank-name', protectPartner, updateBankName); // 37
router.post('/onboarding/payment-initiate', protectPartner, initiateOnboardingPayment); // 38
router.post('/onboarding/payment-verify', protectPartner, verifyOnboardingPayment); // 39
router.post('/onboarding/submit-application', protectPartner, submitPartnerApplication); // 40

// STEP 5: Bookings & Active Rides (10 APIs)
router.get('/bookings/active', protectPartner, getActiveBooking); // 41
router.get('/bookings/history', protectPartner, getBookingHistory); // 42
router.get('/bookings/requests', protectPartner, getPendingRequests); // 43
router.post('/bookings/:id/accept', protectPartner, acceptRideRequest); // 44
router.post('/bookings/:id/decline', protectPartner, declineRideRequest); // 45
router.patch('/bookings/:id/arrive', protectPartner, markDriverArrived); // 46
router.patch('/bookings/:id/start', protectPartner, startTrip); // 47
router.patch('/bookings/:id/complete', protectPartner, completeTrip); // 48
router.patch('/bookings/:id/cancel', protectPartner, cancelTripByPartner); // 49
router.get('/bookings/:id/route', protectPartner, getBookingRoute); // 50

// STEP 6: Finance, Wallet & Earnings (10 APIs)
router.get('/finance/wallet/balance', protectPartner, getWalletBalance); // 51
router.get('/finance/wallet/transactions', protectPartner, getWalletTransactions); // 52
router.post('/finance/wallet/withdraw', protectPartner, requestWithdrawal); // 53
router.get('/finance/earnings/today', protectPartner, getTodayEarnings); // 54
router.get('/finance/earnings/weekly', protectPartner, getWeeklyEarnings); // 55
router.get('/finance/earnings/monthly', protectPartner, getMonthlyEarnings); // 56
router.get('/finance/settlements/history', protectPartner, getSettlementHistory); // 57
router.get('/finance/settlements/pending', protectPartner, getPendingSettlements); // 58
router.get('/finance/invoices/:tripId', protectPartner, getTripInvoice); // 59
router.get('/finance/taxes/tds-summary', protectPartner, getTdsSummary); // 60

// STEP 7: Support, SOS & App Settings (10 APIs)
router.get('/support/tickets', protectPartner, getSupportTickets); // 61
router.get('/support/tickets/:id', protectPartner, getSingleTicket); // 62
router.post('/support/tickets/create', protectPartner, createSupportTicket); // 63
router.post('/support/tickets/:id/reply', protectPartner, replyToTicket); // 64
router.post('/support/emergency/sos', protectPartner, triggerSOSAlert); // 65
router.get('/settings/preferences', protectPartner, getAppSettings); // 66
router.patch('/settings/language', protectPartner, updateLanguage); // 67
router.patch('/settings/navigation', protectPartner, updateNavigationApp); // 68
router.patch('/settings/notifications', protectPartner, updatePushPreferences); // 69
router.post('/settings/device-token', protectPartner, registerDeviceToken); // 70

// STEP 8: Performance, Referrals & Alerts (10 APIs)
router.get('/performance/ratings', protectPartner, getDriverRatings); // 71
router.get('/performance/metrics', protectPartner, getDriverMetrics); // 72
router.get('/activity/logs', protectPartner, getActivityLogs); // 73
router.put('/activity/status', protectPartner, toggleOnlineStatus); // 74
router.patch('/activity/location', protectPartner, pingLiveLocation); // 75
router.get('/referrals/code', protectPartner, getReferralCode); // 76
router.get('/referrals/history', protectPartner, getReferralHistory); // 77
router.post('/referrals/claim', protectPartner, claimReferralBonus); // 78
router.get('/notifications/all', protectPartner, getNotifications); // 79
router.patch('/notifications/:id/read', protectPartner, markNotificationRead); // 80

export default router;
