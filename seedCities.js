import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WebCity from './models/WebCity.js';

dotenv.config();

const CITIES = [
  // A
  { name: 'Agra', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Ajmer', state: 'Rajasthan' },
  { name: 'Aligarh', state: 'Uttar Pradesh' },
  { name: 'Almora', state: 'Uttarakhand' },
  { name: 'Amritsar', state: 'Punjab', isPopular: true },
  { name: 'Ayodhya', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Ambala', state: 'Haryana' },
  { name: 'Anandpur Sahib', state: 'Punjab' },
  { name: 'Abu Road', state: 'Rajasthan' },
  // B
  { name: 'Bahadurgarh', state: 'Haryana' },
  { name: 'Bareilly', state: 'Uttar Pradesh' },
  { name: 'Bharatpur', state: 'Rajasthan' },
  { name: 'Bhimtal', state: 'Uttarakhand' },
  { name: 'Bhiwani', state: 'Haryana' },
  { name: 'Bikaner', state: 'Rajasthan' },
  { name: 'Bilaspur', state: 'Himachal Pradesh' },
  { name: 'Bulandshahr', state: 'Uttar Pradesh' },
  { name: 'Budaun', state: 'Uttar Pradesh' },
  // C
  { name: 'Chandigarh', state: 'Chandigarh', isPopular: true },
  { name: 'Chamba', state: 'Himachal Pradesh' },
  { name: 'Chamba', state: 'Uttarakhand' },
  { name: 'Chittorgarh', state: 'Rajasthan' },
  { name: 'Churu', state: 'Rajasthan' },
  { name: 'Corbett / Ramnagar', state: 'Uttarakhand' },
  // D
  { name: 'Delhi', state: 'Delhi', isPopular: true },
  { name: 'Dehradun', state: 'Uttarakhand', isPopular: true },
  { name: 'Dharamshala', state: 'Himachal Pradesh', isPopular: true },
  { name: 'Dhanaulti', state: 'Uttarakhand' },
  { name: 'Dausa', state: 'Rajasthan' },
  { name: 'Dholpur', state: 'Rajasthan' },
  { name: 'Dwarka', state: 'Delhi' },
  // E
  { name: 'Etah', state: 'Uttar Pradesh' },
  { name: 'Etawah', state: 'Uttar Pradesh' },
  // F
  { name: 'Faridabad', state: 'Haryana', isPopular: true },
  { name: 'Fatehpur Sikri', state: 'Uttar Pradesh' },
  { name: 'Firozabad', state: 'Uttar Pradesh' },
  { name: 'Fatehabad', state: 'Haryana' },
  // G
  { name: 'Ghaziabad', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Greater Noida', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Gurugram', state: 'Haryana', isPopular: true },
  { name: 'Ganganagar', state: 'Rajasthan' },
  { name: 'Govardhan', state: 'Uttar Pradesh' },
  { name: 'Gokul', state: 'Uttar Pradesh' },
  { name: 'Gaurikund', state: 'Uttarakhand' },
  { name: 'Gorakhpur', state: 'Uttar Pradesh' },
  // H
  { name: 'Haridwar', state: 'Uttarakhand', isPopular: true },
  { name: 'Haldwani', state: 'Uttarakhand' },
  { name: 'Hapur', state: 'Uttar Pradesh' },
  { name: 'Hisar', state: 'Haryana' },
  { name: 'Hamirpur', state: 'Himachal Pradesh' },
  { name: 'Hoshiarpur', state: 'Punjab' },
  { name: 'Hanumangarh', state: 'Rajasthan' },
  { name: 'Hathras', state: 'Uttar Pradesh' },
  // I
  { name: 'Indri', state: 'Haryana' },
  { name: 'Indergarh', state: 'Rajasthan' },
  // J
  { name: 'Jaipur', state: 'Rajasthan', isPopular: true },
  { name: 'Jalandhar', state: 'Punjab' },
  { name: 'Jammu', state: 'Jammu & Kashmir', isPopular: true },
  { name: 'Jodhpur', state: 'Rajasthan', isPopular: true },
  { name: 'Jhansi', state: 'Uttar Pradesh' },
  { name: 'Jim Corbett', state: 'Uttarakhand' },
  { name: 'Jaisalmer', state: 'Rajasthan', isPopular: true },
  { name: 'Jibhi', state: 'Himachal Pradesh' },
  { name: 'Jind', state: 'Haryana' },
  { name: 'Jhunjhunu', state: 'Rajasthan' },
  // K
  { name: 'Kanpur', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Karnal', state: 'Haryana' },
  { name: 'Kasauli', state: 'Himachal Pradesh' },
  { name: 'Kasol', state: 'Himachal Pradesh' },
  { name: 'Katra', state: 'Jammu & Kashmir' },
  { name: 'Kausani', state: 'Uttarakhand' },
  { name: 'Khatu Shyam Ji', state: 'Rajasthan' },
  { name: 'Kota', state: 'Rajasthan' },
  { name: 'Kurukshetra', state: 'Haryana' },
  { name: 'Kullu', state: 'Himachal Pradesh' },
  { name: 'Kufri', state: 'Himachal Pradesh' },
  // L
  { name: 'Lucknow', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Ludhiana', state: 'Punjab' },
  { name: 'Lansdowne', state: 'Uttarakhand' },
  { name: 'Lakhimpur', state: 'Uttar Pradesh' },
  // M
  { name: 'Manali', state: 'Himachal Pradesh', isPopular: true },
  { name: 'Mathura', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Meerut', state: 'Uttar Pradesh' },
  { name: 'Moradabad', state: 'Uttar Pradesh' },
  { name: 'Mussoorie', state: 'Uttarakhand', isPopular: true },
  { name: 'Mandi', state: 'Himachal Pradesh' },
  { name: 'Mukteshwar', state: 'Uttarakhand' },
  { name: 'Mount Abu', state: 'Rajasthan' },
  { name: 'Mahendragarh', state: 'Haryana' },
  { name: 'Mahoba', state: 'Uttar Pradesh' },
  { name: 'McLeodganj', state: 'Himachal Pradesh' },
  // N
  { name: 'Nainital', state: 'Uttarakhand', isPopular: true },
  { name: 'Noida', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Neemrana', state: 'Rajasthan' },
  { name: 'Nathdwara', state: 'Rajasthan' },
  { name: 'Nagaur', state: 'Rajasthan' },
  { name: 'Narkanda', state: 'Himachal Pradesh' },
  // O
  { name: 'Orai', state: 'Uttar Pradesh' },
  { name: 'Osian', state: 'Rajasthan' },
  // P
  { name: 'Pantnagar Airport', state: 'Uttarakhand' },
  { name: 'Panipat', state: 'Haryana' },
  { name: 'Patiala', state: 'Punjab' },
  { name: 'Pithoragarh', state: 'Uttarakhand' },
  { name: 'Pushkar', state: 'Rajasthan' },
  { name: 'Pratapgarh', state: 'Uttar Pradesh' },
  { name: 'Prayagraj', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Pilibhit', state: 'Uttar Pradesh' },
  // Q
  { name: 'Qadian', state: 'Punjab' },
  // R
  { name: 'Rishikesh', state: 'Uttarakhand', isPopular: true },
  { name: 'Roorkee', state: 'Uttarakhand' },
  { name: 'Rohtak', state: 'Haryana' },
  { name: 'Ranthambore', state: 'Rajasthan' },
  { name: 'Rajsamand', state: 'Rajasthan' },
  { name: 'Rewari', state: 'Haryana' },
  { name: 'Ranikhet', state: 'Uttarakhand' },
  { name: 'Rudrapur', state: 'Uttarakhand' },
  { name: 'Rampur', state: 'Uttar Pradesh' },
  // S
  { name: 'Shimla', state: 'Himachal Pradesh', isPopular: true },
  { name: 'Sonipat', state: 'Haryana' },
  { name: 'Saharanpur', state: 'Uttar Pradesh' },
  { name: 'Sikar', state: 'Rajasthan' },
  { name: 'Sirsa', state: 'Haryana' },
  { name: 'Solan', state: 'Himachal Pradesh' },
  { name: 'Sambhal', state: 'Uttar Pradesh' },
  { name: 'Sawai Madhopur', state: 'Rajasthan' },
  { name: 'Sitapur', state: 'Uttar Pradesh' },
  { name: 'Salasar', state: 'Rajasthan' },
  { name: 'Sattal', state: 'Uttarakhand' },
  // T
  { name: 'Taj Mahal', state: 'Agra' },
  { name: 'Tapovan', state: 'Uttarakhand' },
  { name: 'Tehri', state: 'Uttarakhand' },
  { name: 'Thanesar', state: 'Haryana' },
  { name: 'Tirthan Valley', state: 'Himachal Pradesh' },
  { name: 'Tonk', state: 'Rajasthan' },
  { name: 'Tundla', state: 'Uttar Pradesh' },
  // U
  { name: 'Udaipur', state: 'Rajasthan', isPopular: true },
  { name: 'Unnao', state: 'Uttar Pradesh' },
  // V
  { name: 'Varanasi', state: 'Uttar Pradesh', isPopular: true },
  { name: 'Vrindavan', state: 'Uttar Pradesh', isPopular: true },
  // Y
  { name: 'Yamunanagar', state: 'Haryana' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  let inserted = 0, skipped = 0;

  for (const city of CITIES) {
    try {
      await WebCity.updateOne(
        { name: { $regex: `^${city.name}$`, $options: 'i' } },
        { $setOnInsert: { ...city, isActive: true } },
        { upsert: true }
      );
      inserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`Done: ${inserted} upserted, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
