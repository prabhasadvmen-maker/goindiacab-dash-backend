import crypto from 'crypto';
import axios from 'axios';
import Razorpay from 'razorpay';
import WebCity from '../models/WebCity.js';
import WebFareRule from '../models/WebFareRule.js';
import WebBooking from '../models/WebBooking.js';
import Setting from '../models/Setting.js';
import { resolveDistance } from '../services/webDistanceService.js';
import { calculateWebFare, splitPayment, TRIP_TYPES } from '../services/webFareService.js';
import { sendBookingConfirmation } from '../services/webNotifyService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (res, status, error, message) => res.status(status).json({ success: false, error, message });

const getPartPercent = async () => {
  const s = await Setting.findOne();
  return s?.webPartPaymentPercent || 25;
};

const newBookingId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(9);
  return 'GIC-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

// "YYYY-MM-DD" for today in IST
const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const publicBooking = (b) => ({
  bookingId: b.bookingId,
  status: b.status,
  passenger: {
    name: b.passenger.name,
    mobile: b.passenger.mobile,
    email: b.passenger.email,
    pickupAddress: b.passenger.pickupAddress,
  },
  trip: {
    from: b.trip.from, to: b.trip.to, date: b.trip.date, time: b.trip.time,
    tripType: b.trip.tripType, distanceKm: b.trip.distanceKm,
  },
  vehicle: { name: b.vehicle.name, model: b.vehicle.model },
  fare: {
    baseFare: b.fare.baseFare,
    extraKmFare: b.fare.extraKmFare,
    driverAllowance: b.fare.driverAllowance,
    gst: b.fare.gst,
    total: b.fare.total,
    paidNow: b.fare.paidNow,
    payLater: b.fare.payLater,
  },
  paymentStatus: b.payment.status,
  bookedAt: b.createdAt,
});

// GET /api/locations/suggest?q=del
export const suggestLocations = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ suggestions: [] });

    const rx = new RegExp('^' + escapeRegex(q), 'i');
    const cities = await WebCity.find({ isActive: true, name: rx })
      .sort({ isPopular: -1, name: 1 })
      .limit(6)
      .lean();
    const suggestions = cities.map((c) => ({ label: c.state ? `${c.name}, ${c.state}` : c.name, value: c.name }));

    // Top up from Geoapify when the admin-managed list has few matches.
    if (suggestions.length < 6 && process.env.GEOAPIFY_API_KEY) {
      try {
        const { data } = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
          params: { text: q, type: 'city', limit: 6, apiKey: process.env.GEOAPIFY_API_KEY, filter: 'countrycode:in' },
          timeout: 4000,
        });
        const seen = new Set(suggestions.map((s) => s.value.toLowerCase()));
        for (const f of data.features || []) {
          const name = f.properties.city || f.properties.name;
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());
          suggestions.push({ label: f.properties.state ? `${name}, ${f.properties.state}` : name, value: name });
        }
      } catch { /* external lookup is best-effort */ }
    }
    res.json({ suggestions: suggestions.slice(0, 6) });
  } catch (err) {
    console.error('suggestLocations:', err);
    fail(res, 500, 'SERVER_ERROR', 'Could not fetch suggestions');
  }
};

// GET /api/distance?from=Delhi&to=Agra
export const getDistance = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return fail(res, 400, 'VALIDATION_ERROR', 'from and to are required');
    const result = await resolveDistance(String(from), String(to));
    res.json(result);
  } catch (err) {
    fail(res, 422, 'DISTANCE_UNAVAILABLE', err.message);
  }
};

// GET /api/fare/vehicles - vehicle list for the cab cards
export const listVehicleTypes = async (req, res) => {
  try {
    const rules = await WebFareRule.find({ isActive: true }).sort({ sortOrder: 1, perKmOneway: 1 }).lean();
    res.json({
      vehicles: rules.map((r) => ({
        id: r.vehicleType, name: r.name, model: r.model, seats: r.seats, imageUrl: r.imageUrl,
        packages: r.packages.map((p) => ({ label: p.label, hours: p.hours, km: p.km, price: p.price })),
      })),
    });
  } catch (err) {
    fail(res, 500, 'SERVER_ERROR', 'Could not fetch vehicles');
  }
};

const computeForRequest = async ({ vehicleType, distanceKm, tripType, package: pkg, days }) => {
  if (!TRIP_TYPES.includes(tripType)) throw Object.assign(new Error('Invalid tripType'), { code: 'VALIDATION_ERROR' });
  const rule = await WebFareRule.findOne({ vehicleType: String(vehicleType || '').toLowerCase(), isActive: true });
  if (!rule) throw Object.assign(new Error('Vehicle type not available'), { code: 'VEHICLE_NOT_FOUND' });
  const fare = calculateWebFare(rule, { distanceKm, tripType, packageLabel: pkg, days });
  return { rule, fare };
};

