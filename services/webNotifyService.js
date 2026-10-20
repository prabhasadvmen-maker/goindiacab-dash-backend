import axios from 'axios';

// Email via Brevo when EMAIL_ENABLED=true and BREVO_API_KEY is set. SMS has no provider wired for
// transactional messages yet (APITxT is OTP-only), so smsSent is always false for now.
export const sendBookingConfirmation = async (booking) => {
  const result = { emailSent: false, smsSent: false };
  const enabled = String(process.env.EMAIL_ENABLED).toLowerCase() === 'true';
  if (!enabled || !process.env.BREVO_API_KEY || !booking.passenger.email) return result;

  const { passenger, trip, fare } = booking;
  const html = `
    <h2>Booking Confirmed - ${booking.bookingId}</h2>
    <p>Hi ${passenger.name}, your cab booking is confirmed.</p>
    <p><b>Trip:</b> ${trip.from}${trip.to ? ' → ' + trip.to : ''}<br/>
    <b>Date:</b> ${trip.date} ${trip.time}<br/>
    <b>Total fare:</b> ₹${fare.total}<br/>
    <b>Paid now:</b> ₹${fare.paidNow} &nbsp; <b>Pay later:</b> ₹${fare.payLater}</p>
    <p>- ${process.env.APP_NAME || 'GoIndiaCab'}</p>`;

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: process.env.BREVO_FROM_NAME || 'GoIndiaCab', email: process.env.BREVO_FROM_EMAIL },
        to: [{ email: passenger.email, name: passenger.name }],
        subject: `Booking confirmed - ${booking.bookingId}`,
        htmlContent: html,
      },
      { headers: { 'api-key': process.env.BREVO_API_KEY }, timeout: 10000 }
    );
    result.emailSent = true;
  } catch (err) {
    console.error('Booking email failed:', err.response?.data || err.message);
  }
  return result;
};
