import axios from 'axios';
import redis from '../config/redis.js';

const OTP_EXPIRY_SEC = 5 * 60;        // 5 minutes — OTP valid window
const RESEND_COOLDOWN_SEC = 60;        // 60 seconds — min gap between sends
const MAX_VERIFY_ATTEMPTS = 5;         // max wrong attempts before OTP invalidated

const otpKey      = (phone) => `otp:${phone}`;
const cooldownKey = (phone) => `otp_cd:${phone}`;  // separate key, survives OTP deletion

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Send OTP ────────────────────────────────────────────────────────────────
// Flow: check cooldown → send SMS → on success save OTP + refresh cooldown
// Cooldown is set AFTER confirmed SMS delivery — not before.
// This prevents: cooldown blocking user when SMS never actually went out.
export const sendOTP = async (phone) => {
  // 1. Block if within cooldown window
  const onCooldown = await redis.get(cooldownKey(phone));
  if (onCooldown) {
    const ttl = await redis.ttl(cooldownKey(phone));
    throw new Error(`Please wait ${ttl} seconds before requesting a new OTP.`);
  }

  const otp = generateOTP();

  // 2. Send SMS first — only proceed if delivery confirmed
  const params = new URLSearchParams({
    authkey: process.env.APITXT_API_KEY,
    mobile: phone,
    otp,
    channel: 'sms',
    country: '91',
  });

  const response = await axios.post('https://apitxt.com/api/sendOTP', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000, // 10s timeout — don't hang forever
  });

  if (response.data.status !== 'success') {
    throw new Error(response.data.message || 'SMS provider failed to send OTP.');
  }

  // 3. SMS confirmed — now atomically save OTP + cooldown in Redis pipeline
  const data = JSON.stringify({ otp, attempts: 0 });
  const pipeline = redis.pipeline();
  pipeline.set(otpKey(phone), data, 'EX', OTP_EXPIRY_SEC);
  pipeline.set(cooldownKey(phone), '1', 'EX', RESEND_COOLDOWN_SEC);
  await pipeline.exec();

  return true;
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// Uses Redis atomic WATCH/transaction pattern via Lua script to prevent
// race condition on attempts counter (two simultaneous wrong guesses).
export const verifyOTP = async (phone, otp) => {
  const key = otpKey(phone);
  const raw = await redis.get(key);

  if (!raw) {
    return { success: false, message: 'OTP expired or not found. Please request a new OTP.' };
  }

  const record = JSON.parse(raw);

  // Increment attempts atomically using Lua script
  const luaScript = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return nil end
    local rec = cjson.decode(raw)
    rec['attempts'] = rec['attempts'] + 1
    local ttl = redis.call('TTL', KEYS[1])
    if ttl > 0 then
      redis.call('SET', KEYS[1], cjson.encode(rec), 'EX', ttl)
    end
    return cjson.encode(rec)
  `;

  const updated = await redis.eval(luaScript, 1, key);

  if (!updated) {
    return { success: false, message: 'OTP expired. Please request a new OTP.' };
  }

  const updatedRecord = JSON.parse(updated);

  if (updatedRecord.attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(key);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (updatedRecord.otp !== otp) {
    const remaining = MAX_VERIFY_ATTEMPTS - updatedRecord.attempts;
    return {
      success: false,
      message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }

  // Correct OTP — delete it immediately (one-time use)
  await redis.del(key);
  return { success: true, message: 'OTP verified successfully.' };
};

// ─── Cooldown check (for controllers that need to check before calling sendOTP) ──
export const canResendOTP = async (phone) => {
  const onCooldown = await redis.get(cooldownKey(phone));
  return !onCooldown;
};

// ─── Remaining cooldown seconds (for frontend countdown timer) ────────────────
export const getCooldownTTL = async (phone) => {
  const ttl = await redis.ttl(cooldownKey(phone));
  return ttl > 0 ? ttl : 0;
};
