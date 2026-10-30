import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  platformCommission: {
    type: Number,
    default: 20, // 20% by default
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  supportEmail: {
    type: String,
    default: 'support@goindiacab.com',
  },
  supportPhone: {
    type: String,
    default: '+91-9999999999',
  },
  minAndroidVersion: {
    type: String,
    default: '1.0.0',
  },
  forceUpdate: {
    type: Boolean,
    default: false,
  },
  isWalletEnabled: {
    type: Boolean,
    default: true,
  },
  isReferralEnabled: {
    type: Boolean,
    default: true,
  },
  webPolicies: {
    type: [{ title: String, text: String, kind: { type: String, enum: ['included', 'excluded'], default: 'included' }, tripTypes: { type: [String], default: [] }, _id: false }], // tripTypes empty = shown for every trip type
    default: () => [
      { kind: 'included', title: 'Toll, tax and other charges', text: 'Toll, State Tax and Parking charges are included' },
      { kind: 'included', title: 'Driver allowance', text: 'Driver food and accommodation (stay) charges are included' },
      { kind: 'included', title: 'Fuel charges included', text: 'Fuel cost for your trip is included in the fare' },
      { kind: 'excluded', title: 'Multiple pickups/drops', text: 'Extra pickups or drops other than the booked stop are not included' },
    ],
  },
  webFreeCancelMinutes: {
    type: Number,
    default: 60, // free cancellation window before pickup, shown on the public website
    min: 0,
  },
  webPartPaymentPercent: {
    type: Number,
    default: 25, // % payable online at booking time on the public website
    min: 1,
    max: 100,
  }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
