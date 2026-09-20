import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// @desc    Auth Admin & get token
// @route   POST /api/admin/auth/login
// @access  Public
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const emailNormalized = email.toLowerCase().trim();

    // Find Admin by email
    const admin = await Admin.findOne({ email: emailNormalized });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check account status
    if (admin.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account is inactive. Please contact SuperAdmin.' });
    }

    // Compare password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Sign JWT token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during admin login', error: error.message });
  }
};
