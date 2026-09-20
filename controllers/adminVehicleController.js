import Partner from '../models/Partner.js';

// @desc    Get all vehicles (partners with vehicle details)
// @route   GET /api/admins/vehicles
// @access  Private (SuperAdmin/Admin)
export const getVehicles = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    // Base filter: only partners who have submitted at least a vehicle number
    const filter = { vehicleNumber: { $ne: '' } };

    // Search filter
    if (search) {
      filter.$or = [
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && status !== 'all') {
      if (status === 'eligible') filter.isVehicleEligible = true;
      if (status === 'ineligible') filter.isVehicleEligible = false;
    }

    const total = await Partner.countDocuments(filter);
    
    // We only project the fields we need for the vehicle management table to save bandwidth
    const partners = await Partner.find(filter)
      .select('name phone email vehicleNumber vehicleDetails vehicleDocuments vehiclePhotos isVehicleEligible applicationStatus isActive createdAt')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: partners
    });
  } catch (error) {
    console.error('Error in getVehicles:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching vehicles.' });
  }
};

// @desc    Get a single vehicle (partner) by ID
// @route   GET /api/admins/vehicles/:id
// @access  Private (SuperAdmin/Admin)
export const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const partner = await Partner.findById(id).select('-password');
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Vehicle/Partner not found.' });
    }
    return res.status(200).json({ success: true, data: partner });
  } catch (error) {
    console.error('Error in getVehicleById:', error.message);
    res.status(500).json({ success: false, message: 'Server error fetching vehicle.' });
  }
};

// @desc    Toggle vehicle eligibility (suspend/activate)
// @route   PATCH /api/admins/vehicles/:id/eligibility
// @access  Private (SuperAdmin/Admin)
export const toggleVehicleEligibility = async (req, res) => {
  try {
    const { id } = req.params;
    
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner/Vehicle not found.' });
    }

    partner.isVehicleEligible = !partner.isVehicleEligible;
    await partner.save();

    return res.status(200).json({
      success: true,
      message: `Vehicle has been ${partner.isVehicleEligible ? 'marked as eligible' : 'suspended'}.`,
      isVehicleEligible: partner.isVehicleEligible
    });
  } catch (error) {
    console.error('Error in toggleVehicleEligibility:', error.message);
    res.status(500).json({ success: false, message: 'Server error toggling vehicle eligibility.' });
  }
};
