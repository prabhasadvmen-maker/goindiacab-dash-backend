import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';

// @desc    Auth SuperAdmin & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase().trim() });

    if (!superAdmin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await superAdmin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is missing in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: superAdmin._id, email: superAdmin.email },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      token,
      user: {
        id: superAdmin._id,
        email: superAdmin.email,
        role: 'SuperAdmin',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current logged in SuperAdmin
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    if (!req.superadmin) {
      return res.status(404).json({ message: 'SuperAdmin not found' });
    }
    res.status(200).json({
      user: {
        id: req.superadmin._id,
        email: req.superadmin.email,
        role: 'SuperAdmin',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
