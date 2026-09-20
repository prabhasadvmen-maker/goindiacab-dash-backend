import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendOTP, verifyOTP, canResendOTP } from '../services/otpService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signAccessToken = (id, phone) =>
  jwt.sign({ id, phone, role: 'user' }, process.env.JWT_SECRET, {
    expiresIn: process.env.USER_ACCESS_TOKEN_EXPIRES_IN || '24h',
  });

const signRefreshToken = (id, phone) =>
  jwt.sign({ id, phone, role: 'user', type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.USER_REFRESH_TOKEN_EXPIRES_IN || '30d',
  });

const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  isPhoneVerified: user.isPhoneVerified,
  profilePhoto: user.profilePhoto,
  status: user.status,
  referralCode: user.referralCode,
  createdAt: user.createdAt,
});

// Generate unique referral code
const generateReferralCode = (phone) =>
  'GIC' + phone.slice(-4) + Math.random().toString(36).substring(2, 5).toUpperCase();

// ────────────────────────────────────────────────────────────────────────────
// REGISTER
// POST /api/v1/user/auth/register
// Body: { name, phone, email?, password, referralCode? }
// ────────────────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, phone, email, password, referralCode } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Name, phone, and password are required.' });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered. Please login.' });
    }

    if (email) {
      const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) {
        return res.status(409).json({ success: false, message: 'This email is already registered.' });
      }
    }

    // Validate referral code if provided
    let referredBy = '';
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) referredBy = referralCode.toUpperCase();
    }

    const user = await User.create({
      name: name.trim(),
      phone,
      email: email ? email.toLowerCase().trim() : null,
      password,
      referralCode: generateReferralCode(phone),
      referredBy,
    });

    const accessToken = signAccessToken(user._id, user.phone);
    const refreshToken = signRefreshToken(user._id, user.phone);

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      accessToken,
      refreshToken,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('register error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// LOGIN — Mobile/Email + Password
// POST /api/v1/user/auth/login
// Body: { identifier, password }
// ────────────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Phone/Email and password are required.' });
    }

    const isPhone = /^\d{10}$/.test(identifier);
    const user = await User.findOne(
      isPhone ? { phone: identifier } : { email: identifier.toLowerCase().trim() }
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your phone/email and password.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
    }
    if (!user.password) {
      return res.status(400).json({ success: false, message: 'This account uses OTP login. Please use OTP to sign in.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your phone/email and password.' });
    }

    const accessToken = signAccessToken(user._id, user.phone);
    const refreshToken = signRefreshToken(user._id, user.phone);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// SEND OTP
// POST /api/v1/user/auth/send-otp
// Body: { phone }
// ────────────────────────────────────────────────────────────────────────────
export const sendUserOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number.' });
    }
    if (!await canResendOTP(phone)) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP.' });
    }

    await sendOTP(phone);

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('sendUserOTP error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// RESEND OTP
// POST /api/v1/user/auth/resend-otp
// Body: { phone }
// ────────────────────────────────────────────────────────────────────────────
export const resendUserOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit phone number.' });
    }
    if (!await canResendOTP(phone)) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 60 seconds before requesting a new OTP.',
        retryAfter: 60,
      });
    }

    await sendOTP(phone);

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully.',
      expiresIn: 300,
    });
  } catch (error) {
    console.error('resendUserOTP error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to resend OTP.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// VERIFY OTP — with auto-registration, name, referralCode support
// POST /api/v1/user/auth/verify-otp
// Body: { phone, otp, name? (for new users), referralCode? }
// ────────────────────────────────────────────────────────────────────────────
export const verifyUserOTP = async (req, res) => {
  try {
    const { phone, otp, name, referralCode } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }

    const result = await verifyOTP(phone, otp);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    let user = await User.findOne({ phone });
    const isNewUser = !user;

    if (isNewUser) {
      // Validate referral if provided
      let referredBy = '';
      if (referralCode) {
        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (referrer) referredBy = referralCode.toUpperCase();
      }

      user = await User.create({
        phone,
        name: name ? name.trim() : '',
        isPhoneVerified: true,
        referralCode: generateReferralCode(phone),
        referredBy,
      });
    } else {
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
      }
      user.isPhoneVerified = true;
      user.lastLoginAt = new Date();
      // Update name if provided and not already set
      if (name && !user.name) user.name = name.trim();
    }

    const accessToken = signAccessToken(user._id, user.phone);
    const refreshToken = signRefreshToken(user._id, user.phone);

    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: isNewUser ? 'Account created and verified successfully.' : 'OTP verified. Login successful.',
      accessToken,
      refreshToken,
      isNewUser,
      // Mobile app: if isNewUser && !user.name → show Profile screen, else → Home screen
      nextScreen: isNewUser && !user.name ? 'profile_setup' : 'home',
      user: safeUser(user),
    });
  } catch (error) {
    console.error('verifyUserOTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// REFRESH TOKEN — issue new access token using refresh token
// POST /api/v1/user/auth/refresh-token
// Body: { refreshToken }
// ────────────────────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token. Please login again.' });
    }

    if (decoded.type !== 'refresh' || decoded.role !== 'user') {
      return res.status(401).json({ success: false, message: 'Invalid token type.' });
    }

    // Find user and validate stored refresh token
    const user = await User.findById(decoded.id).select('-password -invalidatedTokens');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ success: false, message: 'Your account has been blocked.' });
    }
    if (user.refreshToken !== token) {
      // Refresh token reuse detected — invalidate all sessions
      user.refreshToken = '';
      await user.save();
      return res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please login again.' });
    }

    // Issue new access token + rotate refresh token
    const newAccessToken = signAccessToken(user._id, user.phone);
    const newRefreshToken = signRefreshToken(user._id, user.phone);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('refreshToken error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during token refresh.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// LOGOUT
// POST /api/v1/user/auth/logout
// ────────────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = '';
      user.invalidatedTokens.push(req.token);
      if (user.invalidatedTokens.length > 10) {
        user.invalidatedTokens = user.invalidatedTokens.slice(-10);
      }
      await user.save();
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('logout error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during logout.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// POST /api/v1/user/auth/forgot-password
// Body: { identifier }
// ────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required.' });
    }

    const isPhone = /^\d{10}$/.test(identifier);
    const user = await User.findOne(
      isPhone ? { phone: identifier } : { email: identifier.toLowerCase().trim() }
    );

    if (!user) {
      return res.status(200).json({ success: true, message: 'If this account exists, an OTP has been sent.' });
    }
    if (!await canResendOTP(user.phone)) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP.' });
    }

    await sendOTP(user.phone);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your registered mobile number.',
      phone: user.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2'),
    });
  } catch (error) {
    console.error('forgotPassword error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// POST /api/v1/user/auth/reset-password
// Body: { phone, otp, newPassword }
// ────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Phone, OTP, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const result = await verifyOTP(phone, otp);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    user.refreshToken = '';
    user.invalidatedTokens = [];
    await user.save();

    return res.status(200).json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (error) {
    console.error('resetPassword error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET PROFILE
// GET /api/v1/user/auth/me
// ────────────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    return res.status(200).json({ success: true, user: safeUser(req.user) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
