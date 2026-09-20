import express from 'express';
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  toggleAdminStatus,
  deleteAdmin,
  impersonateAdmin,
  getSuperAdminStats,
} from '../controllers/adminController.js';
import {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
} from '../controllers/adminUserController.js';
import {
  getOperationsOverview,
  getAllBookings,
  updateBookingStatus,
  getBookingById,
  assignPartnerToBooking,
  getActiveDrivers
} from '../controllers/adminOperationsController.js';
import {
  getFinanceOverview,
  getRecentTransactions,
  processPayout
} from '../controllers/adminFinanceController.js';
import {
  getAnalytics,
  getExportData
} from '../controllers/adminReportsController.js';
import {
  getSettings,
  updateSettings
} from '../controllers/adminSettingsController.js';
import {
  getProfile,
  updateProfile
} from '../controllers/adminProfileController.js';
import {
  getVehicles,
  getVehicleById,
  toggleVehicleEligibility
} from '../controllers/adminVehicleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

router.route('/')
  .get(getAdmins)
  .post(createAdmin);

router.get('/dashboard-stats', getSuperAdminStats);

// Moved generic /:id routes to the bottom of the file

// ==========================================
// USER MANAGEMENT ROUTES (Accessible by Admin/SuperAdmin)
// ==========================================
router.route('/users')
  .get(getUsers);

router.route('/users/:id')
  .get(getUserById)
  .delete(deleteUser);

router.patch('/users/:id/status', updateUserStatus);

// ==========================================
// OPERATIONS & BOOKINGS ROUTES
// ==========================================
router.get('/operations/overview', getOperationsOverview);
router.get('/operations/bookings', getAllBookings);
router.get('/operations/bookings/:id', getBookingById);
router.patch('/operations/bookings/:id/status', updateBookingStatus);
router.patch('/operations/bookings/:id/assign', assignPartnerToBooking);
router.get('/operations/active-drivers', getActiveDrivers);

// ==========================================
// FINANCE ROUTES
// ==========================================
router.get('/finance/overview', getFinanceOverview);
router.get('/finance/transactions', getRecentTransactions);
router.post('/finance/payouts/:id', processPayout);

// ==========================================
// REPORTS & ANALYTICS ROUTES
// ==========================================
router.get('/reports/analytics', getAnalytics);
router.get('/reports/export/:type', getExportData);

// ==========================================
// SETTINGS ROUTES
// ==========================================
router.route('/settings')
  .get(getSettings)
  .put(updateSettings);

// ==========================================
// PROFILE ROUTES
// ==========================================
router.route('/profile')
  .get(getProfile)
  .put(updateProfile);

// ==========================================
// VEHICLE ROUTES
// ==========================================
router.route('/vehicles')
  .get(getVehicles);

router.get('/vehicles/:id', getVehicleById);

router.patch('/vehicles/:id/eligibility', toggleVehicleEligibility);

// ==========================================
// GENERIC ID ROUTES (Must be at the bottom to prevent swallowing)
// ==========================================
router.route('/:id')
  .put(updateAdmin)
  .delete(deleteAdmin);

router.patch('/:id/status', toggleAdminStatus);
router.post('/:id/impersonate', impersonateAdmin);

export default router;
