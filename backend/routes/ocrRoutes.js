import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware.js';
import { recognizePlate } from '../controllers/ocrController.js';

const router = express.Router();

router.post('/', [authMiddleware, adminMiddleware], recognizePlate);

export default router;
