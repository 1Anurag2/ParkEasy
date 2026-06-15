import express from 'express';
import Spot from '../models/Spot.js';
import Booking from '../models/Booking.js';
import Subscription from '../models/Subscription.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to check auth and role
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

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};

// Get all spots (includes booking status)
router.get('/', async (req, res) => {
  try {
    const spots = await Spot.find();
    const activeBookings = await Booking.find({ status: 'active' });
    const activeSubs = await Subscription.find({ status: 'active', assignedSpot: { $exists: true, $ne: null } });
    
    const bookedSpotIds = [
      ...activeBookings.map(b => b.spot.toString()),
      ...activeSubs.map(s => s.assignedSpot.toString())
    ];

    const spotsWithStatus = spots.map(spot => {
      const spotObj = spot.toObject();
      spotObj.isBooked = bookedSpotIds.includes(spotObj._id.toString());
      return spotObj;
    });

    res.json(spotsWithStatus);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Create spot (Admin)
router.post('/', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const newSpot = new Spot(req.body);
    const spot = await newSpot.save();
    res.json(spot);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Update spot (Admin)
router.put('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const spot = await Spot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(spot);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Delete spot (Admin)
router.delete('/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    await Spot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Spot removed' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

export default router;
