import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planType: { type: String, enum: ['monthly', 'yearly'], required: true },
  vehicleNumber: { type: String, required: true },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  autoRenew: { type: Boolean, default: false },
  assignedSpot: { type: mongoose.Schema.Types.ObjectId, ref: 'Spot' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  razorpayPaymentId: { type: String },
  razorpayOrderId: { type: String }
}, { timestamps: true });

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
