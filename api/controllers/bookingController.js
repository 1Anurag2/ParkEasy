import Booking from '../models/Booking.js';
import Spot from '../models/Spot.js';
import User from '../models/User.js';
import QRCode from 'qrcode';
import { sendEmail } from '../utils/mailer.js';
import handleAsyncError from '../middleware/handleAsyncError.js';

// Get user's bookings
export const getBookings = handleAsyncError(async (req, res, next) => {
  let bookings;
  if (req.user.role === 'admin') {
    bookings = await Booking.find().populate('user', 'name email').populate('spot');
  } else {
    bookings = await Booking.find({ user: req.user.id }).populate('spot');
  }
  res.json(bookings);
});

// Create booking
export const createBooking = handleAsyncError(async (req, res, next) => {
  const { spotId, vehicleNumber, startTime, endTime, totalCost } = req.body;

  const conflictingBookings = await Booking.find({
    spot: spotId,
    status: 'active',
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }]
  });

  if (conflictingBookings.length > 0) {
    return res.status(400).json({ message: 'Spot is already booked for this time period' });
  }

  const newBooking = new Booking({ user: req.user.id, spot: spotId, vehicleNumber, startTime, endTime, totalCost });
  let booking = await newBooking.save();

  const qrDataUrl = await QRCode.toDataURL(booking._id.toString());
  booking.qrCode = qrDataUrl;
  await booking.save();

  const io = req.app.get('io');
  if (io) io.emit('spots_updated');

  const user = await User.findById(req.user.id);
  if (user) {
    sendEmail(user.email, "Parking Slot Booked!", `Your booking for spot is confirmed. Vehicle: ${vehicleNumber}. Total Cost: ₹${totalCost}. Use your Dashboard QR Code at the gate.`);
  }

  res.json(booking);
});

// Cancel booking
export const cancelBooking = handleAsyncError(async (req, res, next) => {
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
});

// Checkout booking (Admin Verification)
export const checkoutBooking = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can verify exit' });
  }

  const booking = await Booking.findById(req.params.id).populate('spot');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (booking.status !== 'active') {
    return res.status(400).json({ message: 'Booking is already completed or cancelled' });
  }

  // Default to booking's vehicle number if actualVehicleNumber is not provided (e.g., Admin forcing manual exit from panel)
  const scannedPlate = req.body?.actualVehicleNumber || booking.vehicleNumber;

  if (scannedPlate.toLowerCase().trim() !== booking.vehicleNumber.toLowerCase().trim()) {
    return res.status(400).json({ message: `Gate remains closed. Vehicle Number mismatch. Expected: ${booking.vehicleNumber}, Scanned: ${scannedPlate}` });
  }

  const now = new Date();
  let penalty = 0;
  let overstayHours = 0;

  if (now > booking.endTime) {
    const diffMs = now - booking.endTime;
    overstayHours = Math.ceil(diffMs / (1000 * 60 * 60));
    penalty = overstayHours * (booking.spot.pricePerHour + 5);
  }

  booking.status = 'completed';
  const finalCost = booking.totalCost + penalty;
  await booking.save();

  const io = req.app.get('io');
  if (io) io.emit('spots_updated');

  const userObj = await User.findById(booking.user);
  if (userObj) {
    if (penalty > 0) {
      sendEmail(userObj.email, "Thank You for Parking - Receipt", `Thank you for parking here! Your vehicle safely exited. Overstay penalty: ₹${penalty}. Total paid: ₹${finalCost}. See you again!`);
    } else {
      sendEmail(userObj.email, "Thank You for Parking!", `Thank you for parking here! Your vehicle safely exited. No extra charges applied. Total paid: ₹${finalCost}. See you again!`);
    }
  }

  res.json({ message: 'Checkout successful', penalty, overstayHours, finalCost });
});
