import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import Razorpay from 'razorpay';

import connectDB from './config/database.js';
import errorMiddleware from './middleware/errorMiddleware.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import spotRoutes from './routes/spotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

// Razorpay Instance (exported for controllers)
export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting (Security)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', apiLimiter);

// Pass Socket.IO instance to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.IO] ✅ Client connected (${io.engine.clientsCount} active)`);
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected (${io.engine.clientsCount} active)`);
  });
});

// Connect Database
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/spots', spotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api', (req, res) => {
  res.send('Vehicle Parking Portal API is running (Major Version)');
});

// Global Error Middleware
app.use(errorMiddleware);

if (process.env.NODE_ENV !== 'production') {
  const PORT = 5001;
  httpServer.listen(PORT, () => {
    console.log(`API:  http://localhost:${PORT}/api`);

  });
}

export default app;
