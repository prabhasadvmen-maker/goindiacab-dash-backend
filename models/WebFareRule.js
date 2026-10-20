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

// Fare rules per vehicle type, used by POST /api/fare/calculate
const webFareRuleSchema = new mongoose.Schema(
  {
    vehicleType: { type: String, required: true, unique: true, lowercase: true, trim: true }, // "sedan"
    name: { type: String, required: true },
    model: { type: String, default: '' }, // "Dzire, Etios or similar"
    seats: { type: Number, default: 4 },
    imageUrl: { type: String, default: '' },
    perKmOneway: { type: Number, required: true },
    perKmRound: { type: Number, required: true },
    minKmOneway: { type: Number, default: 0 },  // minimum billable km for one-way
    minKmPerDay: { type: Number, default: 250 }, // minimum billable km per day for round trip
    driverAllowance: { type: Number, default: 0 }, // flat, one-way
    driverAllowancePerDay: { type: Number, default: 0 }, // round trip, per day
    gstPercent: { type: Number, default: 5 },
    packages: { type: [packageSchema], default: [] }, // local/rental packages
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('WebFareRule', webFareRuleSchema);
