import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import Partner from './models/Partner.js';
import jwt from 'jsonwebtoken';

await connectDB();
const p = await Partner.findOne({ phone: '9911225010' });
if (!p) { console.log('PARTNER_NOT_FOUND'); process.exit(1); }
const token = jwt.sign({ id: p._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
console.log('TOKEN=' + token);
process.exit(0);
