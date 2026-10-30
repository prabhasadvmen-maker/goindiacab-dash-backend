import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "8 Hrs / 80 Km"
    hours: { type: Number, default: 0 },
    km: { type: Number, required: true },
    price: { type: Number, required: true },
    extraKmRate: { type: Number, default: 0 },
    extraHourRate: { type: Number, default: 0 },
  },
  { _id: false }
);

// Airport transfer rates. perKm = 0 means "not configured": the one-way rates are used instead.
const airportSchema = new mongoose.Schema(
  {
    perKm: { type: Number, default: 0, min: 0 },
    minKm: { type: Number, default: 0, min: 0 }, // minimum billable km
    driverAllowance: { type: Number, default: 0, min: 0 }, // flat per trip
    pickupFee: { type: Number, default: 0, min: 0 }, // extra for "Pickup from airport" (parking / waiting)
    dropFee: { type: Number, default: 0, min: 0 }, // extra for "Drop to airport"
  },
  { _id: false }
);

// Fare rules per vehicle type, used by POST /api/fare/calculate
const webFareRuleSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, unique: true, lowercase: true, trim: true }, // "sedan"
    name: { type: String, required: true },
    model: { type: String, default: '' }, // "Dzire, Etios or similar"
    seats: { type: Number, default: 4 },
    fuelType: { type: String, default: '', trim: true }, // Petrol / Diesel / Petrol + CNG / CNG / Electric
    bags: { type: Number, default: 0, min: 0 }, // luggage capacity shown on the cab card
    rating: { type: Number, default: 0, min: 0, max: 5 }, // 0 = not rated, hidden on the website
    imageUrl: { type: String, default: '' },
    perKmOneway: { type: Number, required: true },
    perKmRound: { type: Number, required: true },
    perKmRoundExtra: { type: Number, default: 0, min: 0 }, // round trip: ₹/km beyond the included km; 0 = same as perKmRound
    minKmOneway: { type: Number, default: 0 },  // minimum billable km for one-way
    minKmPerDay: { type: Number, default: 250 }, // minimum billable km per day for round trip
    driverAllowance: { type: Number, default: 0 }, // flat, one-way
    driverAllowancePerDay: { type: Number, default: 0 }, // round trip, per day
    airport: { type: airportSchema, default: () => ({}) }, // airport pickup / drop
    gstPercent: { type: Number, default: 5 },
    packages: { type: [packageSchema], default: [] }, // local/rental packages
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('WebFareRule', webFareRuleSchema);
