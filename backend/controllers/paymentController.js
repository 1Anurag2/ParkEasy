import crypto from 'crypto';
import handleAsyncError from '../middleware/handleAsyncError.js';
import razorpayInstance from '../config/razorpay.js';

// Process Payment - Create Order
export const processPayment = handleAsyncError(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ success: false, message: 'Amount is required' });
  }
  const options = {
    amount: Number(amount) * 100, // amount in paise
    currency: 'INR',
  };
  try {
    const order = await razorpayInstance.orders.create(options);
    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    res.status(500).json({ success: false, message: error?.error?.description || error?.message || 'Server error creating payment order', fullError: error });
  }
});

// Send Razorpay API Key
export const sendApiKey = handleAsyncError(async (req, res, next) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID });
});

// Payment Verification
export const paymentVerification = handleAsyncError(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');
  const isAuthentic = expectedSignature === razorpay_signature;
  if (isAuthentic) {
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      reference: razorpay_payment_id,
    });
  }
  return res.status(400).json({ success: false, message: 'Payment verification failed' });
});
