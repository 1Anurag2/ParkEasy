import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createSubscription,
  getMySubscriptions,
  getAllSubscriptions,
  assignSpot,
  checkoutSubscription,
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/', authMiddleware, createSubscription);
router.get('/my', authMiddleware, getMySubscriptions);
router.get('/all', authMiddleware, getAllSubscriptions);
router.put('/:id/assign', authMiddleware, assignSpot);
router.post('/:id/checkout', authMiddleware, checkoutSubscription);

export default router;
