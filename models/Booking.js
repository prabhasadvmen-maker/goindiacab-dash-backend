import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Partner',
      default: null,
    },
    pickup: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    dropoff: {
      address: { type: String, required: true },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['Mini', 'Sedan', 'SUV', 'Auto', 'Bike'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'ENROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
    },
    fare: {
      estimated: { type: Number, required: true },
      final: { type: Number, default: null },
    },
    distance: {
      text: { type: String, default: '' },
      value: { type: Number, default: 0 }, // in meters
    },
    duration: {
      text: { type: String, default: '' },
      value: { type: Number, default: 0 }, // in seconds
    },
    otp: {
      type: String,
      default: function() {
        return Math.floor(1000 + Math.random() * 9000).toString(); // 4 digit OTP to start ride
      }
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'WALLET', 'CARD'],
      default: 'CASH',
    },
    cancelReason: {
      type: String,
      default: null,
    },
    cancelledBy: {
      type: String,
      enum: ['USER', 'PARTNER', 'ADMIN', null],
      default: null,
    }
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
