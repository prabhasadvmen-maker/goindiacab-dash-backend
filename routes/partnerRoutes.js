import express from 'express';
import {
  adminReviewDecision,
  adminGetApplications,
  adminGetSingleApplication,
} from '../controllers/partnerController.js';
import {
  getPartnerBookings,
  getPartnerBookingById,
  updateBookingStatus,
  getDashboardStats,
} from '../controllers/partnerOperationsController.js';
import { protectPartner } from '../middleware/partnerAuthMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Protected: Partner Bookings (full list & detail — not in v2) ──────────────
router.get('/bookings', protectPartner, getPartnerBookings);
router.get('/bookings/:id', protectPartner, getPartnerBookingById);
router.put('/bookings/:id/status', protectPartner, updateBookingStatus);

// ── Protected: Dashboard Stats ────────────────────────────────────────────────
router.get('/dashboard-stats', protectPartner, getDashboardStats);

// ── Admin: Partner Application Management ─────────────────────────────────────
router.get('/admin/applications', protect, adminGetApplications);
router.get('/admin/applications/:partnerId', protect, adminGetSingleApplication);
router.put('/admin/review/:partnerId', protect, adminReviewDecision);

export default router;
