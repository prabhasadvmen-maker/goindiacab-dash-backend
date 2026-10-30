import mongoose from 'mongoose';

// Cities shown in the website's pickup/drop autocomplete.
const webCitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, default: '', trim: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    isPopular: { type: Boolean, default: false },
    hourlyRental: { type: Boolean, default: false }, // pickup city allowed for Hourly Rentals
    hourlyOrder: { type: Number, default: 0 }, // order in the Hourly Rentals city list
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

webCitySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model('WebCity', webCitySchema);
