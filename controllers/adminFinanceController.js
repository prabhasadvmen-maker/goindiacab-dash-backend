import Booking from '../models/Booking.js';
import WebBooking from '../models/WebBooking.js';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyIdHere',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere',
});

// @desc    Get finance overview (Total revenue, platform fee, partner earnings)
// @route   GET /api/admins/finance/overview
// @access  Private (SuperAdmin/Admin)
export const getFinanceOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aggregate lifetime total revenue from COMPLETED bookings
    const lifetimeStats = await Booking.aggregate([
      { $match: { status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$fare.estimated" },
          totalCash: {
            $sum: {
              $cond: [{ $eq: ["$paymentMethod", "CASH"] }, "$fare.estimated", 0]
            }
          },
          totalOnline: {
            $sum: {
              $cond: [{ $in: ["$paymentMethod", ["UPI", "CARD", "WALLET"]] }, "$fare.estimated", 0]
            }
          }
        }
      }
    ]);

    // Aggregate today's total revenue from COMPLETED bookings
    const todayStats = await Booking.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: today } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$fare.estimated" }
        }
      }
    ]);

    const stats = lifetimeStats.length > 0 ? lifetimeStats[0] : { totalRevenue: 0, totalCash: 0, totalOnline: 0 };
    const todayRevenue = todayStats.length > 0 ? todayStats[0].totalRevenue : 0;

    const COMMISSION_RATE = 0.20; // 20% platform fee
    const platformCommission = stats.totalRevenue * COMMISSION_RATE;
    const partnerEarnings = stats.totalRevenue - platformCommission;

    res.status(200).json({
      success: true,
      data: {
        totalRevenue: stats.totalRevenue,
        todayRevenue: todayRevenue,
        platformCommission: platformCommission,
        partnerEarnings: partnerEarnings,
        paymentBreakdown: {
          cash: stats.totalCash,
          online: stats.totalOnline
        }
      }
    });
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch finance overview' });
  }
};

// @desc    Get recent transactions (completed bookings)
// @route   GET /api/admins/finance/transactions
// @access  Private (SuperAdmin/Admin)
export const getRecentTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = { status: 'COMPLETED' };

    const total = await Booking.countDocuments(query);
    const transactions = await Booking.find(query)
      .populate('user', 'name')
      .populate('partner', 'personalInfo.fullName')
      .select('fare paymentMethod paymentStatus createdAt vehicleType')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// @desc    Website (Razorpay) payment history + totals
// @route   GET /api/admins/finance/web-payments?payment=paid|pending|failed|all&search=&page=&limit=
// @access  Private (SuperAdmin/Admin)
export const getWebPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const payment = ['paid', 'pending', 'failed'].includes(req.query.payment) ? req.query.payment : 'all';

    const filter = {};
    if (payment !== 'all') filter['payment.status'] = payment;
    if (payment === 'all' || payment === 'pending') filter['payment.orderId'] = { $ne: '' }; // skip bookings that never reached checkout
    const search = String(req.query.search || '').trim();
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { bookingId: rx }, { 'passenger.name': rx }, { 'passenger.mobile': rx },
        { 'payment.paymentId': rx }, { 'payment.orderId': rx },
      ];
    }

    const [total, data, summary] = await Promise.all([
      WebBooking.countDocuments(filter),
      WebBooking.find(filter)
        .select('bookingId status passenger.name passenger.mobile trip.from trip.to trip.date fare payment createdAt')
        .sort({ 'payment.paidAt': -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      // Totals are over all paid bookings, independent of the table filter.
      WebBooking.aggregate([
        { $match: { 'payment.status': 'paid' } },
        {
          $group: {
            _id: null,
            paidCount: { $sum: 1 },
            collected: { $sum: '$payment.paidAmount' },
            discountGiven: { $sum: '$fare.discount' },
            balanceWithDrivers: {
              $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$fare.payLater', 0] },
            },
          },
        },
      ]),
    ]);

    const s = summary[0] || { paidCount: 0, collected: 0, discountGiven: 0, balanceWithDrivers: 0 };
    res.status(200).json({
      success: true,
      total,
      pagination: { page, limit, totalPages: Math.ceil(total / limit) || 1 },
      summary: { paidCount: s.paidCount, collected: s.collected, discountGiven: s.discountGiven, balanceWithDrivers: s.balanceWithDrivers },
      data,
    });
  } catch (error) {
    console.error('Error fetching website payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch website payments' });
  }
};

// @desc    Process payout to partner via Razorpay (Simulation/Real depending on keys)
// @route   POST /api/admins/finance/payouts/:id
// @access  Private (SuperAdmin/Admin)
export const processPayout = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId).populate('partner');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Payout already processed' });
    }

    // In a real scenario with Razorpay Route / Payouts, you would hit razorpay API:
    // const transfer = await razorpay.transfers.create({
    //   account: booking.partner.razorpayAccountId,
    //   amount: (booking.fare.estimated * 0.8) * 100, // 80% to partner, in paise
    //   currency: "INR"
    // });
    
    // For this implementation, we simulate the payout success
    
    booking.paymentStatus = 'COMPLETED';
    await booking.save();

    res.status(200).json({ 
      success: true, 
      message: 'Payout processed successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({ success: false, message: 'Failed to process payout' });
  }
};
