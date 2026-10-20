import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  suggestLocations, getDistance, listVehicleTypes, calculateFareApi,
  createBooking, getBooking, createPaymentOrder, verifyPayment, notifyBookingConfirmed,
} from '../controllers/websiteController.js';

const router = express.Router();

const limiter = (max) =>
  rateLimit({
    windowMs: 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });

// Public website APIs (no login). Mounted at /api
router.get('/locations/suggest', limiter(120), suggestLocations);
router.get('/distance', limiter(60), getDistance);
router.get('/fare/vehicles', limiter(60), listVehicleTypes);
router.post('/fare/calculate', limiter(120), calculateFareApi);
router.post('/booking/create', limiter(10), createBooking);
router.get('/booking/:bookingId', limiter(60), getBooking);
router.post('/payment/create-order', limiter(10), createPaymentOrder);
router.post('/payment/verify', limiter(20), verifyPayment);
router.post('/notify/booking-confirmed', limiter(10), notifyBookingConfirmed);

export default router;
