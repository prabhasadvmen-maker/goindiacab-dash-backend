import WebCity from '../models/WebCity.js';
import WebRoute from '../models/WebRoute.js';
import WebFareRule from '../models/WebFareRule.js';
import WebBooking from '../models/WebBooking.js';
import WebAddon from '../models/WebAddon.js';
import Setting from '../models/Setting.js';
import { invalidatePublicCaches } from '../services/webCache.js';
import { getTripTypeMeta } from '../services/webMeta.js';
import { TRIP_TYPES } from '../services/webFareService.js';
import { uploadBase64ToR2, getPresignedUrl } from '../services/r2Service.js';
import { sendStatusUpdate } from '../services/webNotifyService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const key = (s) => String(s || '').trim().toLowerCase();
const isSuper = (req) => req.superadmin?.role === 'SuperAdmin';
const forbid = (res) => res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });

const handle = (fn) => async (req, res) => {
  try {
    await fn(req, res);
    if (req.method !== 'GET') invalidatePublicCaches();
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Already exists' });
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('adminWebsite error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const pick = (obj, fields) =>
  Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

// ───────── Cities ─────────
const CITY_FIELDS = ['name', 'state', 'lat', 'lng', 'isPopular', 'isActive', 'hourlyRental', 'hourlyOrder'];

const cleanCity = (body) => {
  const out = pick(body, CITY_FIELDS);
  if (out.name !== undefined) out.name = String(out.name).trim();
  if (out.state !== undefined) out.state = String(out.state).trim();
  if (out.hourlyOrder !== undefined) out.hourlyOrder = Math.max(0, Math.floor(Number(out.hourlyOrder) || 0));
  return out;
};

export const listCities = handle(async (req, res) => {
  const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit)) || 25));
  const { search, filter } = req.query;
  const query = {};
  if (search) query.name = new RegExp(escapeRegex(String(search)), 'i');
  if (filter === 'hourly') query.hourlyRental = true;
  if (filter === 'popular') query.isPopular = true;
  if (filter === 'inactive') query.isActive = false;

  const [total, data, all, active, popular, hourly] = await Promise.all([
    WebCity.countDocuments(query),
    WebCity.find(query).sort(filter === 'hourly' ? { hourlyOrder: 1, name: 1 } : { name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    WebCity.countDocuments(),
    WebCity.countDocuments({ isActive: true }),
    WebCity.countDocuments({ isPopular: true }),
    WebCity.countDocuments({ hourlyRental: true }),
  ]);
  res.json({ success: true, data, total, page, pages: Math.ceil(total / limit) || 1, counts: { total: all, active, popular, hourly } });
});

export const createCity = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const body = cleanCity(req.body);
  if (!body.name) return res.status(400).json({ success: false, message: 'City name is required' });
  const data = await WebCity.create(body);
  res.status(201).json({ success: true, data });
});

export const updateCity = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const body = cleanCity(req.body);
  if (body.name === '') return res.status(400).json({ success: false, message: 'City name is required' });
  const data = await WebCity.findByIdAndUpdate(req.params.id, body, { returnDocument: 'after', runValidators: true });
  if (!data) return res.status(404).json({ success: false, message: 'City not found' });
  res.json({ success: true, data });
});

export const deleteCity = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebCity.findByIdAndDelete(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'City not found' });
  res.json({ success: true, message: 'City deleted' });
});

// ───────── Routes (distances) ─────────
export const listRoutes = handle(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = search
    ? { $or: [{ from: new RegExp(escapeRegex(String(search)), 'i') }, { to: new RegExp(escapeRegex(String(search)), 'i') }] }
    : {};
  const total = await WebRoute.countDocuments(filter);
  const data = await WebRoute.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) || 1 });
});

export const createRoute = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const { from, to, distanceKm, durationMins, isActive } = req.body;
  if (!from || !to || key(from) === key(to)) {
    return res.status(400).json({ success: false, message: 'Valid, different from/to cities are required' });
  }
  const reverse = await WebRoute.findOne({ fromKey: key(to), toKey: key(from) });
  if (reverse) return res.status(409).json({ success: false, message: 'Reverse route already exists (routes work both ways)' });
  const data = await WebRoute.create({
    from: from.trim(), to: to.trim(), fromKey: key(from), toKey: key(to),
    distanceKm, durationMins, isActive, source: 'admin',
  });
  res.status(201).json({ success: true, data });
});

export const updateRoute = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const update = pick(req.body, ['distanceKm', 'durationMins', 'isActive']);
  update.source = 'admin'; // editing an auto-cached route makes it an admin-owned value
  const data = await WebRoute.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
  if (!data) return res.status(404).json({ success: false, message: 'Route not found' });
  res.json({ success: true, data });
});

