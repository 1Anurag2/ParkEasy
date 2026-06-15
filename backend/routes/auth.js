import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../utils/mailer.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, photo } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();

    user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      role,
      photo,
      isVerified: false,
      verificationOTP
    });
    await user.save();

    await sendEmail(
      email,
      "Verify Your ParkEasy Account",
      `Your verification OTP is: ${verificationOTP}. It is valid for registration.`
    );

    res.json({ message: 'OTP sent to email. Please verify.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: Database connection failed or invalid data.' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
    if (user.verificationOTP !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.isVerified = true;
    user.verificationOTP = undefined;
    await user.save();

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error during verification.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email first', emailNotVerified: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { user: { id: user.id, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error: Database connection failed.' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User with this email does not exist.' });

    const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = resetOTP;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    await sendEmail(
      email,
      "ParkEasy Password Reset OTP",
      `Your password reset OTP is: ${resetOTP}. It is valid for 15 minutes.`
    );

    res.json({ message: 'Password reset OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error sending OTP.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ 
      email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired OTP.' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

export default router;
