import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Partner from './models/Partner.js';
import User from './models/User.js';
import Booking from './models/Booking.js';

dotenv.config();

const seed = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // 1. Get first Partner
    const partner = await Partner.findOne();
    if (!partner) {
      console.log('No partner found. Please login to create one first.');
      process.exit(1);
    }
    console.log(`Seeding data for Partner: ${partner.name || partner.phone}`);

    // 2. Get or create a User
    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        name: 'Rahul Sharma',
        phone: '9876543210',
        email: 'rahul@example.com',
        isPhoneVerified: true
      });
    }

    // 3. Update Partner Wallet
    partner.walletBalance = 3250;
    partner.totalEarnings = 15500;
    await partner.save();

    // 4. Create Bookings
    console.log('Clearing old bookings for this partner...');
    await Booking.deleteMany({ partner: partner._id });

    console.log('Creating mock bookings...');
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const mockBookings = [
      {
        user: user._id,
        partner: partner._id,
        pickup: { address: 'Indira Gandhi International Airport, Terminal 3, New Delhi', lat: 28.5562, lng: 77.1000 },
        dropoff: { address: 'Connaught Place, New Delhi', lat: 28.6304, lng: 77.2177 },
        vehicleType: 'Sedan',
        status: 'COMPLETED',
        fare: { estimated: 450, final: 450 },
        distance: { text: '18.5 km', value: 18500 },
        duration: { text: '45 mins', value: 2700 },
        paymentStatus: 'COMPLETED',
        paymentMethod: 'UPI',
        createdAt: oneDayAgo,
      },
      {
        user: user._id,
        partner: partner._id,
        pickup: { address: 'DLF Cyber City, Gurugram', lat: 28.4950, lng: 77.0895 },
        dropoff: { address: 'Hauz Khas Village, New Delhi', lat: 28.5535, lng: 77.1936 },
        vehicleType: 'Sedan',
        status: 'COMPLETED',
        fare: { estimated: 380, final: 380 },
        distance: { text: '16.2 km', value: 16200 },
        duration: { text: '35 mins', value: 2100 },
        paymentStatus: 'COMPLETED',
        paymentMethod: 'CASH',
        createdAt: twoDaysAgo,
      },
      {
        user: user._id,
        partner: partner._id,
        pickup: { address: 'Noida Sector 18', lat: 28.5708, lng: 77.3204 },
        dropoff: { address: 'Okhla Bird Sanctuary', lat: 28.5574, lng: 77.3033 },
        vehicleType: 'Sedan',
        status: 'CANCELLED',
        fare: { estimated: 120, final: 0 },
        distance: { text: '3.5 km', value: 3500 },
        duration: { text: '10 mins', value: 600 },
        paymentStatus: 'FAILED',
        paymentMethod: 'UPI',
        cancelReason: 'Driver delayed',
        cancelledBy: 'USER',
        createdAt: oneDayAgo,
      }
    ];

    await Booking.insertMany(mockBookings);
    console.log('Bookings seeded successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seed();
