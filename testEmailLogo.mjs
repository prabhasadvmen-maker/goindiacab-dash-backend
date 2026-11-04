import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const logoUrl = process.env.EMAIL_LOGO_URL;
const html = `
<div style="background:#0B2A5B;padding:20px;text-align:center;">
  <img src="${logoUrl}" alt="GoIndiaCab" width="150" style="display:block;margin:0 auto;background:#fff;border-radius:8px;padding:6px 8px;" />
</div>
<div style="padding:24px;font-family:sans-serif;">
  <h2>Test Email with Logo</h2>
  <p>Logo is now showing in emails from GoIndiaCab!</p>
</div>`;

const res = await axios.post('https://api.brevo.com/v3/smtp/email', {
  sender: { name: process.env.BREVO_FROM_NAME, email: process.env.BREVO_FROM_EMAIL },
  to: [{ email: 'anilkumarsingh43425@gmail.com', name: 'Anil Kumar Singh' }],
  subject: 'GoIndiaCab - Logo Test Email',
  htmlContent: html,
}, { headers: { 'api-key': process.env.BREVO_API_KEY } });

console.log('SUCCESS:', JSON.stringify(res.data));
