import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { listContacts, getContact, updateContact, deleteContact, replyToContact } from '../controllers/adminContactController.js';

const router = express.Router();
router.use(protect);
// SuperAdmin only (protect also lets plain Admins through).
router.use((req, res, next) => {
  if (req.superadmin?.role !== 'SuperAdmin') return res.status(403).json({ success: false, message: 'SuperAdmin access required' });
  next();
});

// Mounted at /api/admin/contacts
router.get('/', listContacts);
router.post('/:id/reply', replyToContact);
router.route('/:id').get(getContact).patch(updateContact).delete(deleteContact);

export default router;
