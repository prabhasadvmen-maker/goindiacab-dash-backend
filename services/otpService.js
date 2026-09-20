import axios from 'axios';
import redis from '../config/redis.js';

const OTP_EXPIRY_SEC = 5 * 60;       // 5 minutes
const RESEND_COOLDOWN_SEC = 60;       // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

const otpKey = (phone) => `otp:${phone}`;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Send OTP ────────────────────────────────────────────────────────────────
export const sendOTP = async (phone) => {
  const otp = generateOTP();

  const data = {
    otp,
    sentAt: Date.now(),
    attempts: 0,
  };

  // Store in Redis with TTL = OTP expiry
  await redis.set(otpKey(phone), JSON.stringify(data), 'EX', OTP_EXPIRY_SEC);

  try {
    const params = new URLSearchParams({
      authkey: process.env.APITXT_API_KEY,
      mobile: phone,
      otp,
      channel: 'sms',
      country: '91',
    });

    const response = await axios.post('https://apitxt.com/api/sendOTP', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (response.data.status !== 'success') {
      await redis.del(otpKey(phone));
      throw new Error(response.data.message || 'Failed to send OTP');
    }
  } catch (err) {
    await redis.del(otpKey(phone));
    throw err;
  }

  return true;
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
export const verifyOTP = async (phone, otp) => {
  const raw = await redis.get(otpKey(phone));

  if (!raw) {
    return { success: false, message: 'OTP not found. Please request a new OTP.' };
  }

  const record = JSON.parse(raw);
  record.attempts += 1;

  if (record.attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey(phone));
    return { success: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  if (record.otp !== otp) {
    // Save updated attempts back to Redis (keep remaining TTL)
    const ttl = await redis.ttl(otpKey(phone));
    if (ttl > 0) await redis.set(otpKey(phone), JSON.stringify(record), 'EX', ttl);
    return { success: false, message: 'Invalid OTP. Please try again.' };
  }

  await redis.del(otpKey(phone));
  return { success: true, message: 'OTP verified successfully.' };
};

// ─── Resend cooldown check ────────────────────────────────────────────────────
export const canResendOTP = async (phone) => {
  const raw = await redis.get(otpKey(phone));
  if (!raw) return true;
  const record = JSON.parse(raw);
  return Date.now() - record.sentAt > RESEND_COOLDOWN_SEC * 1000;
};
