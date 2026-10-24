import WebCoupon from '../models/WebCoupon.js';
import WebBooking from '../models/WebBooking.js';
import { normalizeCode } from '../services/webCouponService.js';

const isSuper = (req) => req.superadmin?.role === 'SuperAdmin';
const forbid = (res) => res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      const first = err.errors ? Object.values(err.errors)[0]?.message : err.message;
      return res.status(400).json({ success: false, message: first || err.message });
    }
    console.error('adminCoupon error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const COUPON_FIELDS = [
  'code', 'title', 'description', 'discountType', 'discountValue', 'maxDiscount', 'minOrderAmount',
  'tripTypes', 'vehicleTypes', 'startsAt', 'expiresAt', 'usageLimit', 'perMobileLimit', 'showOnWebsite', 'isActive',
];

const cleanBody = (body) => {
  const out = Object.fromEntries(COUPON_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
  if (out.code !== undefined) out.code = normalizeCode(out.code);
  // Empty date inputs arrive as "" - store as "no limit".
  ['startsAt', 'expiresAt'].forEach((f) => { if (out[f] === '') out[f] = null; });
  return out;
};

// GET /coupons?search=&status=active|inactive|expired
export const listCoupons = handle(async (req, res) => {
  const { search, status } = req.query;
  const now = new Date();
  const filter = {};
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ code: rx }, { title: rx }];
  }
  if (status === 'inactive') filter.isActive = false;
  if (status === 'active') Object.assign(filter, { isActive: true, $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }] });
  if (status === 'expired') filter.expiresAt = { $lte: now };

  const [data, total, active, redeemed] = await Promise.all([
    WebCoupon.find(filter).sort({ createdAt: -1 }).limit(200),
    WebCoupon.countDocuments(),
    WebCoupon.countDocuments({ isActive: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }),
    WebBooking.aggregate([
      { $match: { 'fare.couponCode': { $nin: [null, ''] }, 'payment.status': 'paid' } },
      { $group: { _id: null, count: { $sum: 1 }, discount: { $sum: '$fare.discount' } } },
    ]),
  ]);

  res.json({
    success: true,
    data,
    stats: { total, active, redemptions: redeemed[0]?.count || 0, discountGiven: redeemed[0]?.discount || 0 },
  });
});

export const createCoupon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebCoupon.create(cleanBody(req.body));
  res.status(201).json({ success: true, data });
});

export const updateCoupon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const coupon = await WebCoupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  const body = cleanBody(req.body);
  delete body.code; // the code is the customer-facing identity; it cannot change after creation
  coupon.set(body);
  await coupon.save(); // runs validators + the cross-field checks
  res.json({ success: true, data: coupon });
});

export const deleteCoupon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const coupon = await WebCoupon.findById(req.params.id);
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
  const used = await WebBooking.exists({ 'fare.couponCode': coupon.code });
  if (used) {
    return res.status(409).json({ success: false, message: 'This coupon has bookings. Deactivate it instead of deleting.' });
  }
  await coupon.deleteOne();
  res.json({ success: true, message: 'Coupon deleted' });
});
