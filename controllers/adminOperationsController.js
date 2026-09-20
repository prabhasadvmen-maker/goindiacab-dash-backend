import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';
import { getActiveDrivers as getSocketActiveDrivers } from '../socket.js';
import User from '../models/User.js';

// @desc    Get high level stats for Operations Dashboard
// @route   GET /api/admins/operations/overview
// @access  Private (SuperAdmin/Admin)
export const getOperationsOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeDriversCount,
      ongoingRidesCount,
      pendingBookingsCount,
      completedTodayCount
    ] = await Promise.all([
      Partner.countDocuments({ status: 'approved', isOnline: true }), // Assuming we add isOnline later, or just active approved
      Booking.countDocuments({ status: { $in: ['ACCEPTED', 'ENROUTE', 'ARRIVED', 'IN_PROGRESS'] } }),
      Booking.countDocuments({ status: 'PENDING' }),
      Booking.countDocuments({ status: 'COMPLETED', createdAt: { $gte: today } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeDrivers: activeDriversCount,
        ongoingRides: ongoingRidesCount,
        pendingBookings: pendingBookingsCount,
        completedToday: completedTodayCount,
      }
    });
  } catch (error) {
    console.error('Error fetching operations overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operations overview' });
  }
};

// @desc    Get all bookings (paginated)
// @route   GET /api/admins/operations/bookings
// @access  Private (SuperAdmin/Admin)
export const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = {};

    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status.toUpperCase();
    }

    const total = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('user', 'name phone email')
      .populate('partner', 'personalInfo.fullName vehicleDetails.vehicleNumber')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// @desc    Admin forcefully update booking status (e.g. cancel)
// @route   PATCH /api/admins/operations/bookings/:id/status
// @access  Private (SuperAdmin/Admin)
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;
    if (status === 'CANCELLED') {
      booking.cancelledBy = 'ADMIN';
      booking.cancelReason = cancelReason || 'Cancelled by Admin/Operations';
    }

    await booking.save();

    res.status(200).json({ success: true, data: booking, message: `Booking status updated to ${status}` });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Server error updating booking status.' });
  }
};

// @desc    Get snapshot of active drivers from Socket.js
// @route   GET /api/admins/operations/active-drivers
// @access  Private (SuperAdmin/Admin)
export const getActiveDrivers = async (req, res) => {
  try {
    const drivers = getSocketActiveDrivers();
    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error fetching active drivers:', error);
    res.status(500).json({ success: false, message: 'Server error fetching active drivers.' });
  }
};

// @desc    Get a single booking by ID
// @route   GET /api/admins/operations/bookings/:id
// @access  Private (SuperAdmin/Admin)
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name phone email profilePicture')
      .populate('partner', 'personalInfo vehicleDetails vehiclePhotos phone applicationStatus isVehicleEligible isOnline location');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking details' });
  }
};

// @desc    Admin assigns a partner to a booking
// @route   PATCH /api/admins/operations/bookings/:id/assign
// @access  Private (SuperAdmin/Admin)
export const assignPartnerToBooking = async (req, res) => {
  try {
    const { partnerId } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!partnerId) {
       return res.status(400).json({ success: false, message: 'Partner ID is required for assignment' });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner) {
       return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    if (partner.applicationStatus !== 'approved') {
       return res.status(400).json({ success: false, message: 'Partner is not approved' });
    }

    booking.partner = partnerId;
    booking.status = 'ACCEPTED';

    await booking.save();

    res.status(200).json({ success: true, data: booking, message: `Successfully assigned ${partner.personalInfo?.fullName || 'driver'} to the booking.` });
  } catch (error) {
    console.error('Error assigning partner:', error);
    res.status(500).json({ success: false, message: 'Failed to assign partner' });
  }
};
