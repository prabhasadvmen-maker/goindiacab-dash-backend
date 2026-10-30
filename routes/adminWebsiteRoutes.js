import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/adminCouponController.js';
import {
  listCities, createCity, updateCity, deleteCity,
  listRoutes, createRoute, updateRoute, deleteRoute,
  listFareRules, createFareRule, updateFareRule, deleteFareRule,
  listAddons, createAddon, updateAddon, deleteAddon,
  listWebBookings, getWebBooking, updateWebBookingStatus,
  getWebsiteStats, seedWebsiteDefaults,
} from '../controllers/adminWebsiteController.js';

const router = express.Router();
router.use(protect);

// Mounted at /api/admins/website. Reads: Admin + SuperAdmin. Writes to cities/routes/fare rules: SuperAdmin only.
router.get('/stats', getWebsiteStats);
router.post('/seed-defaults', seedWebsiteDefaults);

router.route('/cities').get(listCities).post(createCity);
router.route('/cities/:id').put(updateCity).delete(deleteCity);

router.route('/routes').get(listRoutes).post(createRoute);
router.route('/routes/:id').put(updateRoute).delete(deleteRoute);

router.route('/fare-rules').get(listFareRules).post(createFareRule);
router.route('/fare-rules/:id').put(updateFareRule).delete(deleteFareRule);

router.route('/addons').get(listAddons).post(createAddon);
router.route('/addons/:id').put(updateAddon).delete(deleteAddon);

router.route('/coupons').get(listCoupons).post(createCoupon);
router.route('/coupons/:id').put(updateCoupon).delete(deleteCoupon);

router.get('/bookings', listWebBookings);
router.get('/bookings/:bookingId', getWebBooking);
router.patch('/bookings/:bookingId', updateWebBookingStatus);

export default router;
