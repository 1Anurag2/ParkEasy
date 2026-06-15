import Subscription from '../models/Subscription.js';
import handleAsyncError from '../middleware/handleAsyncError.js';
import { sendEmail } from '../utils/mailer.js';

// Create subscription
export const createSubscription = handleAsyncError(async (req, res, next) => {
  const { planType, vehicleNumber, autoRenew, paymentStatus, razorpayPaymentId, razorpayOrderId } = req.body;
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
    autoRenew,
    paymentStatus: paymentStatus || 'pending',
    razorpayPaymentId,
    razorpayOrderId
  });
  await sub.save();
  res.json(sub);
});

// Get user subscriptions
export const getMySubscriptions = handleAsyncError(async (req, res, next) => {
  const subs = await Subscription.find({ user: req.user.id }).populate('assignedSpot');
  res.json(subs);
});

// Admin: Get all subscriptions
export const getAllSubscriptions = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
  const subs = await Subscription.find().populate('user', 'name email').populate('assignedSpot').sort({ createdAt: -1 });
  res.json(subs);
});

// Admin: Assign spot to subscription
export const assignSpot = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
  const { spotId } = req.body;
  const sub = await Subscription.findByIdAndUpdate(req.params.id, { assignedSpot: spotId }, { new: true }).populate('user', 'name email').populate('assignedSpot');
  
  if (sub && sub.user && sub.assignedSpot) {
    sendEmail(
      sub.user.email,
      "Parking Pass - Spot Assigned!",
      `Hello ${sub.user.name},\n\nGood news! Your ${sub.planType} pass for vehicle ${sub.vehicleNumber} has been assigned to a dedicated spot.\n\nAssigned Spot: ${sub.assignedSpot.identifier}\nLocation: ${sub.assignedSpot.location} (Floor ${sub.assignedSpot.floor})\n\nYou can now use this spot. Thank you for using ParkEasy!`
    );
  }

  res.json(sub);
});

// Admin: Checkout/Exit subscription
export const checkoutSubscription = handleAsyncError(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') return res.status(403).json({ message: 'Not authorized' });
  const sub = await Subscription.findById(req.params.id).populate('assignedSpot');
  if (!sub) return res.status(404).json({ message: 'Subscription not found' });
  
  sub.status = 'expired'; // must match enum ['active', 'expired', 'cancelled']
  sub.assignedSpot = null;
  await sub.save();

  const io = req.app.get('io');
  if (io) io.emit('spots_updated');

  res.json({ message: 'Subscription successfully verified and spot freed.', sub });
});
