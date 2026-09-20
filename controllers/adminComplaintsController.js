import Complaint from '../models/Complaint.js';

// @desc    Get all complaints (with filtering and pagination)
// @route   GET /api/admins/complaints
// @access  Private (SuperAdmin/Admin)
export const getComplaints = async (req, res) => {
  try {
    const { status, priority, type } = req.query;
    
    // Build query
    const query = {};
    if (status && status !== 'ALL') query.status = status;
    if (priority && priority !== 'ALL') query.priority = priority;
    if (type && type !== 'ALL') query.raisedByModel = type;

    const complaints = await Complaint.find(query)
      .populate('raisedBy', 'name phone email')
      .populate('booking', 'pickup dropoff status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints,
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single complaint by ID
// @route   GET /api/admins/complaints/:id
// @access  Private (SuperAdmin/Admin)
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('raisedBy', 'name phone email profilePic')
      .populate('booking', 'pickup dropoff status fare distance duration')
      .populate('resolvedBy', 'name email');

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update complaint status & remarks
// @route   PUT /api/admins/complaints/:id
// @access  Private (SuperAdmin/Admin)
export const updateComplaint = async (req, res) => {
  try {
    const { status, priority, adminRemarks } = req.body;

    let complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    if (status) {
      complaint.status = status;
      // If status is resolved or closed, mark resolved info
      if (status === 'RESOLVED' || status === 'CLOSED') {
        complaint.resolvedAt = new Date();
        complaint.resolvedBy = req.superadmin._id;
        complaint.resolvedByModel = req.superadmin.role; // 'SuperAdmin' or 'Admin'
      } else {
        complaint.resolvedAt = null;
        complaint.resolvedBy = null;
        complaint.resolvedByModel = null;
      }
    }
    
    if (priority) complaint.priority = priority;
    if (adminRemarks !== undefined) complaint.adminRemarks = adminRemarks;

    await complaint.save();

    // Re-fetch with populations
    complaint = await Complaint.findById(req.params.id)
      .populate('raisedBy', 'name phone email profilePic')
      .populate('booking', 'pickup dropoff status fare distance duration')
      .populate('resolvedBy', 'name email');

    res.status(200).json({ success: true, data: complaint, message: 'Complaint updated successfully' });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