export const deleteRoute = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebRoute.findByIdAndDelete(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'Route not found' });
  res.json({ success: true, message: 'Route deleted' });
});

// ───────── Fare rules ─────────
const FARE_FIELDS = [
  'vehicleType', 'name', 'model', 'seats', 'fuelType', 'bags', 'rating', 'imageUrl', 'perKmOneway', 'perKmRound', 'perKmRoundExtra', 'minKmOneway',
  'minKmPerDay', 'driverAllowance', 'driverAllowancePerDay', 'airport', 'gstPercent', 'packages', 'sortOrder', 'isActive',
];

export const listFareRules = handle(async (req, res) => {
  const rules = await WebFareRule.find().sort({ sortOrder: 1, perKmOneway: 1 }).lean();
  const data = await Promise.all(rules.map(async (r) => ({ ...r, imageUrl: await getPresignedUrl(r.imageUrl) })));
  res.json({ success: true, data });
});

// Uploaded vehicle images arrive as base64 data URLs; store them on R2 and keep only the URL.
const withUploadedImage = async (body) => {
  const fields = pick(body, FARE_FIELDS);
  if (fields.imageUrl && fields.imageUrl.startsWith('data:image')) {
    fields.imageUrl = await uploadBase64ToR2(fields.imageUrl, 'vehicle-type');
  } else if (fields.imageUrl && fields.imageUrl.includes('X-Amz-Signature')) {
    // The dashboard sends back the presigned URL it was given; store the permanent object URL instead.
    const bucket = process.env.R2_BUCKET || 'advmenngo';
    const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-advmenngo.r2.dev';
    const path = decodeURIComponent(new URL(fields.imageUrl).pathname.slice(1));
    fields.imageUrl = `${publicUrl}/${path.startsWith(`${bucket}/`) ? path.slice(bucket.length + 1) : path}`;
  }
  return fields;
};

export const createFareRule = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebFareRule.create(await withUploadedImage(req.body));
  res.status(201).json({ success: true, data });
});

export const updateFareRule = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebFareRule.findByIdAndUpdate(req.params.id, await withUploadedImage(req.body), { returnDocument: 'after', runValidators: true });
  if (!data) return res.status(404).json({ success: false, message: 'Fare rule not found' });
  res.json({ success: true, data });
});

export const deleteFareRule = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebFareRule.findByIdAndDelete(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'Fare rule not found' });
  res.json({ success: true, message: 'Fare rule deleted' });
});

// ───────── Inclusions / exclusions (policies) ─────────
const POLICY_KINDS = ['included', 'excluded'];

const toPolicy = (p) => ({ kind: p.kind, text: p.text || p.title || '', tripTypes: p.tripTypes || [] });

export const getPolicies = handle(async (req, res) => {
  const setting = await Setting.findOne().lean();
  res.json({ success: true, data: (setting?.webPolicies || []).map(toPolicy) });
});

// Replaces the whole list; the order given is the order customers see.
export const savePolicies = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const input = req.body?.policies;
  if (!Array.isArray(input) || input.length > 60) {
    return res.status(400).json({ success: false, message: 'policies must be a list of at most 60 items' });
  }
  const clean = [];
  for (const [i, p] of input.entries()) {
    const text = String(p?.text || '').trim();
    if (!text || text.length > 200) return res.status(400).json({ success: false, message: `Item ${i + 1}: text is required (max 200 characters)` });
    if (!POLICY_KINDS.includes(p?.kind)) return res.status(400).json({ success: false, message: `Item ${i + 1}: kind must be included or excluded` });
    const tripTypes = [...new Set(Array.isArray(p?.tripTypes) ? p.tripTypes : [])];
    if (tripTypes.some((t) => !TRIP_TYPES.includes(t))) return res.status(400).json({ success: false, message: `Item ${i + 1}: unknown trip type` });
    clean.push({ kind: p.kind, title: text.slice(0, 80), text, tripTypes });
  }
  await Setting.findOneAndUpdate({}, { $set: { webPolicies: clean } }, { upsert: true, setDefaultsOnInsert: true });
  res.json({ success: true, data: clean.map(toPolicy) });
});

// ───────── Payment & cancellation settings (what customers see at checkout) ─────────
const toPaymentSettings = (s) => ({
  partPaymentPercent: s?.webPartPaymentPercent ?? 15,
  freeCancelMinutes: s?.webFreeCancelMinutes ?? 60,
  cashToDriverEnabled: s?.webCashToDriverEnabled !== false,
  cashMaxOpenBookings: s?.webCashMaxOpenBookings ?? 3,
});

