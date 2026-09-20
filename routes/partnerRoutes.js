import express from 'express';
import {
  sendPartnerOTP,
  verifyPartnerOTP,
  vehicleCheck,
  savePersonalDetails,
  saveAddress,
  saveDrivingLicence,
  saveAadhaar,
  savePAN,
  saveBankAccount,
  saveVehicleDetails,
  saveVehicleDocuments,
  saveVehiclePhotos,
  getApplicationReview,
  recordPayment,
  submitApplication,
  getPartnerProfile,
  adminReviewDecision,
  adminGetApplications,
  adminGetSingleApplication,
} from '../controllers/partnerController.js';
import {
  getPartnerBookings,
  getPartnerBookingById,
  updateBookingStatus,
  getPartnerEarnings,
  getPartnerNotifications,
  markNotificationsRead,
  getDashboardStats,
  acceptBooking
} from '../controllers/partnerOperationsController.js';
import { protectPartner } from '../middleware/partnerAuthMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Public: OTP Auth ─────────────────────────────────────────────────────────
router.post('/auth/send-otp', sendPartnerOTP);
router.post('/auth/verify-otp', verifyPartnerOTP);

// ── Protected: Onboarding Steps (partner must be logged in) ──────────────────
router.post('/onboarding/vehicle-check', protectPartner, vehicleCheck);
router.put('/onboarding/personal-details', protectPartner, savePersonalDetails);
router.put('/onboarding/address', protectPartner, saveAddress);
router.put('/onboarding/driving-licence', protectPartner, saveDrivingLicence);
router.put('/onboarding/aadhaar', protectPartner, saveAadhaar);
router.put('/onboarding/pan', protectPartner, savePAN);
router.put('/onboarding/bank-account', protectPartner, saveBankAccount);
router.put('/onboarding/vehicle-details', protectPartner, saveVehicleDetails);
router.put('/onboarding/vehicle-documents', protectPartner, saveVehicleDocuments);
router.put('/onboarding/vehicle-photos', protectPartner, saveVehiclePhotos);
router.get('/onboarding/review', protectPartner, getApplicationReview);
router.post('/onboarding/payment', protectPartner, recordPayment);
router.post('/onboarding/submit', protectPartner, submitApplication);

// ── Protected: Partner Profile ───────────────────────────────────────────────
router.get('/profile', protectPartner, getPartnerProfile);

// ── Protected: Partner Bookings ──────────────────────────────────────────────
router.get('/bookings', protectPartner, getPartnerBookings);
router.get('/bookings/:id', protectPartner, getPartnerBookingById);
router.post('/bookings/:id/accept', protectPartner, acceptBooking);
router.put('/bookings/:id/status', protectPartner, updateBookingStatus);

// ── Protected: Earnings & Notifications & Stats ──────────────────────────────────────
router.get('/dashboard-stats', protectPartner, getDashboardStats);
router.get('/earnings', protectPartner, getPartnerEarnings);
router.get('/notifications', protectPartner, getPartnerNotifications);
router.put('/notifications/read', protectPartner, markNotificationsRead);

// ── Admin: Partner Application Management (SuperAdmin/Admin protected) ────────
router.get('/admin/applications', protect, adminGetApplications);
router.get('/admin/applications/:partnerId', protect, adminGetSingleApplication);
router.put('/admin/review/:partnerId', protect, adminReviewDecision);

export default router;
