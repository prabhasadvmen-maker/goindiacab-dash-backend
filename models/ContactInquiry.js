import mongoose from 'mongoose';

export const CONTACT_SUBJECTS = ['General Inquiry', 'Booking Help', 'Complaint', 'Partnership', 'Other'];
export const SERVICE_TYPES = ['Outstation Trip', 'Local Rental', 'Airport Transfer', 'Corporate / Monthly', 'Wedding / Event', 'Other'];
export const CONTACT_STATUSES = ['new', 'read', 'replied', 'closed'];

const replySchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    sentBy: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const contactInquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, match: [/^\d{10}$/, 'Phone must be 10 digits'] },
    email: { type: String, trim: true, lowercase: true, default: '' },
    subject: { type: String, required: true, enum: CONTACT_SUBJECTS },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    // Optional trip details (lead capture, e.g. from Google Ads traffic)
    serviceType: { type: String, enum: ['', ...SERVICE_TYPES], default: '' },
    pickupLocation: { type: String, trim: true, default: '', maxlength: 200 },
    dropLocation: { type: String, trim: true, default: '', maxlength: 200 },
    travelDate: { type: String, trim: true, default: '', match: [/^(\d{4}-\d{2}-\d{2})?$/, 'Invalid date'] },
    passengers: { type: Number, min: 1, max: 50 },
    status: { type: String, enum: CONTACT_STATUSES, default: 'new' },
    replies: { type: [replySchema], default: [] }, // emailed replies sent by the superadmin
    adminNote: { type: String, trim: true, default: '', maxlength: 2000 },
  },
  { timestamps: true }
);

contactInquirySchema.index({ createdAt: -1 });
contactInquirySchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ContactInquiry', contactInquirySchema);
