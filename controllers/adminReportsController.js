import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Partner from '../models/Partner.js';

// @desc    Get chart analytics for revenue and rides
// @route   GET /api/admins/reports/analytics
// @access  Private (SuperAdmin/Admin)
export const getAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - days + 1); // e.g., if today is 7th, goes back to 1st

    const pipeline = [
      {
        $match: {
          status: 'COMPLETED',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$fare.estimated" },
          rides: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ];

    const results = await Booking.aggregate(pipeline);

    // Fill missing dates with 0
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      
      const found = results.find(r => r._id === dateString);
      chartData.push({
        date: dateString,
        revenue: found ? found.revenue : 0,
        rides: found ? found.rides : 0
      });
    }

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

// @desc    Export raw data for CSV
// @route   GET /api/admins/reports/export/:type
// @access  Private (SuperAdmin/Admin)
export const getExportData = async (req, res) => {
  try {
    const type = req.params.type; // users, partners, bookings
    
    let data = [];
    
    if (type === 'users') {
      const users = await User.find().select('name phone email status createdAt').lean();
      data = users.map(u => ({
        ID: u._id.toString(),
        Name: u.name || 'N/A',
        Phone: u.phone,
        Email: u.email || 'N/A',
        Status: u.status,
        Joined: new Date(u.createdAt).toISOString()
      }));
    } else if (type === 'partners') {
      const partners = await Partner.find().select('personalInfo status isOnline createdAt').lean();
      data = partners.map(p => ({
        ID: p._id.toString(),
        Name: p.personalInfo?.fullName || 'N/A',
        Phone: p.personalInfo?.phone || 'N/A',
        Status: p.status,
        IsOnline: p.isOnline ? 'Yes' : 'No',
        Joined: new Date(p.createdAt).toISOString()
      }));
    } else if (type === 'bookings') {
      const bookings = await Booking.find().select('user partner pickup dropoff status fare paymentMethod createdAt').lean();
      data = bookings.map(b => ({
        ID: b._id.toString(),
        UserID: b.user?.toString() || 'N/A',
        DriverID: b.partner?.toString() || 'N/A',
        Pickup: b.pickup?.address?.replace(/,/g, ' ') || 'N/A',
        Dropoff: b.dropoff?.address?.replace(/,/g, ' ') || 'N/A',
        Status: b.status,
        EstimatedFare: b.fare?.estimated || 0,
        PaymentMethod: b.paymentMethod,
        Date: new Date(b.createdAt).toISOString()
      }));
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
};
