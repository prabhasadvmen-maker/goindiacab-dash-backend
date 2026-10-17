import express from 'express';
import {
  register,
  login,
  sendUserOTP,
  resendUserOTP,
  verifyUserOTP,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from '../controllers/userAuthController.js';
import { protectUser } from '../middleware/userAuthMiddleware.js';

const router = express.Router();

// ── Public Routes ─────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendUserOTP);
router.post('/resend-otp', resendUserOTP);
router.post('/verify-otp', verifyUserOTP);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ── Protected Routes ──────────────────────────────────────────────────────────
router.post('/logout', protectUser, logout);
router.get('/me', protectUser, getMe);

export default router;
