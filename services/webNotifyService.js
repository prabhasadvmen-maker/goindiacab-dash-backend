import axios from './httpClient.js';

// Transactional email via Brevo when EMAIL_ENABLED=true and BREVO_API_KEY + BREVO_FROM_EMAIL are set.
// SMS has no provider wired for transactional messages yet (APITxT is OTP-only), so smsSent is always false.
//
// Optional env: APP_NAME, WEBSITE_URL (adds a "View booking" button), SUPPORT_EMAIL, SUPPORT_PHONE.

const NAVY = '#0B2A5B';
const ORANGE = '#FF6600';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const SOFT = '#F8FAFC';

const brand = () => process.env.APP_NAME || 'GoIndiaCab';
const emailReady = () =>
  String(process.env.EMAIL_ENABLED).toLowerCase() === 'true' &&
  !!process.env.BREVO_API_KEY &&
  !!process.env.BREVO_FROM_EMAIL;

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const IST = { timeZone: 'Asia/Kolkata' };
const fmtStamp = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { ...IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '';
const fmtPickup = (date, time) => {
  const d = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(d.getTime())) return `${date} ${time}`;
  return d.toLocaleString('en-IN', { ...IST, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const TRIP_LABEL = { oneway: 'One-way Trip', roundtrip: 'Round Trip', local: 'Local Rental', airport: 'Airport Transfer' };

const STATUS_COPY = {
  confirmed: { label: 'Confirmed', color: '#2563EB', title: 'Your booking is confirmed', text: 'We have confirmed your booking. Driver details will be shared with you before pickup.' },
  assigned: { label: 'Driver Assigned', color: '#4F46E5', title: 'A driver has been assigned', text: 'A driver has been assigned to your trip. Please keep your phone reachable around pickup time.' },
  in_progress: { label: 'Trip In Progress', color: '#D97706', title: 'Your trip has started', text: 'Your trip is now in progress. Have a safe and comfortable journey!' },
  completed: { label: 'Trip Completed', color: '#16A34A', title: 'Your trip is completed', text: 'Thank you for travelling with us. We hope you had a great ride and look forward to serving you again.' },
  cancelled: { label: 'Cancelled', color: '#DC2626', title: 'Your booking has been cancelled', text: 'Your booking has been cancelled. If you did not request this or have any payment-related questions, please contact our support team.' },
};

// ───────── building blocks (table layout + inline styles: the only thing mail clients render reliably) ─────────

const kv = (label, value, { bold = false, color = INK } = {}) => `
  <tr>
    <td style="padding:7px 0;font-size:13px;color:${MUTED};vertical-align:top;">${label}</td>
    <td style="padding:7px 0;font-size:13px;color:${color};text-align:right;vertical-align:top;${bold ? 'font-weight:700;' : 'font-weight:600;'}">${value}</td>
  </tr>`;

const section = (title, rows) => `
  <tr><td style="padding:22px 28px 0;">
    <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${NAVY};padding-bottom:8px;border-bottom:2px solid ${ORANGE};">${title}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">${rows}</table>
  </td></tr>`;

const route = (trip) => {
  const to = trip.to ? esc(trip.to) : 'Local';
  return `${esc(trip.from)}${trip.stop ? ` &rarr; ${esc(trip.stop)}` : ''} &rarr; ${to}`;
};

const tripRows = (booking) => {
  const { trip, vehicle } = booking;
  const rows = [
    kv('Trip type', esc(trip.tripType === 'airport' && trip.airportDir
      ? `Airport ${trip.airportDir === 'from' ? 'Pickup' : 'Drop'}`
      : TRIP_LABEL[trip.tripType] || trip.tripType)),
    kv('Pickup', esc(trip.from)),
  ];
  if (trip.stop) rows.push(kv('Stop', esc(trip.stop)));
  if (trip.to) rows.push(kv('Drop', esc(trip.to)));
  rows.push(kv('Pickup date &amp; time', esc(fmtPickup(trip.date, trip.time))));
  if (trip.tripType === 'local' && trip.package) rows.push(kv('Package', esc(trip.package)));
  if (trip.tripType === 'roundtrip' && trip.days > 1) rows.push(kv('Days', esc(trip.days)));
  if (trip.distanceKm > 0 && trip.tripType !== 'local') rows.push(kv('Distance', `${esc(trip.distanceKm)} km`));
  rows.push(kv('Cab', esc([vehicle.name, vehicle.model].filter(Boolean).join(' · '))));
  return rows.join('');
};

const passengerRows = (booking) => {
  const { passenger } = booking;
  const rows = [
    kv('Name', esc(passenger.name)),
    kv('Mobile', `+91 ${esc(passenger.mobile)}`),
    kv('Pickup address', esc(passenger.pickupAddress)),
  ];
  if (passenger.dropAddress) rows.push(kv('Drop address', esc(passenger.dropAddress)));
  if (passenger.instructions) rows.push(kv('Instructions', esc(passenger.instructions)));
  return rows.join('');
};

const bookingUrl = (booking) => {
  const base = String(process.env.WEBSITE_URL || '').replace(/\/+$/, '');
  return base ? `${base}/booking/${encodeURIComponent(booking.bookingId)}` : '';
};

const button = (url, label) =>
  url
    ? `<tr><td align="center" style="padding:26px 28px 4px;">
        <a href="${esc(url)}" style="display:inline-block;background:${ORANGE};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;">${label}</a>
      </td></tr>`
    : '';

const supportLine = () => {
  const email = process.env.SUPPORT_EMAIL || process.env.BREVO_FROM_EMAIL;
  const bits = [];
  if (process.env.SUPPORT_PHONE) bits.push(esc(process.env.SUPPORT_PHONE));
  if (email) bits.push(`<a href="mailto:${esc(email)}" style="color:${NAVY};text-decoration:none;">${esc(email)}</a>`);
  return bits.length ? `Need help? Contact us at ${bits.join(' &nbsp;|&nbsp; ')}` : '';
};

const layout = ({ preheader, badge, badgeColor, title, subtitle, body }) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#EEF2F7;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE};">
    <tr><td style="background:${NAVY};padding:22px 28px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.3px;">${esc(brand())}</td>
        <td align="right"><span style="display:inline-block;background:${badgeColor};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:5px 12px;border-radius:999px;">${esc(badge)}</span></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 28px 0;">
      <div style="font-size:21px;font-weight:800;color:${INK};line-height:1.3;">${title}</div>
      <div style="font-size:14px;color:${MUTED};margin-top:8px;line-height:1.6;">${subtitle}</div>
    </td></tr>
    ${body}
    <tr><td style="padding:28px;">
      <div style="border-top:1px solid ${LINE};padding-top:18px;font-size:12px;color:${MUTED};line-height:1.7;text-align:center;">
        ${supportLine()}<br/>
        This is an automated email from ${esc(brand())}. Please keep your Booking ID handy for any queries.
      </div>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

// ───────── receipt (sent once, after payment is verified) ─────────

const receiptHtml = (booking) => {
  const { fare, payment, passenger } = booking;
  const addons = (fare.addons || []).filter((a) => a && Number(a.price) > 0);
  const subtotal = Number(fare.total || 0) + Number(fare.discount || 0);

  const fareRows = [
    kv('Base fare', inr(fare.baseFare)),
    fare.extraKmFare > 0 ? kv('Extra km charges', inr(fare.extraKmFare)) : '',
    fare.driverAllowance > 0 ? kv('Driver allowance', inr(fare.driverAllowance)) : '',
    ...addons.map((a) => kv(esc(a.label || 'Add-on'), inr(a.price))),
    fare.gst > 0 ? kv('GST', inr(fare.gst)) : '',
    fare.discount > 0 ? kv('Subtotal', inr(subtotal)) : '',
    fare.discount > 0 ? kv(`Coupon discount${fare.couponCode ? ` (${esc(fare.couponCode)})` : ''}`, `- ${inr(fare.discount)}`, { color: '#16A34A', bold: true }) : '',
  ].join('');

  const totals = `
    <tr><td style="padding:22px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SOFT};border:1px solid ${LINE};border-radius:10px;">
        <tr><td style="padding:14px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${kv('Total fare', inr(fare.total), { bold: true })}
            ${kv('Paid online', inr(payment.paidAmount || fare.paidNow), { bold: true, color: '#16A34A' })}
            ${fare.payLater > 0 ? kv('Balance to pay to driver', inr(fare.payLater), { bold: true, color: ORANGE }) : kv('Balance due', inr(0), { bold: true })}
          </table>
        </td></tr>
      </table>
    </td></tr>`;

  const paymentRows = [
    kv('Status', '<span style="color:#16A34A;">Paid</span>'),
    payment.paidAt ? kv('Paid on', esc(fmtStamp(payment.paidAt))) : '',
    payment.paymentId ? kv('Payment ID', esc(payment.paymentId)) : '',
    kv('Method', 'Online (Razorpay)'),
    kv('Payment option', fare.paymentOption === 'full' ? 'Full payment' : 'Part payment'),
  ].join('');

  const body = `
    ${section('Booking details', kv('Booking ID', `<span style="font-family:Consolas,Menlo,monospace;color:${NAVY};">${esc(booking.bookingId)}</span>`, { bold: true }) + kv('Booked on', esc(fmtStamp(booking.createdAt))))}
    ${section('Trip details', tripRows(booking))}
    ${section('Passenger', passengerRows(booking))}
    ${section('Fare summary', fareRows)}
    ${totals}
    ${section('Payment', paymentRows)}
    ${button(bookingUrl(booking), 'View Booking')}`;

  return layout({
    preheader: `Payment of ${inr(payment.paidAmount || fare.paidNow)} received. Booking ${booking.bookingId} is confirmed.`,
    badge: 'Receipt',
    badgeColor: '#16A34A',
    title: `Booking confirmed, ${esc(passenger.name)}!`,
    subtitle: `We have received your payment and your cab is booked. Here is your receipt for <b style="color:${INK};">${route(booking.trip)}</b>.`,
    body,
  });
};

// ───────── status update (sent whenever the admin changes the booking status) ─────────

const driverRows = (booking) => {
  const p = booking.assignedPartner;
  if (!p || typeof p !== 'object' || !p.name) return '';
  return section('Your driver', [
    kv('Name', esc(p.name)),
    p.phone ? kv('Phone', esc(p.phone)) : '',
    p.vehicleNumber ? kv('Vehicle number', esc(p.vehicleNumber)) : '',
  ].join(''));
};

const statusHtml = (booking) => {
  const copy = STATUS_COPY[booking.status] || { label: booking.status, color: NAVY, title: 'Booking update', text: `Your booking status is now ${booking.status}.` };
  const { fare, trip, vehicle } = booking;

  const summary = [
    kv('Booking ID', `<span style="font-family:Consolas,Menlo,monospace;color:${NAVY};">${esc(booking.bookingId)}</span>`, { bold: true }),
    kv('Status', `<span style="color:${copy.color};">${esc(copy.label)}</span>`, { bold: true }),
    kv('Route', route(trip)),
    kv('Pickup date &amp; time', esc(fmtPickup(trip.date, trip.time))),
    kv('Cab', esc([vehicle.name, vehicle.model].filter(Boolean).join(' · '))),
  ].join('');

  const amountRows = [
    kv('Total fare', inr(fare.total)),
    kv('Paid online', inr(booking.payment?.status === 'paid' ? booking.payment.paidAmount || fare.paidNow : 0)),
    booking.status !== 'cancelled' && fare.payLater > 0 ? kv('Balance to pay to driver', inr(fare.payLater), { bold: true, color: ORANGE }) : '',
  ].join('');

  const reason = booking.status === 'cancelled' && booking.cancelReason
    ? section('Reason', `<tr><td style="padding:8px 0;font-size:13px;color:${INK};line-height:1.6;">${esc(booking.cancelReason)}</td></tr>`)
    : '';

  const body = `
    ${section('Booking summary', summary)}
    ${booking.status === 'assigned' ? driverRows(booking) : ''}
    ${reason}
    ${section('Fare', amountRows)}
    ${button(bookingUrl(booking), 'View Booking')}`;

  return {
    subject: `${copy.title} - ${booking.bookingId}`,
    html: layout({
      preheader: `${copy.title}. Booking ${booking.bookingId}.`,
      badge: copy.label,
      badgeColor: copy.color,
      title: `${copy.title}`,
      subtitle: `Hi ${esc(booking.passenger.name)}, ${esc(copy.text)}`,
      body,
    }),
  };
};

// ───────── sending ─────────

const sendMail = async ({ to, name, subject, html }) => {
  try {
    const supportEmail = process.env.SUPPORT_EMAIL;
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: process.env.BREVO_FROM_NAME || brand(), email: process.env.BREVO_FROM_EMAIL },
        to: [{ email: to, name }],
        ...(supportEmail ? { replyTo: { email: supportEmail } } : {}),
        subject,
        htmlContent: html,
      },
      { headers: { 'api-key': process.env.BREVO_API_KEY }, timeout: 10000 }
    );
    return true;
  } catch (err) {
    console.error('Booking email failed:', err.response?.data || err.message);
    return false;
  }
};

// Receipt after a verified payment. Return shape is stored on booking.notification.
export const sendBookingConfirmation = async (booking) => {
  const result = { emailSent: false, smsSent: false };
  if (!emailReady() || !booking.passenger.email) return result;
  result.emailSent = await sendMail({
    to: booking.passenger.email,
    name: booking.passenger.name,
    subject: `Booking confirmed & payment receipt - ${booking.bookingId}`,
    html: receiptHtml(booking),
  });
  return result;
};

// Status-change mail. `booking.assignedPartner` should be populated for the driver block.
export const sendStatusUpdate = async (booking) => {
  if (!booking.passenger.email) return { emailSent: false, skipped: 'no_email' };
  if (!emailReady()) return { emailSent: false, skipped: 'email_disabled' };
  const { subject, html } = statusHtml(booking);
  const emailSent = await sendMail({ to: booking.passenger.email, name: booking.passenger.name, subject, html });
  return { emailSent, skipped: emailSent ? undefined : 'send_failed' };
};

// Exposed for previews / tests.
export const renderReceiptHtml = receiptHtml;
export const renderStatusHtml = statusHtml;
