import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientModel: {
      type: String,
      required: true,
      enum: ['Partner', 'User', 'Admin', 'SuperAdmin'],
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipientModel',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['INFO', 'ALERT', 'SUCCESS', 'WARNING'],
      default: 'INFO',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
