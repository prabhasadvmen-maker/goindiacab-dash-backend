import express from 'express';
import VehicleCategory from '../models/VehicleCategory.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all active vehicle categories (Public for Android App)
// @route   GET /api/vehicles/categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await VehicleCategory.find({ isActive: true }).sort({ baseFare: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching vehicle categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Add a new vehicle category
// @route   POST /api/vehicles/categories
// @access  Private (SuperAdmin)
router.post('/categories', protect, async (req, res) => {
  try {
    if (req.superadmin.role !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });
    }
    const category = await VehicleCategory.create(req.body);
    res.status(201).json({ success: true, data: category, message: 'Category created' });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
