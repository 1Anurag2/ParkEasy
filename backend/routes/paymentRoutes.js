import express from 'express';
import {
  processPayment,
  sendApiKey,
  paymentVerification,
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/checkout', processPayment);
router.post('/paymentverification', paymentVerification);
router.get('/getkey', sendApiKey);

export default router;
