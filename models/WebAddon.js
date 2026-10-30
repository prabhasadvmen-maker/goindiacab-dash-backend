import mongoose from 'mongoose';

// Optional extras a customer can add at checkout ("Personalize your journey").
const webAddonSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true }, // "luggage-carrier"
    title: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['flat', 'perKm'], default: 'flat' }, // flat = per booking, perKm = price x billable km
    badge: { type: String, default: '', trim: true }, // e.g. "Most Popular"
    tripTypes: { type: [String], default: [] }, // empty = every trip type (oneway | roundtrip | local | airport)
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('WebAddon', webAddonSchema);
