import jwt from 'jsonwebtoken';
import Partner from '../models/Partner.js';
import { sendOTP, verifyOTP, canResendOTP } from '../services/otpService.js';
import { uploadBase64ToR2 } from '../services/r2Service.js';

// ─── Helper: sign JWT ────────────────────────────────────────────────────────
const signToken = (id, phone) =>
  jwt.sign({ id, phone, role: 'partner' }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ─── Helper: safe partner response (no password) ────────────────────────────
const safePartner = (partner) => {
  const obj = partner.toObject();
  delete obj.password;
  obj.role = 'partner';
  return obj;
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — Send OTP
// POST /api/partner/auth/send-otp
// ────────────────────────────────────────────────────────────────────────────
export const sendPartnerOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const canResend = await canResendOTP(phone);
    if (!canResend) {
      return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting a new OTP.' });
    }

    await sendOTP(phone);

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('sendPartnerOTP error:', error.message);
    return res.status(500).json({ success: false, message: error.message || 'Failed to send OTP.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — Verify OTP & create/resume partner session
// POST /api/partner/auth/verify-otp
// ────────────────────────────────────────────────────────────────────────────
export const verifyPartnerOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }

    const result = await verifyOTP(phone, otp);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Find or create partner record
    let partner = await Partner.findOne({ phone });
    if (!partner) {
      partner = await Partner.create({ phone, isPhoneVerified: true, currentStep: 3 });
    } else {
      partner.isPhoneVerified = true;
      if (partner.currentStep < 3) partner.currentStep = 3;
      await partner.save();
    }

    const token = signToken(partner._id, partner.phone);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      partner: {
        id: partner._id,
        phone: partner.phone,
        currentStep: partner.currentStep,
        applicationStatus: partner.applicationStatus,
        role: 'partner',
      },
    });
  } catch (error) {
    console.error('verifyPartnerOTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 3-5 — Vehicle Number Entry & Eligibility Check
// POST /api/partner/onboarding/vehicle-check
// ────────────────────────────────────────────────────────────────────────────
export const vehicleCheck = async (req, res) => {
  try {
    const { vehicleNumber, vehicleRegistrationYear } = req.body;
    const partner = req.partner;

    if (!vehicleNumber || !vehicleRegistrationYear) {
      return res.status(400).json({ success: false, message: 'Vehicle number and registration year are required.' });
    }

    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - Number(vehicleRegistrationYear);

    if (vehicleAge > 3) {
      return res.status(400).json({
        success: false,
        message: `Vehicle registered in ${vehicleRegistrationYear} is ${vehicleAge} years old. Only vehicles up to 3 years old are eligible.`,
        eligible: false,
      });
    }

    partner.vehicleNumber = vehicleNumber.toUpperCase().trim();
    partner.vehicleRegistrationYear = Number(vehicleRegistrationYear);
    partner.isVehicleEligible = true;
    partner.currentStep = 6;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: 'Vehicle is eligible.',
      eligible: true,
      vehicleAge,
      partner: safePartner(partner),
    });
  } catch (error) {
    console.error('vehicleCheck error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during vehicle check.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 6 — Personal Details
// PUT /api/partner/onboarding/personal-details
// ────────────────────────────────────────────────────────────────────────────
export const savePersonalDetails = async (req, res) => {
  try {
    const { name, email, dateOfBirth, gender, profilePhoto } = req.body;
    const partner = req.partner;

    if (!name || !email || !dateOfBirth || !gender) {
      return res.status(400).json({ success: false, message: 'Name, email, date of birth, and gender are required.' });
    }

    // Check email uniqueness (exclude self)
    const emailExists = await Partner.findOne({ email: email.toLowerCase(), _id: { $ne: partner._id } });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This email is already registered with another partner.' });
    }

    partner.name = name.trim();
    partner.email = email.toLowerCase().trim();
    let profilePhotoUrl = req.body.profilePhoto;
    if (profilePhotoUrl && profilePhotoUrl.startsWith('data:image')) {
      profilePhotoUrl = await uploadBase64ToR2(profilePhotoUrl, 'partner-profile');
    }

    partner.gender = req.body.gender || partner.gender;
    partner.dateOfBirth = req.body.dateOfBirth || partner.dateOfBirth;
    partner.profilePhoto = profilePhotoUrl || partner.profilePhoto;
    partner.currentStep = 7;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Personal details saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('savePersonalDetails error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving personal details.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 7 — Address Details
// PUT /api/partner/onboarding/address
// ────────────────────────────────────────────────────────────────────────────
export const saveAddress = async (req, res) => {
  try {
    const { line1, line2, city, state, pincode } = req.body;
    const partner = req.partner;

    if (!line1 || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'Address line 1, city, state, and pincode are required.' });
    }

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 6-digit pincode.' });
    }

    partner.address = { line1, line2: line2 || '', city, state, pincode };
    partner.currentStep = 8;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Address saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveAddress error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving address.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 8 — Driving Licence
// PUT /api/partner/onboarding/driving-licence
// ────────────────────────────────────────────────────────────────────────────
export const saveDrivingLicence = async (req, res) => {
  try {
    const { number, expiryDate, frontImage, backImage } = req.body;
    const partner = req.partner;

    if (!number || !expiryDate || !frontImage || !backImage) {
      return res.status(400).json({ success: false, message: 'Licence number, expiry date, and both images are required.' });
    }

    // Check expiry
    if (new Date(expiryDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Driving licence has expired. Please provide a valid licence.' });
    }

    let frontUrl = frontImage;
    if (frontUrl && frontUrl.startsWith('data:image')) {
      frontUrl = await uploadBase64ToR2(frontUrl, 'partner-dl-front');
    }

    let backUrl = backImage;
    if (backUrl && backUrl.startsWith('data:image')) {
      backUrl = await uploadBase64ToR2(backUrl, 'partner-dl-back');
    }

    partner.drivingLicence = {
      number: number.toUpperCase().trim(),
      expiryDate,
      frontImage: frontUrl,
      backImage: backUrl,
      isVerified: false,
    };
    partner.currentStep = 9;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Driving licence saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveDrivingLicence error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving driving licence.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 9 — Aadhaar / KYC
// PUT /api/partner/onboarding/aadhaar
// ────────────────────────────────────────────────────────────────────────────
export const saveAadhaar = async (req, res) => {
  try {
    const { number, frontImage, backImage } = req.body;
    const partner = req.partner;

    if (!number || !frontImage || !backImage) {
      return res.status(400).json({ success: false, message: 'Aadhaar number and both images are required.' });
    }

    if (!/^\d{12}$/.test(number)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 12-digit Aadhaar number.' });
    }

    let frontUrl = frontImage;
    if (frontUrl && frontUrl.startsWith('data:image')) {
      frontUrl = await uploadBase64ToR2(frontUrl, 'partner-aadhaar-front');
    }

    let backUrl = backImage;
    if (backUrl && backUrl.startsWith('data:image')) {
      backUrl = await uploadBase64ToR2(backUrl, 'partner-aadhaar-back');
    }

    partner.aadhaar = {
      number,
      frontImage: frontUrl,
      backImage: backUrl,
      isVerified: false,
    };
    partner.currentStep = 10;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Aadhaar details saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveAadhaar error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving Aadhaar.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 10 — PAN Details
// PUT /api/partner/onboarding/pan
// ────────────────────────────────────────────────────────────────────────────
export const savePAN = async (req, res) => {
  try {
    const { number, image } = req.body;
    const partner = req.partner;

    if (!number || !image) {
      return res.status(400).json({ success: false, message: 'PAN number and image are required.' });
    }

    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(number.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid PAN number (e.g. ABCDE1234F).' });
    }

    let imageUrl = image;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      imageUrl = await uploadBase64ToR2(imageUrl, 'partner-pan');
    }

    partner.pan = {
      number: number.toUpperCase(),
      image: imageUrl,
      isVerified: false,
    };
    partner.currentStep = 11;
    await partner.save();

    return res.status(200).json({ success: true, message: 'PAN details saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('savePAN error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving PAN.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 11 — Bank Account + IFSC
// PUT /api/partner/onboarding/bank-account
// ────────────────────────────────────────────────────────────────────────────
export const saveBankAccount = async (req, res) => {
  try {
    const { accountNumber, ifscCode, bankName, accountHolderName } = req.body;
    const partner = req.partner;

    if (!accountNumber || !ifscCode || !bankName || !accountHolderName) {
      return res.status(400).json({ success: false, message: 'All bank account fields are required.' });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid IFSC code (e.g. SBIN0001234).' });
    }

    partner.bankAccount = {
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      bankName,
      accountHolderName,
      isVerified: false,
    };
    partner.currentStep = 12;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Bank account saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveBankAccount error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving bank account.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 12 — Vehicle Details
// PUT /api/partner/onboarding/vehicle-details
// ────────────────────────────────────────────────────────────────────────────
export const saveVehicleDetails = async (req, res) => {
  try {
    const { make, model, color, fuelType, seatingCapacity, category } = req.body;
    const partner = req.partner;

    if (!make || !model || !color || !fuelType || !seatingCapacity || !category) {
      return res.status(400).json({ success: false, message: 'All vehicle detail fields are required.' });
    }

    partner.vehicleDetails = { make, model, color, fuelType, seatingCapacity: Number(seatingCapacity), category };
    partner.currentStep = 13;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Vehicle details saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveVehicleDetails error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving vehicle details.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 13 — Vehicle Documents
// PUT /api/partner/onboarding/vehicle-documents
// ────────────────────────────────────────────────────────────────────────────
export const saveVehicleDocuments = async (req, res) => {
  try {
    const { rc, insurance, puc, permit } = req.body;
    const partner = req.partner;

    if (!rc?.number || !rc?.expiryDate || !rc?.image) {
      return res.status(400).json({ success: false, message: 'RC number, expiry date, and image are required.' });
    }
    if (!insurance?.policyNumber || !insurance?.expiryDate || !insurance?.image) {
      return res.status(400).json({ success: false, message: 'Insurance policy number, expiry date, and image are required.' });
    }
    if (!puc?.certificateNumber || !puc?.expiryDate || !puc?.image) {
      return res.status(400).json({ success: false, message: 'PUC certificate number, expiry date, and image are required.' });
    }

    let rcUrl = rc?.image;
    if (rcUrl && rcUrl.startsWith('data:image')) {
      rcUrl = await uploadBase64ToR2(rcUrl, 'vehicle-rc');
    }

    let insuranceUrl = insurance?.image;
    if (insuranceUrl && insuranceUrl.startsWith('data:image')) {
      insuranceUrl = await uploadBase64ToR2(insuranceUrl, 'vehicle-insurance');
    }

    let pucUrl = puc?.image;
    if (pucUrl && pucUrl.startsWith('data:image')) {
      pucUrl = await uploadBase64ToR2(pucUrl, 'vehicle-puc');
    }

    partner.vehicleDocuments = {
      rc: {
        number: rc.number,
        expiryDate: rc.expiryDate,
        image: rcUrl,
      },
      insurance: {
        policyNumber: insurance.policyNumber,
        expiryDate: insurance.expiryDate,
        image: insuranceUrl,
      },
      puc: {
        certificateNumber: puc.certificateNumber,
        expiryDate: puc.expiryDate,
        image: pucUrl,
      },
      permit: permit || {},
    };
    partner.currentStep = 14;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Vehicle documents saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveVehicleDocuments error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving vehicle documents.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 14 — Live Vehicle Photos
// PUT /api/partner/onboarding/vehicle-photos
// ────────────────────────────────────────────────────────────────────────────
export const saveVehiclePhotos = async (req, res) => {
  try {
    const { front, back, left, right, interior } = req.body;
    const partner = req.partner;

    if (!front || !back || !left || !right || !interior) {
      return res.status(400).json({ success: false, message: 'All 5 vehicle photos (front, back, left, right, interior) are required.' });
    }

    const [frontUrl, backUrl, leftUrl, rightUrl, interiorUrl] = await Promise.all([
      front && front.startsWith('data:image') ? uploadBase64ToR2(front, 'vehicle-photo-front') : front,
      back && back.startsWith('data:image') ? uploadBase64ToR2(back, 'vehicle-photo-back') : back,
      left && left.startsWith('data:image') ? uploadBase64ToR2(left, 'vehicle-photo-left') : left,
      right && right.startsWith('data:image') ? uploadBase64ToR2(right, 'vehicle-photo-right') : right,
      interior && interior.startsWith('data:image') ? uploadBase64ToR2(interior, 'vehicle-photo-interior') : interior,
    ]);

    partner.vehiclePhotos = {
      front: frontUrl,
      back: backUrl,
      left: leftUrl,
      right: rightUrl,
      interior: interiorUrl,
    };
    partner.currentStep = 15;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Vehicle photos saved.', partner: safePartner(partner) });
  } catch (error) {
    console.error('saveVehiclePhotos error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error saving vehicle photos.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 15 — Get Application Review Summary
// GET /api/partner/onboarding/review
// ────────────────────────────────────────────────────────────────────────────
export const getApplicationReview = async (req, res) => {
  try {
    const partner = req.partner;
    return res.status(200).json({ success: true, partner: safePartner(partner) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching review.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 16 — Record Onboarding Payment
// POST /api/partner/onboarding/payment
// ────────────────────────────────────────────────────────────────────────────
export const recordPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const partner = req.partner;

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required.' });
    }

    partner.onboardingPayment = {
      amount: 1999,
      status: 'paid',
      transactionId,
      paidAt: new Date(),
    };
    partner.currentStep = 18;
    await partner.save();

    return res.status(200).json({ success: true, message: 'Payment recorded successfully.', partner: safePartner(partner) });
  } catch (error) {
    console.error('recordPayment error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error recording payment.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 18 — Submit Application
// POST /api/partner/onboarding/submit
// ────────────────────────────────────────────────────────────────────────────
export const submitApplication = async (req, res) => {
  try {
    const partner = req.partner;

    if (partner.onboardingPayment.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Onboarding payment is required before submission.' });
    }

    partner.applicationStatus = 'submitted';
    partner.currentStep = 19;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: 'Application submitted successfully. It is now under admin review.',
      partner: safePartner(partner),
    });
  } catch (error) {
    console.error('submitApplication error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error submitting application.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Get Partner Profile (for dashboard after approval)
// GET /api/partner/profile
// ────────────────────────────────────────────────────────────────────────────
export const getPartnerProfile = async (req, res) => {
  try {
    return res.status(200).json({ success: true, partner: safePartner(req.partner) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 20 — Admin: Review Decision (Approve / Reject / Correction)
// PUT /api/partner/admin/review/:partnerId
// ────────────────────────────────────────────────────────────────────────────
export const adminReviewDecision = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { decision, rejectionReason, correctionFields, correctionNote } = req.body;

    const validDecisions = ['approved', 'rejected', 'correction_required'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision. Must be approved, rejected, or correction_required.' });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found.' });
    }

    if (!['submitted', 'under_review'].includes(partner.applicationStatus)) {
      return res.status(400).json({ success: false, message: 'Partner application is not in a reviewable state.' });
    }

    partner.applicationStatus = decision;
    partner.reviewedBy = req.superadmin?._id || null;
    partner.reviewedAt = new Date();

    if (decision === 'approved') {
      partner.isActive = true;
      partner.approvedAt = new Date();
      partner.currentStep = 20;
    } else if (decision === 'rejected') {
      if (!rejectionReason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
      }
      partner.rejectionReason = rejectionReason;
      partner.isActive = false;
    } else if (decision === 'correction_required') {
      if (!correctionFields || correctionFields.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one correction field is required.' });
      }
      partner.correctionFields = correctionFields;
      partner.correctionNote = correctionNote || '';
      partner.currentStep = 15; // Send back to review step
    }

    await partner.save();

    return res.status(200).json({
      success: true,
      message: `Partner application ${decision.replace('_', ' ')}.`,
      partner: safePartner(partner),
    });
  } catch (error) {
    console.error('adminReviewDecision error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during review decision.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Admin: Get all partner applications (with filters)
// GET /api/partner/admin/applications?status=submitted&page=1&limit=20
// ────────────────────────────────────────────────────────────────────────────
export const adminGetApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.applicationStatus = status;

    const total = await Partner.countDocuments(filter);
    const partners = await Partner.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      partners,
    });
  } catch (error) {
    console.error('adminGetApplications error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error fetching applications.' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// Admin: Get single partner application
// GET /api/partner/admin/applications/:partnerId
// ────────────────────────────────────────────────────────────────────────────
export const adminGetSingleApplication = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.partnerId).select('-password');
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner not found.' });
    }
    return res.status(200).json({ success: true, partner });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching partner.' });
  }
};
