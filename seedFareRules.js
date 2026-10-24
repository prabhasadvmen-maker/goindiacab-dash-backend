import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WebFareRule from './models/WebFareRule.js';

dotenv.config();

const FARE_RULES = [
  {
    vehicleType: 'hatchback',
    name: 'Hatchback',
    model: 'WagonR, Swift or similar',
    seats: 4,
    imageUrl: '',
    perKmOneway: 11,
    perKmRound: 10,
    minKmOneway: 300,
    minKmPerDay: 250,
    driverAllowance: 300,
    driverAllowancePerDay: 300,
    gstPercent: 5,
    sortOrder: 1,
    packages: [
      { label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 1400, extraKmRate: 14, extraHourRate: 150 },
      { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 2200, extraKmRate: 14, extraHourRate: 150 },
      { label: '12 Hrs / 120 Km', hours: 12, km: 120, price: 3000, extraKmRate: 14, extraHourRate: 150 },
    ],
  },
  {
    vehicleType: 'sedan',
    name: 'Sedan',
    model: 'Dzire, Etios or similar',
    seats: 4,
    imageUrl: '',
    perKmOneway: 13,
    perKmRound: 12,
    minKmOneway: 300,
    minKmPerDay: 250,
    driverAllowance: 300,
    driverAllowancePerDay: 300,
    gstPercent: 5,
    sortOrder: 2,
    packages: [
      { label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 1600, extraKmRate: 16, extraHourRate: 175 },
      { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 2600, extraKmRate: 16, extraHourRate: 175 },
      { label: '12 Hrs / 120 Km', hours: 12, km: 120, price: 3500, extraKmRate: 16, extraHourRate: 175 },
    ],
  },
  {
    vehicleType: 'suv',
    name: 'SUV',
    model: 'Ertiga, Innova or similar',
    seats: 6,
    imageUrl: '',
    perKmOneway: 16,
    perKmRound: 15,
    minKmOneway: 300,
    minKmPerDay: 250,
    driverAllowance: 400,
    driverAllowancePerDay: 400,
    gstPercent: 5,
    sortOrder: 3,
    packages: [
      { label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 2000, extraKmRate: 18, extraHourRate: 200 },
      { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 3200, extraKmRate: 18, extraHourRate: 200 },
      { label: '12 Hrs / 120 Km', hours: 12, km: 120, price: 4200, extraKmRate: 18, extraHourRate: 200 },
    ],
  },
  {
    vehicleType: 'innova',
    name: 'Premium SUV',
    model: 'Innova Crysta',
    seats: 7,
    imageUrl: '',
    perKmOneway: 18,
    perKmRound: 17,
    minKmOneway: 300,
    minKmPerDay: 250,
    driverAllowance: 400,
    driverAllowancePerDay: 400,
    gstPercent: 5,
    sortOrder: 4,
    packages: [
      { label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 2400, extraKmRate: 20, extraHourRate: 225 },
      { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 3800, extraKmRate: 20, extraHourRate: 225 },
      { label: '12 Hrs / 120 Km', hours: 12, km: 120, price: 5000, extraKmRate: 20, extraHourRate: 225 },
    ],
  },
  {
    vehicleType: 'tempo9',
    name: 'Tempo Traveller',
    model: '9 Seater Tempo',
    seats: 9,
    imageUrl: '',
    perKmOneway: 22,
    perKmRound: 20,
    minKmOneway: 300,
    minKmPerDay: 250,
    driverAllowance: 500,
    driverAllowancePerDay: 500,
    gstPercent: 5,
    sortOrder: 5,
    packages: [
      { label: '4 Hrs / 40 Km', hours: 4, km: 40, price: 3000, extraKmRate: 24, extraHourRate: 275 },
      { label: '8 Hrs / 80 Km', hours: 8, km: 80, price: 4800, extraKmRate: 24, extraHourRate: 275 },
      { label: '12 Hrs / 120 Km', hours: 12, km: 120, price: 6200, extraKmRate: 24, extraHourRate: 275 },
    ],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let upserted = 0;
  for (const rule of FARE_RULES) {
    await WebFareRule.updateOne(
      { vehicleType: rule.vehicleType },
      { $set: rule },
      { upsert: true }
    );
    upserted++;
    console.log(`✓ ${rule.name} (${rule.vehicleType})`);
  }

  console.log(`\nDone: ${upserted} fare rules seeded`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
