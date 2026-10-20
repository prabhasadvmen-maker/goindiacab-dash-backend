import mongoose from 'mongoose';

// Admin-maintained city-to-city distances. Checked before any external routing API.
const webRouteSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    fromKey: { type: String, required: true, index: true }, // lowercase
    toKey: { type: String, required: true, index: true },   // lowercase
    distanceKm: { type: Number, required: true, min: 1 },
    durationMins: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ['admin', 'auto'], default: 'admin' }, // auto = cached from routing API
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

webRouteSchema.index({ fromKey: 1, toKey: 1 }, { unique: true });

export default mongoose.model('WebRoute', webRouteSchema);
