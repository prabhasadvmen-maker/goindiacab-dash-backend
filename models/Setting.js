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
  }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
export default Setting;
