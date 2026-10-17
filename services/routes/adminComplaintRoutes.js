import express from 'express';
import { getComplaints, getComplaintById, updateComplaint } from '../controllers/adminComplaintsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes mapped to /api/admins/complaints
router.use(protect); // Ensure admin/superadmin

router.route('/')
  .get(getComplaints);

router.route('/:id')
  .get(getComplaintById)
  .put(updateComplaint);

export default router;
