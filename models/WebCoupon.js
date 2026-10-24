import mongoose from 'mongoose';

// Discount coupons for the public website checkout.
const webCouponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, match: /^[A-Z0-9_-]{3,20}$/ },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    discountType: { type: String, enum: ['percent', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 1 }, // % or ₹
    maxDiscount: { type: Number, default: 0, min: 0 }, // cap for percent coupons, 0 = no cap
    minOrderAmount: { type: Number, default: 0, min: 0 }, // minimum fare total
    tripTypes: { type: [String], default: [] }, // empty = all (oneway | roundtrip | local)
    vehicleTypes: { type: [String], default: [] }, // empty = all (WebFareRule.vehicleType)
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: 0, min: 0 }, // total redemptions, 0 = unlimited
    perMobileLimit: { type: Number, default: 0, min: 0 }, // per customer mobile, 0 = unlimited
    usedCount: { type: Number, default: 0, min: 0 }, // incremented when a booking using it is paid
    showOnWebsite: { type: Boolean, default: true }, // listed under "Coupons & Offers" at checkout
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

webCouponSchema.pre('validate', function () {
  if (this.discountType === 'percent' && this.discountValue > 100) {
    this.invalidate('discountValue', 'Percent discount cannot exceed 100');
  }
  if (this.startsAt && this.expiresAt && this.expiresAt <= this.startsAt) {
    this.invalidate('expiresAt', 'Expiry must be after the start date');
  }
});

export default mongoose.model('WebCoupon', webCouponSchema);
