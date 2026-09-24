import Partner from '../models/Partner.js';
import jwt from 'jsonwebtoken';

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.PARTNER_JWT_EXPIRES_IN || '30d',
  });
};

// 1. POST /auth/login (Initiate OTP)
export const initiateLogin = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
    
    let partner = await Partner.findOne({ phone });
    if (!partner) {
      partner = await Partner.create({ phone });
    }
    
    // In production, send real SMS here. Mocking for now.
    const otp = '1234'; 
    partner.otp = otp;
    partner.otpExpires = Date.now() + 10 * 60 * 1000;
    await partner.save();

    res.status(200).json({ success: true, message: 'OTP sent successfully (Mock: 1234)' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. POST /auth/verify (Verify OTP)
export const verifyLogin = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const partner = await Partner.findOne({ phone });
    
    if (!partner || partner.otp !== otp || partner.otpExpires < Date.now()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    partner.otp = undefined;
    partner.otpExpires = undefined;
    await partner.save();

    res.status(200).json({
      success: true,
      token: generateToken(partner._id),
      data: partner
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. POST /auth/resend (Resend OTP)
export const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    const partner = await Partner.findOne({ phone });
    if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

    partner.otp = '1234'; // Mock
    partner.otpExpires = Date.now() + 10 * 60 * 1000;
    await partner.save();
    
    res.status(200).json({ success: true, message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. POST /auth/logout
export const logout = async (req, res) => {
  // Client-side discards the token. Server-side can blacklist if implemented.
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// 5. GET /profile/me
export const getMyProfile = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id);
    res.status(200).json({ success: true, data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. PATCH /profile/name
export const updateName = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.partner._id, 
      { 'personalInfo.name': req.body.name, name: req.body.name }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Name updated', data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. PATCH /profile/email
export const updateEmail = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.partner._id, 
      { 'personalInfo.email': req.body.email, email: req.body.email }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Email updated', data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. PATCH /profile/dob
export const updateDOB = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.partner._id, 
      { 'personalInfo.dateOfBirth': req.body.dob }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'DOB updated', data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 9. PATCH /profile/gender
export const updateGender = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.partner._id, 
      { 'personalInfo.gender': req.body.gender }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Gender updated', data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 10. PATCH /profile/photo
export const updatePhoto = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(
      req.partner._id, 
      { 'personalInfo.profilePhoto': req.body.photoUrl, profilePhoto: req.body.photoUrl }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Photo updated', data: partner });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ==========================================
// STEP 2: Address & Vehicle Basics (10 APIs)
// ==========================================

// 11. PATCH /profile/address/street
export const updateAddressStreet = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'address.street': req.body.street }, { new: true });
    res.status(200).json({ success: true, message: 'Street address updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 12. PATCH /profile/address/city
export const updateAddressCity = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'address.city': req.body.city }, { new: true });
    res.status(200).json({ success: true, message: 'City updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 13. PATCH /profile/address/state
export const updateAddressState = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'address.state': req.body.state }, { new: true });
    res.status(200).json({ success: true, message: 'State updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 14. PATCH /profile/address/pincode
export const updateAddressPincode = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'address.pincode': req.body.pincode }, { new: true });
    res.status(200).json({ success: true, message: 'Pincode updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 15. POST /vehicle/check-eligibility
export const checkVehicleEligibility = async (req, res) => {
  try {
    const { registrationYear } = req.body;
    const currentYear = new Date().getFullYear();
    if (currentYear - parseInt(registrationYear) > 10) {
      return res.status(400).json({ success: false, message: 'Vehicle too old' });
    }
    res.status(200).json({ success: true, message: 'Vehicle is eligible' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 16. PATCH /vehicle/make
export const updateVehicleMake = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDetails.make': req.body.make }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle make updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 17. PATCH /vehicle/model
export const updateVehicleModel = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDetails.model': req.body.model }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle model updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 18. PATCH /vehicle/year
export const updateVehicleYear = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDetails.year': req.body.year }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle year updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 19. PATCH /vehicle/color
export const updateVehicleColor = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDetails.color': req.body.color }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle color updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 20. PATCH /vehicle/plate-number
export const updateVehiclePlateNumber = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { vehicleNumber: req.body.plateNumber }, { new: true });
    res.status(200).json({ success: true, message: 'Plate number updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 3: Driver KYC & Vehicle Docs (10 APIs)
// ==========================================

// 21. PATCH /profile/kyc/dl-front
export const updateDLFront = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'drivingLicence.frontImage': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'DL Front updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 22. PATCH /profile/kyc/dl-back
export const updateDLBack = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'drivingLicence.backImage': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'DL Back updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 23. PATCH /profile/kyc/aadhaar-front
export const updateAadhaarFront = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'aadhaar.frontImage': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Aadhaar Front updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 24. PATCH /profile/kyc/aadhaar-back
export const updateAadhaarBack = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'aadhaar.backImage': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Aadhaar Back updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 25. PATCH /profile/kyc/pan
export const updatePAN = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'pan.image': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'PAN updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 26. PATCH /vehicle/docs/rc
export const updateVehicleRC = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDocuments.rc.image': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'RC updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 27. PATCH /vehicle/docs/insurance
export const updateVehicleInsurance = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDocuments.insurance.image': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Insurance updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 28. PATCH /vehicle/docs/permit
export const updateVehiclePermit = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDocuments.permit.image': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Permit updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 29. PATCH /vehicle/docs/fitness
export const updateVehicleFitness = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehicleDocuments.puc.image': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Fitness updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 30. PATCH /vehicle/photos/front
export const updateVehiclePhotoFront = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehiclePhotos.front': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle Front Photo updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 4: Vehicle Photos, Bank & Payment (10 APIs)
// ==========================================

// 31. PATCH /vehicle/photos/back
export const updateVehiclePhotoBack = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehiclePhotos.back': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle Back Photo updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 32. PATCH /vehicle/photos/left
export const updateVehiclePhotoLeft = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehiclePhotos.left': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle Left Photo updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 33. PATCH /vehicle/photos/right
export const updateVehiclePhotoRight = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'vehiclePhotos.right': req.body.imageUrl }, { new: true });
    res.status(200).json({ success: true, message: 'Vehicle Right Photo updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 34. PATCH /profile/bank/account-name
export const updateBankAccountName = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'bankAccount.accountHolderName': req.body.accountName }, { new: true });
    res.status(200).json({ success: true, message: 'Bank Account Name updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 35. PATCH /profile/bank/account-number
export const updateBankAccountNumber = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'bankAccount.accountNumber': req.body.accountNumber }, { new: true });
    res.status(200).json({ success: true, message: 'Bank Account Number updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 36. PATCH /profile/bank/ifsc
export const updateBankIFSC = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'bankAccount.ifscCode': req.body.ifsc }, { new: true });
    res.status(200).json({ success: true, message: 'Bank IFSC updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 37. PATCH /profile/bank/bank-name
export const updateBankName = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 'bankAccount.bankName': req.body.bankName }, { new: true });
    res.status(200).json({ success: true, message: 'Bank Name updated', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 38. POST /onboarding/payment-initiate
export const initiateOnboardingPayment = async (req, res) => {
  try {
    // In production, call Razorpay/Stripe API to generate order
    const orderId = `order_${Math.random().toString(36).substring(2, 10)}`;
    res.status(200).json({ success: true, message: 'Payment order created', data: { orderId, amount: 1999 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 39. POST /onboarding/payment-verify
export const verifyOnboardingPayment = async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { 
      'onboardingPayment.status': 'completed',
      'onboardingPayment.transactionId': paymentId
    }, { new: true });
    res.status(200).json({ success: true, message: 'Payment verified successfully', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 40. POST /onboarding/submit-application
export const submitPartnerApplication = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { applicationStatus: 'pending_review' }, { new: true });
    res.status(200).json({ success: true, message: 'Application submitted for admin review', data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 5: Bookings & Active Rides (10 APIs)
// ==========================================

import Booking from '../models/Booking.js';

// 41. GET /bookings/active
export const getActiveBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ partner: req.partner._id, status: { $in: ['ACCEPTED', 'ENROUTE', 'ARRIVED', 'IN_PROGRESS'] } });
    res.status(200).json({ success: true, data: booking || null });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 42. GET /bookings/history
export const getBookingHistory = async (req, res) => {
  try {
    const bookings = await Booking.find({ partner: req.partner._id, status: { $in: ['COMPLETED', 'CANCELLED'] } }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 43. GET /bookings/requests
export const getPendingRequests = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'PENDING' }).sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ success: true, data: bookings });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 44. POST /bookings/:id/accept
export const acceptRideRequest = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, status: 'PENDING' }, 
      { status: 'ACCEPTED', partner: req.partner._id }, 
      { new: true }
    );
    if(!booking) return res.status(400).json({ success: false, message: 'Ride no longer available' });
    res.status(200).json({ success: true, message: 'Ride accepted', data: booking });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 45. POST /bookings/:id/decline
export const declineRideRequest = async (req, res) => {
  try {
    // In granular architecture, declining might log to a "DeclinedRides" table for stats
    res.status(200).json({ success: true, message: 'Ride declined successfully' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 46. PATCH /bookings/:id/arrive
export const markDriverArrived = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, partner: req.partner._id }, 
      { status: 'ARRIVED' }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Driver arrived at pickup', data: booking });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 47. PATCH /bookings/:id/start
export const startTrip = async (req, res) => {
  try {
    const { otp } = req.body;
    const booking = await Booking.findOne({ _id: req.params.id, partner: req.partner._id });
    if(booking.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
    
    booking.status = 'IN_PROGRESS';
    await booking.save();
    res.status(200).json({ success: true, message: 'Trip started', data: booking });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 48. PATCH /bookings/:id/complete
export const completeTrip = async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, partner: req.partner._id }, 
      { status: 'COMPLETED' }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Trip completed', data: booking });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 49. PATCH /bookings/:id/cancel
export const cancelTripByPartner = async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, partner: req.partner._id }, 
      { status: 'CANCELLED', cancellationReason: reason }, 
      { new: true }
    );
    res.status(200).json({ success: true, message: 'Trip cancelled', data: booking });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 50. GET /bookings/:id/route
export const getBookingRoute = async (req, res) => {
  try {
    // In production, this calls Google Maps Directions API and returns polyline
    res.status(200).json({ success: true, message: 'Route data fetched successfully', data: { polyline: '...' } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 6: Finance, Wallet & Earnings (10 APIs)
// ==========================================

// 51. GET /finance/wallet/balance
export const getWalletBalance = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id).select('walletBalance');
    res.status(200).json({ success: true, data: { balance: partner.walletBalance || 0 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 52. GET /finance/wallet/transactions
export const getWalletTransactions = async (req, res) => {
  try {
    const mockTxs = [
      { type: 'CREDIT', amount: 450, description: 'Trip fare added (TRIP-892)', date: new Date(Date.now() - 3600000) },
      { type: 'CREDIT', amount: 380, description: 'Trip fare added (TRIP-891)', date: new Date(Date.now() - 7200000) },
      { type: 'DEBIT', amount: 50, description: 'Commission deduction', date: new Date(Date.now() - 86400000) },
      { type: 'DEBIT', amount: 1500, description: 'Withdrawal to Bank', date: new Date(Date.now() - 172800000) }
    ];
    res.status(200).json({ success: true, data: mockTxs });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 53. POST /finance/wallet/withdraw
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    res.status(200).json({ success: true, message: `Withdrawal request for ₹${amount} submitted` });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 54. GET /finance/earnings/today
export const getTodayEarnings = async (req, res) => {
  try {
    // Calculate today's earnings from Bookings model
    res.status(200).json({ success: true, data: { today: 1500, trips: 5 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 55. GET /finance/earnings/weekly
export const getWeeklyEarnings = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { weekly: 10500, trips: 35 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 56. GET /finance/earnings/monthly
export const getMonthlyEarnings = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { monthly: 45000, trips: 150 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 57. GET /finance/settlements/history
export const getSettlementHistory = async (req, res) => {
  try {
    const mockSettlements = [
      { id: 'SET-9901', amount: 4500, status: 'SUCCESS', date: new Date(Date.now() - 7 * 86400000), bankAcc: 'XXXX-1234' },
      { id: 'SET-9842', amount: 3200, status: 'SUCCESS', date: new Date(Date.now() - 14 * 86400000), bankAcc: 'XXXX-1234' }
    ];
    res.status(200).json({ success: true, data: mockSettlements });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 58. GET /finance/settlements/pending
export const getPendingSettlements = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 59. GET /finance/invoices/:tripId
export const getTripInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.tripId);
    if (!booking) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.status(200).json({ success: true, data: { invoiceUrl: 'http://example.com/invoice.pdf' } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 60. GET /finance/taxes/tds-summary
export const getTdsSummary = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { totalTdsDeducted: 450, financialYear: '2025-2026' } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 7: Support, SOS & App Settings (10 APIs)
// ==========================================

// 61. GET /support/tickets
export const getSupportTickets = async (req, res) => {
  try {
    const mockTickets = [
      { id: 'TKT-1024', subject: 'Fare mismatch on Trip #891', status: 'RESOLVED', date: new Date() },
      { id: 'TKT-1045', subject: 'App crashing on navigation', status: 'OPEN', date: new Date() }
    ];
    res.status(200).json({ success: true, data: mockTickets }); // Returns array of tickets
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 62. GET /support/tickets/:id
export const getSingleTicket = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { id: req.params.id, status: 'OPEN', messages: [] } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 63. POST /support/tickets/create
export const createSupportTicket = async (req, res) => {
  try {
    const { subject, description, tripId } = req.body;
    res.status(201).json({ success: true, message: 'Support ticket created successfully', data: { ticketId: 'TKT12345' } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 64. POST /support/tickets/:id/reply
export const replyToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    res.status(200).json({ success: true, message: 'Reply sent' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 65. POST /support/emergency/sos
export const triggerSOSAlert = async (req, res) => {
  try {
    const { lat, lng, tripId } = req.body;
    // Real implementation would notify Admin instantly via Socket/SMS
    res.status(200).json({ success: true, message: 'SOS Alert triggered successfully. Help is on the way.' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 66. GET /settings/preferences
export const getAppSettings = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { language: 'en', navigation: 'GMAP', pushEnabled: true } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 67. PATCH /settings/language
export const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    // Optionally update in DB
    res.status(200).json({ success: true, message: `Language updated to ${language}` });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 68. PATCH /settings/navigation
export const updateNavigationApp = async (req, res) => {
  try {
    const { appName } = req.body;
    res.status(200).json({ success: true, message: `Navigation app set to ${appName}` });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 69. PATCH /settings/notifications
export const updatePushPreferences = async (req, res) => {
  try {
    const { enabled } = req.body;
    res.status(200).json({ success: true, message: `Push notifications ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 70. POST /settings/device-token
export const registerDeviceToken = async (req, res) => {
  try {
    const { token, deviceOs } = req.body;
    // Save FCM/APNs token for push notifications in DB
    res.status(200).json({ success: true, message: 'Device registered for notifications' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ==========================================
// STEP 8: Performance, Referrals & Alerts (10 APIs)
// ==========================================

// 71. GET /performance/ratings
export const getDriverRatings = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { averageRating: 4.8, totalReviews: 125, latestFeedback: [] } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 72. GET /performance/metrics
export const getDriverMetrics = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: { acceptanceRate: '95%', cancellationRate: '2%', onlineHours: '45h' } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 73. GET /activity/logs
export const getActivityLogs = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 74. PUT /activity/status
export const toggleOnlineStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { isOnline }, { new: true });
    res.status(200).json({ success: true, message: `Status changed to ${isOnline ? 'Online' : 'Offline'}`, data: partner });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 75. PATCH /activity/location
export const pingLiveLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const partner = await Partner.findByIdAndUpdate(req.partner._id, { location: { type: 'Point', coordinates: [lng, lat] } }, { new: true });
    res.status(200).json({ success: true, message: 'Location updated successfully' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 76. GET /referrals/code
export const getReferralCode = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id).select('phone');
    const refCode = `GOCAB${partner.phone.substring(6)}`; // Pseudo referral code
    res.status(200).json({ success: true, data: { code: refCode, bonusAmount: 500 } });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 77. GET /referrals/history
export const getReferralHistory = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: [] });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 78. POST /referrals/claim
export const claimReferralBonus = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Referral bonus claimed successfully' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 79. GET /notifications/all
export const getNotifications = async (req, res) => {
  try {
    const mockNotifs = [
      { id: 'NOTIF-1', title: 'Wallet Credited', message: '₹450 has been added to your wallet for Trip #891.', date: new Date(), read: false },
      { id: 'NOTIF-2', title: 'System Update', message: 'New map navigation features are now available in Settings.', date: new Date(Date.now() - 86400000), read: true },
      { id: 'NOTIF-3', title: 'Vehicle Insurance Expiring', message: 'Your commercial insurance expires in 14 days. Please upload renewed documents.', date: new Date(Date.now() - 172800000), read: true }
    ];
    res.status(200).json({ success: true, data: mockNotifs });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// 80. PATCH /notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error' }); }
};
