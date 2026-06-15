import Spot from '../models/Spot.js';
import Booking from '../models/Booking.js';
import Subscription from '../models/Subscription.js';
import handleAsyncError from '../middleware/handleAsyncError.js';

// Get all spots with booking status
export const getAllSpots = handleAsyncError(async (req, res, next) => {
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
});

// Create spot (Admin)
export const createSpot = handleAsyncError(async (req, res, next) => {
  const newSpot = new Spot(req.body);
  const spot = await newSpot.save();
  res.json(spot);
});

// Update spot (Admin)
export const updateSpot = handleAsyncError(async (req, res, next) => {
  const spot = await Spot.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(spot);
});

// Delete spot (Admin)
export const deleteSpot = handleAsyncError(async (req, res, next) => {
  await Spot.findByIdAndDelete(req.params.id);
  res.json({ message: 'Spot removed' });
});
