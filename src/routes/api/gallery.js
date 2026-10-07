import express from 'express';
import path from 'path';
import fs from 'fs';
import db from '../../database/db.js';
import { requireAuthApi } from '../../middleware/auth.js';
import { uploadGalleryImage, verifyImageSignature } from '../../middleware/upload.js';
import { logSecurityEvent } from '../../middleware/security.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// GET /api/gallery
router.get('/', (req, res) => {
  const { category } = req.query;
  try {
    let items;
    if (category && category !== 'all') {
      items = db.prepare(`
        SELECT * FROM gallery WHERE category = ? ORDER BY created_at DESC
      `).all(category);
    } else {
      items = db.prepare(`
        SELECT * FROM gallery ORDER BY created_at DESC
      `).all();
    }

    return res.json({
      success: true,
      data: items
    });
  } catch (err) {
    console.error('Gallery fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve gallery images.'
    });
  }
});

// POST /api/gallery (Upload new photo - Admin Only)
router.post(
  '/',
  requireAuthApi,
  (req, res, next) => {
    uploadGalleryImage.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File size exceeds the 5MB limit. Please upload a smaller image.'
          });
        }
        return res.status(400).json({
          success: false,
          error: err.message || 'File upload failed.'
        });
      }
      next();
    });
  },
  verifyImageSignature,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please select an image file to upload.'
      });
    }

    const title = req.body.title ? req.body.title.trim() : 'Farm & Logistics Highlight';
    const description = req.body.description ? req.body.description.trim() : '';
    const category = req.body.category || 'farms';
    const imageUrl = `/images/gallery/${req.file.filename}`;
    const fileSize = req.file.size || 0;

    try {
      const info = db.prepare(`
        INSERT INTO gallery (title, description, category, image_url, file_size)
        VALUES (?, ?, ?, ?, ?)
      `).run(title, description, category, imageUrl, fileSize);

      logSecurityEvent(
        'GALLERY_IMAGE_UPLOADED',
        `Admin '${req.user.username}' uploaded new image: ${req.file.filename} (ID: ${info.lastInsertRowid})`,
        req.user.id,
        req,
        'INFO'
      );

      return res.status(201).json({
        success: true,
        message: 'Image uploaded and published successfully.',
        data: {
          id: Number(info.lastInsertRowid),
          title,
          description,
          category,
          image_url: imageUrl,
          file_size: fileSize
        }
      });
    } catch (err) {
      console.error('Gallery insert error:', err);
      // Clean up uploaded file on DB failure
      if (req.file.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(500).json({
        success: false,
        error: 'Database error while saving gallery record.'
      });
    }
  }
);

// PUT /api/gallery/:id (Update photo metadata - Admin Only)
router.put('/:id', requireAuthApi, (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Photo title cannot be empty.'
    });
  }

  try {
    const existing = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Gallery photo record not found.'
      });
    }

    const safeCategory = ['farms', 'harvest', 'logistics', 'products', 'packaging'].includes(category)
      ? category
      : existing.category;

    db.prepare(`
      UPDATE gallery
      SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title.trim(), description ? description.trim() : '', safeCategory, id);

    logSecurityEvent(
      'GALLERY_IMAGE_UPDATED',
      `Admin '${req.user.username}' updated photo ID ${id} (${title.trim()})`,
      req.user.id,
      req,
      'INFO'
    );

    return res.json({
      success: true,
      message: 'Gallery item updated successfully.'
    });
  } catch (err) {
    console.error('Gallery update error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update gallery item.'
    });
  }
});

// DELETE /api/gallery/:id (Delete photo & file - Admin Only)
router.delete('/:id', requireAuthApi, (req, res) => {
  const { id } = req.params;

  try {
    const item = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Gallery item not found.'
      });
    }

    // Delete DB record
    db.prepare('DELETE FROM gallery WHERE id = ?').run(id);

    // Safely delete file from disk if it was uploaded to gallery
    if (item.image_url && item.image_url.startsWith('/images/gallery/')) {
      const filename = path.basename(item.image_url);
      const safeFilePath = path.resolve(__dirname, '../../public/images/gallery', filename);
      if (fs.existsSync(safeFilePath)) {
        try { fs.unlinkSync(safeFilePath); } catch (e) {
          console.error('Error removing file:', e);
        }
      }
    }

    logSecurityEvent(
      'GALLERY_IMAGE_DELETED',
      `Admin '${req.user.username}' deleted photo ID ${id} (${item.title})`,
      req.user.id,
      req,
      'INFO'
    );

    return res.json({
      success: true,
      message: 'Gallery item and file deleted successfully.'
    });
  } catch (err) {
    console.error('Gallery delete error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete gallery item.'
    });
  }
});

export default router;
