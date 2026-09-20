import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

// @desc    Get all admins (with search & filter)
// @route   GET /api/admins
export const getAdmins = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'All') query.role = role;
    if (status && status !== 'All') query.status = status;

    const admins = await Admin.find(query).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: admins.length, admins });
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching admins', error: error.message });
  }
};

// @desc    Create new admin
// @route   POST /api/admins
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, role, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required fields.' });
    }

    const emailNormalized = email.toLowerCase().trim();
    const existingAdmin = await Admin.findOne({ email: emailNormalized });
    if (existingAdmin) {
      return res.status(400).json({ message: 'An admin with this email address already exists.' });
    }

    const admin = new Admin({ name, email: emailNormalized, password, phone: phone || '', role: role || 'Admin', status: status || 'Active' });
    await admin.save();

    const createdAdmin = await Admin.findById(admin._id).select('-password');
    res.status(201).json({ success: true, message: 'Admin account created successfully', admin: createdAdmin });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'An admin with this email address already exists.' });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error while creating admin', error: error.message });
  }
};

// @desc    Update admin
// @route   PUT /api/admins/:id
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status, password } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (email && email.toLowerCase().trim() !== admin.email) {
      const emailExists = await Admin.findOne({ email: email.toLowerCase().trim() });
      if (emailExists) return res.status(400).json({ message: 'Email address is already in use by another admin.' });
      admin.email = email.toLowerCase().trim();
    }

    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;
    if (role) admin.role = role;
    if (status) admin.status = status;
    if (password && password.trim() !== '') admin.password = password;

    await admin.save();
    const updatedAdmin = await Admin.findById(id).select('-password');
    res.status(200).json({ success: true, message: 'Admin details updated successfully', admin: updatedAdmin });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email address is already in use.' });
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error while updating admin', error: error.message });
  }
};

// @desc    Toggle admin status
// @route   PATCH /api/admins/:id/status
export const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    admin.status = admin.status === 'Active' ? 'Inactive' : 'Active';
    await admin.save();

    const updatedAdmin = await Admin.findById(id).select('-password');
    res.status(200).json({ success: true, message: `Admin status changed to ${admin.status}`, admin: updatedAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error while toggling status', error: error.message });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    await Admin.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Admin account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while deleting admin', error: error.message });
  }
};

// @desc    Impersonate admin - generate token for specific admin
// @route   POST /api/admins/:id/impersonate
export const impersonateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    if (admin.status === 'Inactive') {
      return res.status(403).json({ message: 'Cannot login as inactive admin account.' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
