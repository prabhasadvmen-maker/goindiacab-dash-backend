import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';
import bcrypt from 'bcryptjs';

// @desc    Get logged in admin profile
// @route   GET /api/admins/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    let user;
    if (req.superadmin.role === 'SuperAdmin') {
      user = await SuperAdmin.findById(req.superadmin._id).select('-password');
    } else {
      user = await Admin.findById(req.superadmin._id).select('-password');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// @desc    Update profile
// @route   PUT /api/admins/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    let user;
    if (req.superadmin.role === 'SuperAdmin') {
      user = await SuperAdmin.findById(req.superadmin._id);
    } else {
      user = await Admin.findById(req.superadmin._id);
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      // Models have pre-save hook for hashing, but let's make sure
      user.password = password; 
    }

    await user.save();

    // Don't return password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
