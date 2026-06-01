import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  resolveComplaint,
} from '../controllers/complaintController.js';

const router = express.Router();

router.post('/', authMiddleware, createComplaint);
router.get('/my', authMiddleware, getMyComplaints);
router.get('/all', authMiddleware, getAllComplaints);
router.put('/:id/resolve', authMiddleware, resolveComplaint);

export default router;
