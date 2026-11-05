import ContactInquiry, { CONTACT_SUBJECTS, SERVICE_TYPES } from '../models/ContactInquiry.js';
import { sendContactInquiryNotification } from '../services/webNotifyService.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact (public)
export const submitContactInquiry = async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    const email = String(body.email || '').trim().toLowerCase();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();

    if (!name) return res.status(400).json({ success: false, message: 'Please enter your name.' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit phone number.' });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    if (!CONTACT_SUBJECTS.includes(subject)) return res.status(400).json({ success: false, message: 'Please select a subject.' });
    if (message.length < 10) return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
    if (message.length > 2000 || name.length > 100) return res.status(400).json({ success: false, message: 'Your message is too long.' });

    const serviceType = String(body.serviceType || '').trim();
    const pickupLocation = String(body.pickupLocation || '').trim().slice(0, 200);
    const dropLocation = String(body.dropLocation || '').trim().slice(0, 200);
    const travelDate = String(body.travelDate || '').trim();
    const passengers = body.passengers === undefined || body.passengers === '' ? undefined : parseInt(body.passengers, 10);

    if (serviceType && !SERVICE_TYPES.includes(serviceType)) return res.status(400).json({ success: false, message: 'Invalid service type.' });
    if (travelDate && !/^\d{4}-\d{2}-\d{2}$/.test(travelDate)) return res.status(400).json({ success: false, message: 'Please enter a valid travel date.' });
    if (passengers !== undefined && !(passengers >= 1 && passengers <= 50)) return res.status(400).json({ success: false, message: 'Passengers must be between 1 and 50.' });

    const inquiry = await ContactInquiry.create({ name, phone, email, subject, message, serviceType, pickupLocation, dropLocation, travelDate, passengers });

    // Fire-and-forget: a mail failure must not fail the submission (the inquiry is already saved).
    sendContactInquiryNotification(inquiry).catch((err) => console.error('Contact notification failed:', err.message));

    res.status(201).json({ success: true, message: 'Thank you! Your message has been received. Our team will get back to you shortly.' });
  } catch (error) {
    console.error('Contact inquiry error:', error);
    res.status(500).json({ success: false, message: 'Could not send your message. Please try again later.' });
  }
};
