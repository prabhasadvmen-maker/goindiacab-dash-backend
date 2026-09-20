import mongoose from 'mongoose';

const vehicleCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // e.g., 'Mini', 'Sedan', 'SUV'
  },
  baseFare: {
    type: Number,
    required: true,
  },
  perKmRate: {
    type: Number,
    required: true,
  },
  capacity: {
    type: Number,
    required: true, // e.g., 4, 6
  },
  imageUrl: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

const VehicleCategory = mongoose.model('VehicleCategory', vehicleCategorySchema);
export default VehicleCategory;
