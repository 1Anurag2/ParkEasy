import express from 'express';
import Tesseract from 'tesseract.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const adminMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    req.user = decoded.user;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'Image data is required' });

    console.log("Running Tesseract OCR on provided image...");
    const { data: { text } } = await Tesseract.recognize(imageBase64, 'eng');
    
    // Clean up text
    const cleanedText = text.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    
    res.json({ text: cleanedText });
  } catch (err) {
    console.error('OCR Error:', err);
    res.status(500).json({ message: 'Failed to process image OCR' });
  }
});

export default router;
