import Setting from '../models/Setting.js';

// @desc    Get global platform settings
// @route   GET /api/admins/settings
// @access  Private (SuperAdmin/Admin)
export const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

// @desc    Update global platform settings
// @route   PUT /api/admins/settings
// @access  Private (SuperAdmin Only)
export const updateSettings = async (req, res) => {
  try {
    // Only SuperAdmin can update settings
    if (req.superadmin.role !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Not authorized. SuperAdmin only.' });
    }

    const { 
      platformCommission, 
      maintenanceMode, 
      supportEmail, 
      supportPhone,
      minAndroidVersion,
      forceUpdate,
      isWalletEnabled,
      isReferralEnabled
    } = req.body;

    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    if (platformCommission !== undefined) settings.platformCommission = platformCommission;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;
    if (minAndroidVersion !== undefined) settings.minAndroidVersion = minAndroidVersion;
    if (forceUpdate !== undefined) settings.forceUpdate = forceUpdate;
    if (isWalletEnabled !== undefined) settings.isWalletEnabled = isWalletEnabled;
    if (isReferralEnabled !== undefined) settings.isReferralEnabled = isReferralEnabled;

    await settings.save();

    res.status(200).json({ success: true, message: 'Settings updated successfully', data: settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};
