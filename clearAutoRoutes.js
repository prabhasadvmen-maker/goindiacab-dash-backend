import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WebRoute from './models/WebRoute.js';

dotenv.config();

// Deletes routes cached from Google (source: 'auto'); admin-entered routes are never touched.
// Usage: node clearAutoRoutes.js          -> dry run, only counts
//        node clearAutoRoutes.js --yes    -> actually deletes
const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Database: ${mongoose.connection.name}`);

  const auto = await WebRoute.countDocuments({ source: 'auto' });
  const admin = await WebRoute.countDocuments({ source: { $ne: 'auto' } });
  console.log(`auto (cached) routes: ${auto}, admin routes (kept): ${admin}`);

  if (!process.argv.includes('--yes')) {
    console.log('Dry run. Re-run with --yes to delete the auto routes.');
  } else {
    const { deletedCount } = await WebRoute.deleteMany({ source: 'auto' });
    console.log(`Deleted ${deletedCount} auto routes.`);
  }
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