export const getPaymentSettings = handle(async (req, res) => {
  res.json({ success: true, data: toPaymentSettings(await Setting.findOne().lean()) });
});

const intInRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

export const savePaymentSettings = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const { partPaymentPercent, freeCancelMinutes, cashToDriverEnabled, cashMaxOpenBookings } = req.body || {};
  const problems = [];
  if (!intInRange(partPaymentPercent, 1, 100)) problems.push('Part payment must be a whole number from 1 to 100');
  if (!intInRange(freeCancelMinutes, 0, 10080)) problems.push('Free cancellation window must be 0 to 10080 minutes (7 days)');
  if (typeof cashToDriverEnabled !== 'boolean') problems.push('Pay to driver must be on or off');
  if (!intInRange(cashMaxOpenBookings, 1, 20)) problems.push('Open pay-to-driver bookings per mobile must be 1 to 20');
  if (problems.length) return res.status(400).json({ success: false, message: problems.join('. ') });

  const saved = await Setting.findOneAndUpdate(
    {},
    { $set: { webPartPaymentPercent: partPaymentPercent, webFreeCancelMinutes: freeCancelMinutes, webCashToDriverEnabled: cashToDriverEnabled, webCashMaxOpenBookings: cashMaxOpenBookings } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
  res.json({ success: true, data: toPaymentSettings(saved) });
});

// Names of the trip types, so admin screens do not hard-code them.
export const getWebMeta = handle(async (req, res) => {
  res.json({ success: true, data: { tripTypes: getTripTypeMeta() } });
});

// ───────── Journey add-ons (checkout extras) ─────────
const ADDON_FIELDS = ['code', 'title', 'price', 'unit', 'badge', 'tripTypes', 'sortOrder', 'isActive'];

export const listAddons = handle(async (req, res) => {
  const data = await WebAddon.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
  res.json({ success: true, data });
});

export const createAddon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebAddon.create(pick(req.body, ADDON_FIELDS));
  res.status(201).json({ success: true, data });
});

export const updateAddon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebAddon.findByIdAndUpdate(req.params.id, pick(req.body, ADDON_FIELDS), { returnDocument: 'after', runValidators: true });
  if (!data) return res.status(404).json({ success: false, message: 'Add-on not found' });
  res.json({ success: true, data });
});

export const deleteAddon = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  const data = await WebAddon.findByIdAndDelete(req.params.id);
  if (!data) return res.status(404).json({ success: false, message: 'Add-on not found' });
  res.json({ success: true, message: 'Add-on deleted' });
});

// ───────── Bookings ─────────
export const listWebBookings = handle(async (req, res) => {
  const { status, payment, search, page = 1, limit = 15 } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (payment && payment !== 'all') filter['payment.status'] = payment;
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ bookingId: rx }, { 'passenger.name': rx }, { 'passenger.mobile': rx }, { 'trip.from': rx }, { 'trip.to': rx }];
  }
  const total = await WebBooking.countDocuments(filter);
  const data = await WebBooking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit));
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) || 1 });
});

export const getWebBooking = handle(async (req, res) => {
  const data = await WebBooking.findOne({ bookingId: req.params.bookingId.toUpperCase() }).populate('assignedPartner', 'name phone vehicleNumber');
  if (!data) return res.status(404).json({ success: false, message: 'Booking not found' });
  res.json({ success: true, data });
});

