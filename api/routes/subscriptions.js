import express from 'express';
import Subscription from '../models/Subscription.js';
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

// Create a new subscription
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { planType, vehicleNumber, autoRenew } = req.body;
    
    const startDate = new Date();
    const endDate = new Date();
    if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const sub = new Subscription({
      user: req.user.id,
      planType,
      vehicleNumber,
      startDate,
      endDate,
      autoRenew
    });

    await sub.save();
    res.json(sub);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Get user subscriptions
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const subs = await Subscription.find({ user: req.user.id }).populate('assignedSpot');
    res.json(subs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Admin: Get all subscriptions
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
    const subs = await Subscription.find().populate('user', 'name email').populate('assignedSpot').sort({ createdAt: -1 });
    res.json(subs);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Admin: Assign spot to subscription
router.put('/:id/assign', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
    const { spotId } = req.body;
    const sub = await Subscription.findByIdAndUpdate(req.params.id, { assignedSpot: spotId }, { new: true }).populate('user', 'name email').populate('assignedSpot');
    res.json(sub);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

export default router;
