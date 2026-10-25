import mongoose from 'mongoose';

// Guest bookings created from the public website (no user login).
const webBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true, index: true }, // GIC-XXXXXXXXX
    status: {
      type: String,
      enum: ['confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'confirmed',
    },
    passenger: {
      name: { type: String, required: true },
      mobile: { type: String, required: true, index: true },
      email: { type: String, default: '' },
      pickupAddress: { type: String, required: true },
      dropAddress: { type: String, default: '' },
      instructions: { type: String, default: '' },
    },
    trip: {
      from: { type: String, required: true },
      to: { type: String, default: '' },
      stop: { type: String, default: '' }, // optional intermediate stop
      date: { type: String, required: true }, // YYYY-MM-DD
      time: { type: String, required: true }, // HH:mm
      tripType: { type: String, enum: ['oneway', 'roundtrip', 'local'], default: 'oneway' },
      package: { type: String, default: '' },
      days: { type: Number, default: 1 },
      returnDate: { type: String, default: '' }, // YYYY-MM-DD, round trips only
      distanceKm: { type: Number, default: 0 },
    },
    vehicle: {
      id: { type: String, required: true },
      name: { type: String, default: '' },
      model: { type: String, default: '' },
      seats: { type: Number, default: 4 },
    },
    fare: {
      baseFare: { type: Number, default: 0 },
      extraKmFare: { type: Number, default: 0 },
      driverAllowance: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      addons: { type: [mongoose.Schema.Types.Mixed], default: [] },
      discount: { type: Number, default: 0 },
      couponCode: { type: String, default: '', index: true },
      total: { type: Number, required: true },
      paymentOption: { type: String, enum: ['full', 'part'], default: 'part' },
      paidNow: { type: Number, default: 0 }, // amount payable now
      payLater: { type: Number, default: 0 },
    },
    payment: {
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      orderId: { type: String, default: '' },
      paymentId: { type: String, default: '' },
      paidAmount: { type: Number, default: 0 },
      paidAt: { type: Date, default: null },
    },
    notification: {
      emailSent: { type: Boolean, default: false },
      smsSent: { type: Boolean, default: false },
    },
    // One entry per status change made by the admin, shown as the customer's tracking timeline.
    statusHistory: {
      type: [{ _id: false, status: { type: String }, at: { type: Date, default: Date.now } }],
      default: [],
    },
    assignedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    adminNote: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

// Admin booking list / payment history: filter by status, newest first.
webBookingSchema.index({ createdAt: -1 });
webBookingSchema.index({ status: 1, createdAt: -1 });
webBookingSchema.index({ 'payment.status': 1, 'payment.paidAt': -1 });

export default mongoose.model('WebBooking', webBookingSchema);
