import express from 'express';
import Complaint from '../models/Complaint.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Create complaint
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const complaint = new Complaint({
      user: req.user.id,
      title,
      description
    });
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get user complaints
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Admin: Get all complaints
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
    const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Admin: Resolve complaint
router.put('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
    const { adminReply } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status: 'resolved', adminReply }, { new: true });
    res.json(complaint);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

export default router;