// POST /api/fare/calculate
export const calculateFareApi = async (req, res) => {
  try {
    const { vehicleType, distanceKm, tripType = 'oneway', package: pkg = '', days = 1 } = req.body || {};
    const dist = Number(distanceKm);
    if (!vehicleType || !Number.isFinite(dist) || dist < 0 || dist > 6000) {
      return fail(res, 400, 'VALIDATION_ERROR', 'vehicleType and a valid distanceKm are required');
    }
    const { fare } = await computeForRequest({ vehicleType, distanceKm: dist, tripType, package: pkg, days });
    const pct = await getPartPercent();
    res.json({
      ...fare,
      paymentOptions: {
        full: { paidNow: fare.total, payLater: 0 },
        part: { percent: pct, ...splitPayment(fare.total, 'part', pct) },
      },
    });
  } catch (err) {
    const status = err.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
    fail(res, status, err.code || 'FARE_ERROR', err.message);
  }
};

// POST /api/booking/create
export const createBooking = async (req, res) => {
  try {
    const { passenger = {}, trip = {}, vehicle = {}, fare: clientFare = {} } = req.body || {};
    const name = String(passenger.name || '').trim();
    const mobile = String(passenger.mobile || '').replace(/\D/g, '').slice(-10);
    const email = String(passenger.email || '').trim();
    const pickupAddress = String(passenger.pickupAddress || '').trim();

    if (name.length < 2) return fail(res, 400, 'VALIDATION_ERROR', 'Passenger name is required');
    if (!/^[6-9]\d{9}$/.test(mobile)) return fail(res, 400, 'VALIDATION_ERROR', 'Enter a valid 10-digit mobile number');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(res, 400, 'VALIDATION_ERROR', 'Enter a valid email');
    if (!pickupAddress) return fail(res, 400, 'VALIDATION_ERROR', 'Pickup address is required');
    if (!trip.from || !/^\d{4}-\d{2}-\d{2}$/.test(trip.date || '') || !/^\d{2}:\d{2}$/.test(trip.time || '')) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Trip from, date (YYYY-MM-DD) and time (HH:mm) are required');
    }
    if (trip.date < todayIST()) return fail(res, 400, 'VALIDATION_ERROR', 'Trip date cannot be in the past');

    const tripType = trip.tripType || 'oneway';
    if (tripType !== 'local' && !trip.to) return fail(res, 400, 'VALIDATION_ERROR', 'Drop city is required');

    // Never trust client distance/fare: re-derive on the server.
    let distanceKm = Number(trip.distanceKm) || 0;
    if (trip.to) {
      try { distanceKm = (await resolveDistance(trip.from, trip.to)).distanceKm; } catch { /* keep client value */ }
    }
    if (tripType !== 'local' && !(distanceKm > 0)) {
      return fail(res, 422, 'DISTANCE_UNAVAILABLE', 'Could not determine trip distance');
    }

    let computed;
    try {
      computed = await computeForRequest({
        vehicleType: vehicle.id, distanceKm, tripType, package: trip.package, days: trip.days,
      });
    } catch (err) {
      return fail(res, err.code === 'VEHICLE_NOT_FOUND' ? 404 : 400, err.code || 'FARE_ERROR', err.message);
    }

    const duplicate = await WebBooking.findOne({
      'passenger.mobile': mobile, 'trip.from': trip.from, 'trip.to': trip.to || '',
      'trip.date': trip.date, 'trip.time': trip.time, status: { $ne: 'cancelled' },
    });
    if (duplicate) return fail(res, 409, 'DUPLICATE_BOOKING', 'A booking already exists for this trip');

    const paymentOption = clientFare.paymentOption === 'full' ? 'full' : 'part';
    const f = computed.fare;
    const { paidNow, payLater } = splitPayment(f.total, paymentOption, await getPartPercent());

    const booking = await WebBooking.create({
      bookingId: newBookingId(),
      passenger: {
        name, mobile, email, pickupAddress,
        dropAddress: passenger.dropAddress || '', instructions: passenger.instructions || '',
      },
      trip: {
        from: trip.from, to: trip.to || '', date: trip.date, time: trip.time, tripType,
        package: trip.package || '', days: Math.max(1, Number(trip.days) || 1), distanceKm,
      },
      vehicle: {
        id: computed.rule.vehicleType, name: computed.rule.name,
        model: computed.rule.model, seats: computed.rule.seats,
      },
      fare: {
        baseFare: f.baseFare, extraKmFare: f.extraKmFare, driverAllowance: f.driverAllowance, gst: f.gst,
        addons: [], discount: 0, total: f.total, paymentOption, paidNow, payLater,
      },
    });

    res.status(201).json({
      success: true,
      bookingId: booking.bookingId,
      status: booking.status,
      fare: { total: f.total, paymentOption, paidNow, payLater },
      message: 'Booking created successfully',
    });
  } catch (err) {
    console.error('createBooking:', err);
    fail(res, 500, 'SERVER_ERROR', 'Could not create booking');
  }
};

