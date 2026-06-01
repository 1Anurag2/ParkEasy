import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getBookings,
  createBooking,
  cancelBooking,
  checkoutBooking,
} from '../controllers/bookingController.js';

const router = express.Router();

router.get('/', authMiddleware, getBookings);
router.post('/', authMiddleware, createBooking);
router.delete('/:id', authMiddleware, cancelBooking);
router.post('/:id/checkout', authMiddleware, checkoutBooking);

export default router;
