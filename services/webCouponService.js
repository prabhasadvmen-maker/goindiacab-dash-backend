import WebCoupon from '../models/WebCoupon.js';
import WebBooking from '../models/WebBooking.js';

// A coupon can never bring the payable amount below this (Razorpay needs a positive amount).
export const MIN_PAYABLE = 100;

export const normalizeCode = (code) => String(code || '').trim().toUpperCase();

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Pure checks that need no DB. Returns { ok, message } and, when ok, the discount in whole rupees.
export const evaluateCoupon = (coupon, { total, tripType, vehicleType, now = new Date() }) => {
  if (!coupon || !coupon.isActive) return { ok: false, message: 'This coupon is not valid' };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, message: 'This coupon is not active yet' };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, message: 'This coupon has expired' };
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: 'This coupon has reached its usage limit' };
  }
  if (coupon.tripTypes?.length && !coupon.tripTypes.includes(tripType)) {
    return { ok: false, message: 'This coupon is not valid for this trip type' };
  }
  if (coupon.vehicleTypes?.length && !coupon.vehicleTypes.includes(String(vehicleType).toLowerCase())) {
    return { ok: false, message: 'This coupon is not valid for the selected cab' };
  }
  if (total < coupon.minOrderAmount) {
    return { ok: false, message: `Add ${inr(coupon.minOrderAmount - total)} more to use this coupon (min. fare ${inr(coupon.minOrderAmount)})` };
  }

  let discount = coupon.discountType === 'percent'
    ? Math.round((total * coupon.discountValue) / 100)
    : coupon.discountValue;
  if (coupon.discountType === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, total - MIN_PAYABLE));
  if (discount <= 0) return { ok: false, message: 'This coupon gives no discount on this booking' };
  return { ok: true, discount };
};

// Paid redemptions of this coupon by one customer.
export const mobileUsage = (code, mobile) =>
  WebBooking.countDocuments({ 'fare.couponCode': code, 'passenger.mobile': mobile, 'payment.status': 'paid' });

// Full check including the per-mobile limit. `mobile` may be empty (limit is then enforced at booking time).
export const applyCoupon = async (rawCode, ctx) => {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, message: 'Enter a coupon code' };
  const coupon = await WebCoupon.findOne({ code });
  if (!coupon) return { ok: false, message: 'Invalid coupon code' };

  const result = evaluateCoupon(coupon, ctx);
  if (!result.ok) return result;

  if (ctx.mobile && coupon.perMobileLimit > 0 && (await mobileUsage(code, ctx.mobile)) >= coupon.perMobileLimit) {
    return { ok: false, message: 'You have already used this coupon' };
  }
  return { ok: true, discount: result.discount, coupon };
};

// Coupons to list at checkout, each with eligibility for the current cart.
export const listPublicCoupons = async (ctx) => {
  const now = new Date();
  const coupons = await WebCoupon.find({
    isActive: true,
    showOnWebsite: true,
    $and: [
      { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    ],
  }).sort({ discountValue: -1, createdAt: -1 }).limit(10);

  return coupons.map((c) => {
    const r = evaluateCoupon(c, ctx);
    return {
      code: c.code,
      title: c.title,
      description: c.description,
      eligible: r.ok,
      discount: r.ok ? r.discount : 0,
      reason: r.ok ? '' : r.message,
    };
  });
};
