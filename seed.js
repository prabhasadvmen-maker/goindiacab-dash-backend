import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SuperAdmin from './models/SuperAdmin.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI missing in .env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    const email = 'superadmin@goindiacab.com';
    const plainPassword = 'superadmin@9090';

    // Check if SuperAdmin already exists
    const existingAdmin = await SuperAdmin.findOne({ email });
    if (existingAdmin) {
      console.log(`SuperAdmin with email "${email}" already exists.`);
      existingAdmin.password = plainPassword;
      await existingAdmin.save();
      console.log('SuperAdmin password updated successfully.');
    } else {
      await SuperAdmin.create({ email, password: plainPassword });
      console.log(`SuperAdmin seeded successfully!`);
      console.log(`Email: ${email}`);
      console.log(`Password: ${plainPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding SuperAdmin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
