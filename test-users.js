import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import SuperAdmin from './models/SuperAdmin.js';

dotenv.config();

const testUsers = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const superadmin = await SuperAdmin.findOne();
  if (!superadmin) {
    console.log('No superadmin found');
    process.exit(1);
  }

  const token = jwt.sign({ id: superadmin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('Token generated for:', superadmin.email);
  
  try {
    const res = await fetch('http://localhost:5000/api/admins/profile');
    console.log('GET /api/admins/profile Without Token Status:', res.status);
    
    const resAuth = await fetch('http://localhost:5000/api/admins/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('GET /api/admins/users With Token Status:', resAuth.status);
    const text = await resAuth.text();
    console.log('Response body:', text.substring(0, 200) + '...');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
};

testUsers();
