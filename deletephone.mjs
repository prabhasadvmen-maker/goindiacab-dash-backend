import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const PHONE = '8830448351';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;

const collections = await db.listCollections().toArray();
console.log('All collections:', collections.map(c => c.name).join(', '));

for (const col of collections) {
  const result = await db.collection(col.name).find({ phone: PHONE }).toArray();
  if (result.length > 0) {
    console.log(`\nFound in [${col.name}]:`, JSON.stringify(result, null, 2));
    const del = await db.collection(col.name).deleteMany({ phone: PHONE });
    console.log(`Deleted ${del.deletedCount} from [${col.name}]`);
  }
}

console.log('\nDone.');
await mongoose.disconnect();
