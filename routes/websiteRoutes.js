import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  suggestLocations, suggestDestinations, reverseLocation, getDistance, listVehicleTypes, getWebConfig, validateCouponApi, listCouponsApi, calculateFareApi,
  createBooking, getBooking, createPaymentOrder, verifyPayment, notifyBookingConfirmed,
} from '../controllers/websiteController.js';

import { publicCache } from '../services/ttlCache.js';

const router = express.Router();

const limiter = (max) =>
  rateLimit({
    windowMs: 60 * 1000, max, standardHeaders: true, legacyHeaders: false,
    message: { success: false, error: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });

// Public website APIs (no login). Mounted at /api
// GETs below are cacheable by browsers/CDN (Cache-Control) on top of the server-side caches in the controller.
router.get('/locations/suggest', limiter(120), publicCache(300), suggestLocations);
router.get('/locations/suggest-destination', limiter(120), publicCache(300), suggestDestinations);
router.get('/locations/reverse', limiter(20), reverseLocation);
router.get('/distance', limiter(60), publicCache(300), getDistance);
router.get('/fare/vehicles', limiter(60), publicCache(30, 0), listVehicleTypes);
router.get('/web-config', limiter(60), publicCache(30, 0), getWebConfig);
router.get('/coupons/available', limiter(60), listCouponsApi);
router.post('/coupons/validate', limiter(30), validateCouponApi);
router.post('/fare/calculate', limiter(120), calculateFareApi);
router.post('/booking/create', limiter(10), createBooking);
router.get('/booking/:bookingId', limiter(60), getBooking);
router.post('/payment/create-order', limiter(10), createPaymentOrder);
router.post('/payment/verify', limiter(20), verifyPayment);
router.post('/notify/booking-confirmed', limiter(10), notifyBookingConfirmed);

export default router;
