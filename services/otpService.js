import axios from './httpClient.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;      // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;      // 60 seconds
const MAX_VERIFY_ATTEMPTS = 5;

// In-memory store: { phone -> { otp, attempts, expiresAt, cooldownUntil } }
const store = new Map();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt < now && v.cooldownUntil < now) store.delete(k);
  }
}, 10 * 60 * 1000);

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─── Send OTP ─────────────────────────────────────────────────────────────────
export const sendOTP = async (phone) => {
  const now = Date.now();
  const entry = store.get(phone);

  if (entry?.cooldownUntil > now) {
    const secs = Math.ceil((entry.cooldownUntil - now) / 1000);
    throw new Error(`Please wait ${secs} seconds before requesting a new OTP.`);
  }

  const otp = generateOTP();
  const num = phone.startsWith('91') ? phone : `91${phone}`;

  const waRes = await axios.post(
    `https://graph.facebook.com/v26.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: num,
      type: 'template',
      template: {
        name: process.env.WHATSAPP_OTP_TEMPLATE_NAME,
        language: { code: 'en' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: otp }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
        ],
      },
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 10000 }
  );

  if (!waRes.data?.messages?.[0]?.id) throw new Error('WhatsApp OTP delivery failed.');

  store.set(phone, {
    otp,
    attempts: 0,
    expiresAt: now + OTP_EXPIRY_MS,
    cooldownUntil: now + RESEND_COOLDOWN_MS,
  });

  return true;
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export const verifyOTP = async (phone, otp) => {
  const now = Date.now();
  const entry = store.get(phone);

  if (!entry || entry.expiresAt < now) {
    store.delete(phone);
    return { success: false, message: 'OTP expired or not found. Please request a new OTP.' };
  }

  entry.attempts += 1;

  if (entry.attempts > MAX_VERIFY_ATTEMPTS) {
    store.delete(phone);
    return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }

  if (entry.otp !== otp) {
    const remaining = MAX_VERIFY_ATTEMPTS - entry.attempts;
    return { success: false, message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` };
  }

  store.delete(phone);
  return { success: true, message: 'OTP verified successfully.' };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const canResendOTP = async (phone) => {
  const entry = store.get(phone);
  return !entry || entry.cooldownUntil <= Date.now();
};

export const getCooldownTTL = async (phone) => {
  const entry = store.get(phone);
  if (!entry || entry.cooldownUntil <= Date.now()) return 0;
  return Math.ceil((entry.cooldownUntil - Date.now()) / 1000);
};
