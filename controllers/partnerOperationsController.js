import Booking from '../models/Booking.js';
import Partner from '../models/Partner.js';
import Notification from '../models/Notification.js';

// ... existing code ...
// I will rewrite the whole file but preserve existing exports.
// Wait, I should just append to it or replace the whole thing. Let's rewrite the whole thing for safety.

export const getPartnerBookings = async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = { partner: req.partner._id };
    
    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        query.status = { $in: ['ACCEPTED', 'ENROUTE', 'ARRIVED', 'IN_PROGRESS'] };
      } else {
        query.status = status;
      }
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name phone profilePic')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Error fetching partner bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPartnerBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      partner: req.partner._id
    }).populate('user', 'name phone profilePic email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching partner booking details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;

    const booking = await Booking.findOne({
      _id: req.params.id,
      partner: req.partner._id
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const validTransitions = {
      'ACCEPTED': ['ENROUTE', 'CANCELLED'],
      'ENROUTE': ['ARRIVED', 'CANCELLED'],
      'ARRIVED': ['IN_PROGRESS', 'CANCELLED'],
      'IN_PROGRESS': ['COMPLETED'],
      'PENDING': [],
      'COMPLETED': [],
      'CANCELLED': []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${booking.status} to ${status}` 
      });
    }

    booking.status = status;
    
    if (status === 'CANCELLED') {
      booking.cancelReason = cancelReason || 'Cancelled by partner';
      booking.cancelledBy = 'PARTNER';
    } else if (status === 'COMPLETED') {
      // Update partner earnings on completion
      const fare = booking.fare.final || booking.fare.estimated || 0;
      await Partner.findByIdAndUpdate(req.partner._id, {
        $inc: { 
          walletBalance: fare,
          totalEarnings: fare
        }
      });
    }

    await booking.save();

    res.status(200).json({ 
      success: true, 
      data: booking,
      message: `Booking marked as ${status}`
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get partner earnings dashboard data
// @route   GET /api/partner/earnings
// @access  Private (Partner)
export const getPartnerEarnings = async (req, res) => {
  try {
    const partner = await Partner.findById(req.partner._id);
    
    // Calculate today's and week's earnings from completed bookings
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday start

    const completedBookings = await Booking.find({
      partner: req.partner._id,
      status: 'COMPLETED'
    });

    let todayEarnings = 0;
    let weekEarnings = 0;

    completedBookings.forEach(b => {
      const bDate = new Date(b.createdAt);
      const fare = b.fare.final || b.fare.estimated || 0;
      
      if (bDate >= startOfDay) todayEarnings += fare;
      if (bDate >= startOfWeek) weekEarnings += fare;
    });

    res.status(200).json({
      success: true,
      data: {
        walletBalance: partner.walletBalance,
        totalEarnings: partner.totalEarnings,
        todayEarnings,
        weekEarnings,
        recentTransactions: completedBookings.slice(0, 10).map(b => ({
          _id: b._id,
          date: b.createdAt,
          amount: b.fare.final || b.fare.estimated,
          type: 'CREDIT',
          description: `Trip to ${b.dropoff.address}`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get partner notifications
// @route   GET /api/partner/notifications
// @access  Private (Partner)
export const getPartnerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientModel: 'Partner',
      recipientId: req.partner._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/partner/notifications/read
// @access  Private (Partner)
export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientModel: 'Partner', recipientId: req.partner._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
