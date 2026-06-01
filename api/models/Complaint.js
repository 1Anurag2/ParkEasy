import mongoose from 'mongoose';

const ComplaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in-progress', 'resolved'], default: 'open' },
  adminReply: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.models.Complaint || mongoose.model('Complaint', ComplaintSchema);
