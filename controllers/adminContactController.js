import mongoose from 'mongoose';
import ContactInquiry, { CONTACT_STATUSES } from '../models/ContactInquiry.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const statsOf = async () => {
  const rows = await ContactInquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const stats = { total: 0, new: 0, read: 0, replied: 0, closed: 0 };
  rows.forEach((r) => { if (r._id in stats) stats[r._id] = r.count; stats.total += r.count; });
  return stats;
};

// GET /api/admin/contacts?status=&search=&page=&limit=
export const listContacts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const { status, search } = req.query;

    const filter = {};
    if (status && CONTACT_STATUSES.includes(status)) filter.status = status;
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
    }

    const [data, total, stats] = await Promise.all([
      ContactInquiry.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ContactInquiry.countDocuments(filter),
      statsOf(),
    ]);

    res.json({ success: true, data, stats, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error('List contacts error:', error);
    res.status(500).json({ success: false, message: 'Failed to load inquiries' });
  }
};

// GET /api/admin/contacts/:id  (marks a "new" inquiry as "read")
export const getContact = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    let inquiry = await ContactInquiry.findOneAndUpdate(
      { _id: req.params.id, status: 'new' },
      { status: 'read' },
      { new: true }
    );
    if (!inquiry) inquiry = await ContactInquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, message: 'Failed to load inquiry' });
  }
};

// PATCH /api/admin/contacts/:id  { status?, adminNote? }
export const updateContact = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    const { status, adminNote } = req.body || {};
    const update = {};
    if (status !== undefined) {
      if (!CONTACT_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
      update.status = status;
    }
    if (adminNote !== undefined) {
      if (String(adminNote).length > 2000) return res.status(400).json({ success: false, message: 'Note is too long' });
      update.adminNote = String(adminNote).trim();
    }
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    const inquiry = await ContactInquiry.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, message: 'Inquiry updated', data: inquiry });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, message: 'Failed to update inquiry' });
  }
};

// DELETE /api/admin/contacts/:id
export const deleteContact = async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    const inquiry = await ContactInquiry.findByIdAndDelete(req.params.id);
    if (!inquiry) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, message: 'Inquiry deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete inquiry' });
  }
};
