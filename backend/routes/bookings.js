import express from 'express';
import Booking from '../models/Booking.js';
import Spot from '../models/Spot.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { sendEmail } from '../utils/mailer.js';

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

// Get user's bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    let bookings;
    if (req.user.role === 'admin') {
      bookings = await Booking.find().populate('user', 'name email').populate('spot');
    } else {
      bookings = await Booking.find({ user: req.user.id }).populate('spot');
    }
    res.json(bookings);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { spotId, vehicleNumber, startTime, endTime, totalCost } = req.body;
    
    // Check if spot is already booked for these times
    const conflictingBookings = await Booking.find({
      spot: spotId,
      status: 'active',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ message: 'Spot is already booked for this time period' });
    }

    const newBooking = new Booking({
      user: req.user.id,
      spot: spotId,
      vehicleNumber,
      startTime,
      endTime,
      totalCost,
    });

    let booking = await newBooking.save();
    
    // Generate QR Code containing booking ID
    const qrDataUrl = await QRCode.toDataURL(booking._id.toString());
    booking.qrCode = qrDataUrl;
    await booking.save();

    // Broadcast real-time update
    const io = req.app.get('io');
    if (io) io.emit('spots_updated');

    // Send Notification Email
    const user = await User.findById(req.user.id);
    if (user) {
      sendEmail(user.email, "Parking Slot Booked!", `Your booking for spot ${spotId} is confirmed. Vehicle: ${vehicleNumber}. Total Cost: $${totalCost}. Use your Dashboard QR Code at the gate.`);
    }

    res.json(booking);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Cancel booking
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized' });
    }

    booking.status = 'cancelled';
    await booking.save();
    
    const io = req.app.get('io');
    if (io) io.emit('spots_updated');

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Checkout booking (Admin Verification)
router.post('/:id/checkout', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can verify exit' });
    }

    const booking = await Booking.findById(req.params.id).populate('spot');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.status !== 'active') {
      return res.status(400).json({ message: 'Booking is already completed or cancelled' });
    }

    const { actualVehicleNumber } = req.body;
    if (!actualVehicleNumber || actualVehicleNumber.toLowerCase().trim() !== booking.vehicleNumber.toLowerCase().trim()) {
      return res.status(400).json({ message: `Gate remains closed. Vehicle Number mismatch. Expected: ${booking.vehicleNumber}, Scanned: ${actualVehicleNumber || 'None'}` });
    }

    const now = new Date();
    let penalty = 0;
    let overstayHours = 0;
    
    if (now > booking.endTime) {
      const diffMs = now - booking.endTime;
      overstayHours = Math.ceil(diffMs / (1000 * 60 * 60));
      // $5 fixed penalty + normal hourly rate for the extra hours
      penalty = overstayHours * (booking.spot.pricePerHour + 5); 
    }

    booking.status = 'completed';
    const finalCost = booking.totalCost + penalty;
    
    await booking.save();

    const io = req.app.get('io');
    if (io) io.emit('spots_updated');

    if (penalty > 0) {
      const userObj = await User.findById(booking.user);
      if (userObj) {
        sendEmail(userObj.email, "Thank You for Parking - Receipt", `Thank you for parking here! Your vehicle safely exited. Overstay penalty: ₹${penalty}. Total paid: ₹${finalCost}. See you again!`);
      }
    } else {
      const userObj = await User.findById(booking.user);
      if (userObj) {
        sendEmail(userObj.email, "Thank You for Parking!", `Thank you for parking here! Your vehicle safely exited. No extra charges applied. Total paid: ₹${finalCost}. See you again!`);
      }
    }

    res.json({ message: 'Checkout successful', penalty, overstayHours, finalCost });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

export default router;
