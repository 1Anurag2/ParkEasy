import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllSpots,
  createSpot,
  updateSpot,
  deleteSpot,
} from '../controllers/spotController.js';

const router = express.Router();

router.get('/', getAllSpots);
router.post('/', [authMiddleware, adminMiddleware], createSpot);
router.put('/:id', [authMiddleware, adminMiddleware], updateSpot);
router.delete('/:id', [authMiddleware, adminMiddleware], deleteSpot);

export default router;