// GET /api/booking/:bookingId
export const getBooking = async (req, res) => {
  try {
    const booking = await WebBooking.findOne({ bookingId: String(req.params.bookingId).toUpperCase() });
    if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
    res.json(publicBooking(booking));
  } catch (err) {
    fail(res, 500, 'SERVER_ERROR', 'Could not fetch booking');
  }
};

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

// POST /api/payment/create-order - amount always comes from the booking, never from the client
export const createPaymentOrder = async (req, res) => {
  try {
    const { bookingId } = req.body || {};
    if (!bookingId) return fail(res, 400, 'VALIDATION_ERROR', 'bookingId is required');
    const booking = await WebBooking.findOne({ bookingId: String(bookingId).toUpperCase() });
    if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
    if (booking.status === 'cancelled') return fail(res, 409, 'BOOKING_CANCELLED', 'Booking is cancelled');
    if (booking.payment.status === 'paid') return fail(res, 409, 'ALREADY_PAID', 'Booking is already paid');

    const rzp = getRazorpay();
    if (!rzp) return fail(res, 503, 'PAYMENT_NOT_CONFIGURED', 'Online payment is not available right now');

    const order = await rzp.orders.create({
      amount: booking.fare.paidNow * 100,
      currency: 'INR',
      receipt: booking.bookingId,
      notes: { bookingId: booking.bookingId },
    });
    booking.payment.orderId = order.id;
    booking.payment.status = 'pending';
    await booking.save();

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error('createPaymentOrder:', err.error || err);
    fail(res, 502, 'PAYMENT_GATEWAY_ERROR', 'Could not start payment');
  }
};

// POST /api/payment/verify
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Missing payment fields');
    }
    const booking = await WebBooking.findOne({ bookingId: String(bookingId).toUpperCase() });
    if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
    if (booking.payment.orderId !== razorpay_order_id) {
      return fail(res, 400, 'ORDER_MISMATCH', 'Payment verification failed');
    }
    if (booking.payment.status === 'paid') {
      return res.json({ success: true, bookingId: booking.bookingId, paymentId: booking.payment.paymentId, status: 'paid' });
    }

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(razorpay_signature));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      booking.payment.status = 'failed';
      await booking.save();
      return fail(res, 400, 'SIGNATURE_MISMATCH', 'Payment verification failed');
    }

    booking.payment.status = 'paid';
    booking.payment.paymentId = razorpay_payment_id;
    booking.payment.paidAmount = booking.fare.paidNow;
    booking.payment.paidAt = new Date();
    await booking.save();

    // Fire-and-forget confirmation; failure must not affect the payment response.
    sendBookingConfirmation(booking)
      .then(async (r) => { booking.notification = r; await booking.save(); })
      .catch(() => {});

    res.json({ success: true, bookingId: booking.bookingId, paymentId: razorpay_payment_id, status: 'paid' });
  } catch (err) {
    console.error('verifyPayment:', err);
    fail(res, 500, 'SERVER_ERROR', 'Could not verify payment');
  }
};

// POST /api/notify/booking-confirmed - uses DB data only; idempotent; only for paid bookings
export const notifyBookingConfirmed = async (req, res) => {
  try {
    const booking = await WebBooking.findOne({ bookingId: String(req.body?.bookingId || '').toUpperCase() });
    if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Booking not found');
    if (booking.payment.status !== 'paid') return fail(res, 409, 'NOT_PAID', 'Booking payment is not verified');
    if (booking.notification.emailSent || booking.notification.smsSent) {
      return res.json({
        success: true, emailSent: booking.notification.emailSent, smsSent: booking.notification.smsSent, alreadySent: true,
      });
    }
    const r = await sendBookingConfirmation(booking);
    booking.notification = r;
    await booking.save();
    res.json({ success: true, emailSent: r.emailSent, smsSent: r.smsSent });
  } catch (err) {
    fail(res, 500, 'SERVER_ERROR', 'Could not send notification');
  }
};
