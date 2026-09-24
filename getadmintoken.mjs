import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/db.js';
import SuperAdmin from './models/SuperAdmin.js';
import jwt from 'jsonwebtoken';

await connectDB();
const admin = await SuperAdmin.findOne({});
if (!admin) { console.log('NO_SUPERADMIN'); process.exit(1); }
const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
console.log('ADMIN_TOKEN=' + token);
process.exit(0);
