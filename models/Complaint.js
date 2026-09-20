import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
    },
    raisedByModel: {
      type: String,
      required: true,
      enum: ['User', 'Partner'], // Identifies whether it's a User or a Partner
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'raisedByModel',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null, // Optional if the complaint is not related to a specific ride
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    adminRemarks: {
      type: String,
      default: '', // Notes left by the admin resolving it
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'resolvedByModel',
      default: null,
    },
    resolvedByModel: {
      type: String,
      enum: ['Admin', 'SuperAdmin'],
      default: null,
    }
  },
  { timestamps: true }
);

// Pre-save hook to generate unique complaint ID
complaintSchema.pre('validate', function (next) {
  if (!this.complaintId) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.complaintId = `CMP-${randomNum}`;
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
