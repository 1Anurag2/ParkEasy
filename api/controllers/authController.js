import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { sendEmail } from '../utils/mailer.js';
import handleAsyncError from '../middleware/handleAsyncError.js';

// Register
export const registerUser = handleAsyncError(async (req, res, next) => {
  const { name, email, password, role, photo } = req.body;
  let user = await User.findOne({ email });
  if (user) return res.status(400).json({ message: 'User already exists' });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const verificationOTP = Math.floor(100000 + Math.random() * 900000).toString();

  user = new User({ name, email, password: hashedPassword, role, photo, isVerified: false, verificationOTP });
  await user.save();

  await sendEmail(email, "Verify Your ParkEasy Account", `Your verification OTP is: ${verificationOTP}. It is valid for registration.`);
  res.json({ message: 'OTP sent to email. Please verify.' });
});

// Verify Email
export const verifyEmail = handleAsyncError(async (req, res, next) => {
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
});

// Login
export const loginUser = handleAsyncError(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  if (!user.isVerified) return res.status(403).json({ message: 'Please verify your email first', emailNotVerified: true });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const payload = { user: { id: user.id, role: user.role } };
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret123', { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Forgot Password
export const forgotPassword = handleAsyncError(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User with this email does not exist.' });

  const resetOTP = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = resetOTP;
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  await user.save();

  await sendEmail(email, "ParkEasy Password Reset OTP", `Your password reset OTP is: ${resetOTP}. It is valid for 15 minutes.`);
  res.json({ message: 'Password reset OTP sent to email.' });
});

// Reset Password
export const resetPassword = handleAsyncError(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email, resetPasswordOTP: otp, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired OTP.' });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now login.' });
});
