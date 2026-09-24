import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const partnerSchema = new mongoose.Schema(
  {
    // ── Step 1: Mobile ──────────────────────────────────────────
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // ── Step 3-5: Vehicle Number & Eligibility ───────────────────
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    vehicleRegistrationYear: {
      type: Number,
      default: null,
    },
    isVehicleEligible: {
      type: Boolean,
      default: false,
    },

    // ── Step 6: Personal Details ─────────────────────────────────
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    dateOfBirth: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    profilePhoto: {
      type: String,
      default: '',
    },

    // ── Step 7: Address ──────────────────────────────────────────
    address: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },

    // ── Step 8: Driving Licence ──────────────────────────────────
    drivingLicence: {
      number: { type: String, default: '' },
      expiryDate: { type: String, default: '' },
      frontImage: { type: String, default: '' },
      backImage: { type: String, default: '' },
      isVerified: { type: Boolean, default: false },
    },

    // ── Step 9: Aadhaar / KYC ────────────────────────────────────
    aadhaar: {
      number: { type: String, default: '' },
      frontImage: { type: String, default: '' },
      backImage: { type: String, default: '' },
      isVerified: { type: Boolean, default: false },
    },

    // ── Step 10: PAN ─────────────────────────────────────────────
    pan: {
      number: { type: String, default: '', uppercase: true },
      image: { type: String, default: '' },
      isVerified: { type: Boolean, default: false },
    },

    // ── Step 11: Bank Account ────────────────────────────────────
    bankAccount: {
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '', uppercase: true },
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      isVerified: { type: Boolean, default: false },
    },

    // ── Step 12: Vehicle Details ─────────────────────────────────
    vehicleDetails: {
      make: { type: String, default: '' },
      model: { type: String, default: '' },
      color: { type: String, default: '' },
      fuelType: { type: String, enum: ['Petrol', 'Diesel', 'CNG', 'Electric', ''], default: '' },
      seatingCapacity: { type: Number, default: 0 },
      category: { type: String, enum: ['Hatchback', 'Sedan', 'SUV', 'Prime Sedan', 'Prime SUV', ''], default: '' },
    },

    // ── Step 13: Vehicle Documents ───────────────────────────────
    vehicleDocuments: {
      rc: {
        number: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        image: { type: String, default: '' },
      },
      insurance: {
        policyNumber: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        image: { type: String, default: '' },
      },
      puc: {
        certificateNumber: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        image: { type: String, default: '' },
      },
      permit: {
        number: { type: String, default: '' },
        expiryDate: { type: String, default: '' },
        image: { type: String, default: '' },
      },
    },

    // ── Step 14: Live Vehicle Photos ─────────────────────────────
    vehiclePhotos: {
      front: { type: String, default: '' },
      back: { type: String, default: '' },
      left: { type: String, default: '' },
      right: { type: String, default: '' },
      interior: { type: String, default: '' },
    },

    // ── Step 16: Onboarding Payment ──────────────────────────────
    onboardingPayment: {
      amount: { type: Number, default: 1999 },
      status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
      transactionId: { type: String, default: '' },
      paidAt: { type: Date, default: null },
    },

    // ── Application Status ────────────────────────────────────────
    applicationStatus: {
      type: String,
      enum: ['incomplete', 'submitted', 'under_review', 'approved', 'rejected', 'correction_required'],
      default: 'incomplete',
    },

    // Current onboarding step (1-20)
    currentStep: {
      type: Number,
      default: 1,
    },

    // Admin review fields
    rejectionReason: {
      type: String,
      default: '',
    },
    correctionFields: {
      type: [String],
      default: [],
    },
    correctionNote: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    // Active status after approval
    isActive: {
      type: Boolean,
      default: false,
    },

    // ── Earnings & Wallet ────────────────────────────────────────
    walletBalance: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },

    // JWT password (set after phone verify — used for session)
    password: {
      type: String,
      default: '',
    },

    // OTP fields
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // Online status & live location
    isOnline: { type: Boolean, default: false },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

// Hash password before save if modified
partnerSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

partnerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Partner = mongoose.model('Partner', partnerSchema);
export default Partner;
