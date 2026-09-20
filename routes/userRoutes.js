import express from 'express';
import { protectUser } from '../middleware/userAuthMiddleware.js';
import {
  estimateFare,
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getUserNotifications,
  markNotificationsRead,
  updateProfile
} from '../controllers/userOperationsController.js';

const router = express.Router();

// All routes are protected and require a valid user token
router.use(protectUser);

// ── Booking & Ride Estimation ──────────────────────────────────────────
router.post('/estimate-fare', estimateFare);
router.post('/bookings', createBooking);
router.get('/bookings', getMyBookings);
router.get('/bookings/:id', getBookingById);
router.post('/bookings/:id/cancel', cancelBooking);

// ── Notifications ──────────────────────────────────────────────────────
router.get('/notifications', getUserNotifications);
router.put('/notifications/read', markNotificationsRead);

// ── Profile ────────────────────────────────────────────────────────────
router.put('/profile', updateProfile);

export default router;