const STATUSES = ['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];

export const updateWebBookingStatus = handle(async (req, res) => {
  const { status, cancelReason, adminNote, assignedPartner } = req.body;
  const booking = await WebBooking.findOne({ bookingId: req.params.bookingId.toUpperCase() });
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

  let statusChanged = false;
  if (status !== undefined) {
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    statusChanged = booking.status !== status;
    if (statusChanged) booking.statusHistory.push({ status, at: new Date() });
    booking.status = status;
    if (status === 'cancelled') booking.cancelReason = cancelReason || '';
  }
  if (adminNote !== undefined) booking.adminNote = adminNote;
  if (assignedPartner !== undefined) booking.assignedPartner = assignedPartner || null;
  await booking.save();

  // Tell the customer about every real status change. A mail failure never fails the update itself.
  let email = null;
  if (statusChanged) {
    try {
      await booking.populate('assignedPartner', 'name phone vehicleNumber');
      email = await sendStatusUpdate(booking);
    } catch (err) {
      console.error('Status email failed:', err.message);
      email = { emailSent: false, skipped: 'send_failed' };
    }
  }
  res.json({ success: true, data: booking, email, message: 'Booking updated' });
});

export const getWebsiteStats = handle(async (req, res) => {
  const [total, confirmed, completed, cancelled, paid, revenue, cities, routes, fareRules] = await Promise.all([
    WebBooking.countDocuments(),
    WebBooking.countDocuments({ status: 'confirmed' }),
    WebBooking.countDocuments({ status: 'completed' }),
    WebBooking.countDocuments({ status: 'cancelled' }),
    WebBooking.countDocuments({ 'payment.status': 'paid' }),
    WebBooking.aggregate([{ $match: { 'payment.status': 'paid' } }, { $group: { _id: null, sum: { $sum: '$payment.paidAmount' } } }]),
    WebCity.countDocuments(),
    WebRoute.countDocuments(),
    WebFareRule.countDocuments(),
  ]);
  res.json({
    success: true,
    data: { total, confirmed, completed, cancelled, paid, onlineRevenue: revenue[0]?.sum || 0, cities, routes, fareRules },
  });
});

// ───────── Seed defaults (safe: only inserts what is missing) ─────────
const DEFAULT_CITIES = [
  ['Delhi', 'Delhi', true], ['New Delhi', 'Delhi', true], ['Noida', 'Uttar Pradesh', false], ['Gurgaon', 'Haryana', true],
  ['Agra', 'Uttar Pradesh', true], ['Jaipur', 'Rajasthan', true], ['Chandigarh', 'Chandigarh', true],
  ['Dehradun', 'Uttarakhand', true], ['Haridwar', 'Uttarakhand', false], ['Rishikesh', 'Uttarakhand', false],
  ['Mathura', 'Uttar Pradesh', false], ['Lucknow', 'Uttar Pradesh', true], ['Varanasi', 'Uttar Pradesh', false],
  ['Mumbai', 'Maharashtra', true], ['Pune', 'Maharashtra', true], ['Ahmedabad', 'Gujarat', false],
  ['Shimla', 'Himachal Pradesh', false], ['Manali', 'Himachal Pradesh', false], ['Amritsar', 'Punjab', false],
  ['Udaipur', 'Rajasthan', false],
];

const DEFAULT_RULES = [
  { vehicleType: 'hatchback', name: 'Hatchback', model: 'WagonR, Swift or similar', seats: 4, perKmOneway: 11, perKmRound: 10, minKmOneway: 250, minKmPerDay: 250, driverAllowance: 300, driverAllowancePerDay: 300, sortOrder: 1,
    packages: [{ label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 1100, extraKmRate: 12, extraHourRate: 150 }, { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 1900, extraKmRate: 12, extraHourRate: 150 }] },
  { vehicleType: 'sedan', name: 'Sedan', model: 'Dzire, Etios or similar', seats: 4, perKmOneway: 13, perKmRound: 12, minKmOneway: 250, minKmPerDay: 250, driverAllowance: 300, driverAllowancePerDay: 300, sortOrder: 2,
    packages: [{ label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 1300, extraKmRate: 14, extraHourRate: 180 }, { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 2200, extraKmRate: 14, extraHourRate: 180 }] },
  { vehicleType: 'suv', name: 'SUV', model: 'Ertiga, Marazzo or similar', seats: 6, perKmOneway: 17, perKmRound: 16, minKmOneway: 250, minKmPerDay: 250, driverAllowance: 400, driverAllowancePerDay: 400, sortOrder: 3,
    packages: [{ label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 1800, extraKmRate: 18, extraHourRate: 220 }, { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 3000, extraKmRate: 18, extraHourRate: 220 }] },
  { vehicleType: 'innova', name: 'Innova Crysta', model: 'Innova Crysta or similar', seats: 7, perKmOneway: 22, perKmRound: 20, minKmOneway: 250, minKmPerDay: 250, driverAllowance: 500, driverAllowancePerDay: 500, sortOrder: 4,
    packages: [{ label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 2400, extraKmRate: 22, extraHourRate: 300 }, { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 3800, extraKmRate: 22, extraHourRate: 300 }] },
];

export const seedWebsiteDefaults = handle(async (req, res) => {
  if (!isSuper(req)) return forbid(res);
  let cities = 0;
  let rules = 0;
  for (const [name, state, isPopular] of DEFAULT_CITIES) {
    const exists = await WebCity.findOne({ name }).collation({ locale: 'en', strength: 2 });
    if (!exists) { await WebCity.create({ name, state, isPopular }); cities++; }
  }
  for (const rule of DEFAULT_RULES) {
    if (!(await WebFareRule.findOne({ vehicleType: rule.vehicleType }))) { await WebFareRule.create(rule); rules++; }
  }
  res.json({ success: true, message: `Added ${cities} cities and ${rules} fare rules`, data: { cities, rules } });
});
