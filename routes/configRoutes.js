import express from 'express';
import Setting from '../models/Setting.js';

const router = express.Router();

// @desc    Get public/shared config variables (like Google Maps API Key)
// @route   GET /api/config
// @access  Public (Used by Admin Web and Mobile Apps)
router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }

    res.status(200).json({
      success: true,
      data: {
        appConfig: {
          maintenanceMode: settings.maintenanceMode,
          minAndroidVersion: settings.minAndroidVersion,
          forceUpdate: settings.forceUpdate,
        },
        features: {
          isWalletEnabled: settings.isWalletEnabled,
          isReferralEnabled: settings.isReferralEnabled,
        },
        support: {
          email: settings.supportEmail,
          phone: settings.supportPhone,
        },
        apiKeys: {
          googleMaps: process.env.GOOGLE_MAPS_API_KEY || '',
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
        }
      }
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Get dynamic constants (dropdowns, enums, reasons)
// @route   GET /api/config/constants
// @access  Public
router.get('/constants', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      cancellationReasons: [
        "Driver denied duty",
        "Expected a shorter wait time",
        "Changed my mind",
        "Booked by mistake",
        "Driver asked for extra cash"
      ],
      documentTypes: [
        { id: "aadhar", name: "Aadhar Card", required: true },
        { id: "dl", name: "Driving License", required: true },
        { id: "pan", name: "PAN Card", required: true },
        { id: "rc", name: "Vehicle RC", required: true },
        { id: "insurance", name: "Vehicle Insurance", required: true }
      ]
    }
  });
});

export default router;
