import Booking from '../models/Booking.js';
import { getIO } from '../socket.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import VehicleCategory from '../models/VehicleCategory.js';
import { getDistanceMatrix } from '../services/mapsService.js';

// @desc    Estimate fare for available vehicle categories
// @route   POST /api/v1/user/operations/estimate-fare
// @access  Private (User)
export const estimateFare = async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;

    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({ success: false, message: 'Pickup and dropoff coordinates are required' });
    }

    // Call actual Google Maps Service
    let distanceKm = 0;
    let durationMinutes = 0;
    let distanceData = { text: '0 km', value: 0 };
    let durationData = { text: '0 mins', value: 0 };

    try {
      const matrix = await getDistanceMatrix(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropoffLat, lng: dropoffLng }
      );
      distanceData = matrix.distance;
      durationData = matrix.duration;
      distanceKm = distanceData.value / 1000;
      durationMinutes = durationData.value / 60;
    } catch (err) {
      console.warn('Google Maps API failed, falling back to basic estimates', err.message);
      // Basic fallback if API key is invalid
      distanceKm = 10;
      durationMinutes = 30;
      distanceData = { text: '10 km', value: 10000 };
      durationData = { text: '30 mins', value: 1800 };
    }
    
    // Default min distance to 1km to avoid 0 fares
    const effectiveDistance = Math.max(1, distanceKm);

    // 3. Fetch active vehicle categories
    const categories = await VehicleCategory.find({ isActive: true });
    
    if (categories.length === 0) {
      // Fallback if no categories in DB
      return res.status(200).json({
        success: true,
        distance: distanceData,
        duration: durationData,
        fares: [
          { type: 'Mini', estimatedFare: effectiveDistance * 15 + 50 },
          { type: 'Sedan', estimatedFare: effectiveDistance * 18 + 60 },
          { type: 'SUV', estimatedFare: effectiveDistance * 25 + 80 }
        ]
      });
    }

    // 4. Calculate fare for each category based on DB pricing
    const fares = categories.map(cat => {
      let fare = cat.pricing.baseFare;
      if (effectiveDistance > 1) {
        fare += (effectiveDistance - 1) * cat.pricing.perKmRate;
      }
      fare += durationMinutes * cat.pricing.perMinuteRate;
      
      // Add tax or margins if needed, for now just round it
      fare = Math.round(fare);

      return {
        type: cat.name,
        estimatedFare: fare,
        capacity: cat.capacity,
        description: cat.description,
        icon: cat.icon
      };
    });

    res.status(200).json({
      success: true,
      distance: distanceData,
      duration: durationData,
      fares
    });

  } catch (error) {
    console.error('Error estimating fare:', error);
    res.status(500).json({ success: false, message: 'Server error estimating fare' });
  }
};

// @desc    Create a new booking
// @route   POST /api/v1/user/operations/bookings
// @access  Private (User)
export const createBooking = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType, estimatedFare, distance, duration, paymentMethod } = req.body;

    if (!pickup || !dropoff || !vehicleType || !estimatedFare) {
      return res.status(400).json({ success: false, message: 'Missing required booking details' });
    }

    const booking = await Booking.create({
      user: req.user._id,
      pickup,
      dropoff,
      vehicleType,
      fare: { estimated: estimatedFare },
      distance: distance || { text: '0 km', value: 0 },
      duration: duration || { text: '0 mins', value: 0 },
      paymentMethod: paymentMethod || 'CASH',
      status: 'PENDING'
    });

    try {
      const io = getIO();
      // Broadcast the booking to all drivers
      io.to('drivers').emit('newBookingRequest', booking);
    } catch (err) {
      console.warn('Socket emit failed:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully! Searching for drivers...',
      data: booking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Server error creating booking' });
  }
};

// @desc    Get user's bookings
// @route   GET /api/v1/user/operations/bookings
// @access  Private (User)
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('partner', 'name phone vehicleNumber profilePhoto')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching bookings' });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/v1/user/operations/bookings/:id
// @access  Private (User)
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id })
      .populate('partner', 'name phone vehicleNumber vehicleDetails profilePhoto');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, message: 'Server error fetching booking' });
  }
};

// @desc    Cancel a booking
// @route   POST /api/v1/user/operations/bookings/:id/cancel
// @access  Private (User)
export const cancelBooking = async (req, res) => {
  try {
    const { cancelReason } = req.body;
    
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (['COMPLETED', 'CANCELLED', 'IN_PROGRESS'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a booking in ${booking.status} state` });
    }

    booking.status = 'CANCELLED';
    booking.cancelReason = cancelReason || 'Cancelled by user';
    booking.cancelledBy = 'USER';
    
    await booking.save();

    res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling booking' });
  }
};

// @desc    Get user's notifications
// @route   GET /api/v1/user/operations/notifications
// @access  Private (User)
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientModel: 'User',
      recipientId: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/v1/user/operations/notifications/read
// @access  Private (User)
export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientModel: 'User', recipientId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/user/operations/profile
// @access  Private (User)
export const updateProfile = async (req, res) => {
  try {
    const { name, email, profilePhoto } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (profilePhoto) user.profilePhoto = profilePhoto; // In a real app, upload to R2 first
    
    await user.save();
    
    // Re-return safe user
    const safeUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
      walletBalance: user.walletBalance
    };

    res.status(200).json({ success: true, message: 'Profile updated successfully', user: safeUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};
