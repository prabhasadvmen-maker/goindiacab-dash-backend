import express from 'express';
import { getAutoCompleteSuggestions, getPlaceDetails } from '../services/mapsService.js';
import { protectUser } from '../middleware/userAuthMiddleware.js';

const router = express.Router();

// @desc    Get autocomplete suggestions
// @route   GET /api/v1/maps/autocomplete
// @access  Private (User)
router.get('/autocomplete', protectUser, async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) {
      return res.status(400).json({ success: false, message: 'Input is required' });
    }
    const suggestions = await getAutoCompleteSuggestions(input);
    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get exact lat/lng and formatted address for a Place ID
// @route   GET /api/v1/maps/place
// @access  Private (User)
router.get('/place', protectUser, async (req, res) => {
  try {
    const { placeId } = req.query;
    if (!placeId) {
      return res.status(400).json({ success: false, message: 'Place ID is required' });
    }
    const details = await getPlaceDetails(placeId);
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
