import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const galleryUploadDir = path.resolve(__dirname, '../../public/images/gallery');
if (!fs.existsSync(galleryUploadDir)) {
  fs.mkdirSync(galleryUploadDir, { recursive: true });
}

// Allowed MIME types and extensions (broad browser compatibility)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/webp',
  'image/jfif',
  'image/gif'
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.jfif', '.gif']);

// Disk storage with randomized safe filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, galleryUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomName = `gallery_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, randomName);
  }
});

// File filter (extension & reported MIME check)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  
  if (ALLOWED_EXTENSIONS.has(ext) || ALLOWED_MIME_TYPES.has(mime) || mime.startsWith('image/')) {
    return cb(null, true);
  }
  return cb(new Error('Invalid file type. Please upload a valid image (JPG, PNG, WebP).'), false);
};

export const uploadGalleryImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter
});

/**
 * Secondary Magic Bytes Header Verification (OWASP A04/A08 File Upload Security)
 * Checks binary signature to prevent malicious file cloaking
 */
export const verifyImageSignature = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const filePath = req.file.path;
  const buffer = Buffer.alloc(12);

  try {
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isWebp =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      // Clean up fake/malicious file immediately
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        error: 'Security Error: File binary header does not match a valid image format.'
      });
    }

    next();
  } catch (err) {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    return res.status(500).json({
      success: false,
      error: 'Error validating file signature.'
    });
  }
};
