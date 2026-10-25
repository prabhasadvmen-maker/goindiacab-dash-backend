import express from 'express';
import VehicleCategory from '../models/VehicleCategory.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const isSuper = (req) => req.superadmin?.role === 'SuperAdmin';
const forbid = (res) => res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });

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

// @desc    Get ALL vehicle categories (Admin dashboard)
// @route   GET /api/vehicles/categories/all
// @access  Private (Admin/SuperAdmin)
router.get('/categories/all', protect, async (req, res) => {
  try {
    const categories = await VehicleCategory.find().sort({ baseFare: 1 });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Add a new vehicle category
// @route   POST /api/vehicles/categories
// @access  Private (SuperAdmin)
router.post('/categories', protect, async (req, res) => {
  try {
    if (!isSuper(req)) return forbid(res);
    const category = await VehicleCategory.create(req.body);
    res.status(201).json({ success: true, data: category, message: 'Category created' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Vehicle category with this name already exists' });
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Update a vehicle category
// @route   PUT /api/vehicles/categories/:id
// @access  Private (SuperAdmin)
router.put('/categories/:id', protect, async (req, res) => {
  try {
    if (!isSuper(req)) return forbid(res);
    const category = await VehicleCategory.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, data: category, message: 'Category updated' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Delete a vehicle category
// @route   DELETE /api/vehicles/categories/:id
// @access  Private (SuperAdmin)
router.delete('/categories/:id', protect, async (req, res) => {
  try {
    if (!isSuper(req)) return forbid(res);
    const category = await VehicleCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Toggle active status of a vehicle category
// @route   PATCH /api/vehicles/categories/:id/toggle
// @access  Private (SuperAdmin)
router.patch('/categories/:id/toggle', protect, async (req, res) => {
  try {
    if (!isSuper(req)) return forbid(res);
    const category = await VehicleCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    category.isActive = !category.isActive;
    await category.save();
    res.status(200).json({ success: true, data: category, message: `Category ${category.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Error toggling category:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
