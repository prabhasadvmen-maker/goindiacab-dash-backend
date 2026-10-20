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
      date: { type: String, required: true }, // YYYY-MM-DD
      time: { type: String, required: true }, // HH:mm
      tripType: { type: String, enum: ['oneway', 'roundtrip', 'local'], default: 'oneway' },
      package: { type: String, default: '' },
      days: { type: Number, default: 1 },
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
    assignedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
    adminNote: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('WebBooking', webBookingSchema);
