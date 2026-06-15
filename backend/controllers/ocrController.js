import Tesseract from 'tesseract.js';
import handleAsyncError from '../middleware/handleAsyncError.js';

export const recognizePlate = handleAsyncError(async (req, res, next) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) return res.status(400).json({ message: 'Image data is required' });

  console.log('Running Tesseract OCR on provided image...');
  const { data: { text } } = await Tesseract.recognize(imageBase64, 'eng');
  const cleanedText = text.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();

  res.json({ text: cleanedText });
});
