import Complaint from '../models/Complaint.js';
import handleAsyncError from '../middleware/handleAsyncError.js';

// Create complaint
export const createComplaint = handleAsyncError(async (req, res, next) => {
  const { title, description } = req.body;
  const complaint = new Complaint({ user: req.user.id, title, description });
  await complaint.save();
  res.json(complaint);
});

// Get user complaints
export const getMyComplaints = handleAsyncError(async (req, res, next) => {
  const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(complaints);
});

// Admin: Get all complaints
export const getAllComplaints = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
  const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.json(complaints);
});

// Admin: Resolve complaint
export const resolveComplaint = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
  const { adminReply } = req.body;
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status: 'resolved', adminReply }, { new: true });
  res.json(complaint);
});
