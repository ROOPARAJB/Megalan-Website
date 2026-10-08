import express from 'express';
import path from 'path';
import fs from 'fs';
import dbService from '../../database/db-service.js';
import { requireAuthApi } from '../../middleware/auth.js';
import { uploadGalleryImage, verifyImageSignature } from '../../middleware/upload.js';
import { logSecurityEvent } from '../../middleware/security.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// GET /api/gallery
router.get('/', async (req, res) => {
  const { category } = req.query;
  try {
    const items = await dbService.getGallery(category);
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
  async (req, res) => {
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
      const created = await dbService.createGalleryItem({
        title,
        description,
        category,
        image_url: imageUrl,
        file_size: fileSize
      });

      logSecurityEvent(
        'GALLERY_IMAGE_UPLOADED',
        `Admin '${req.user.username}' uploaded new image: ${req.file.filename} (ID: ${created.id})`,
        req.user.id,
        req,
        'INFO'
      );

      return res.status(201).json({
        success: true,
        message: 'Image uploaded and published successfully.',
        data: created
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
router.put('/:id', requireAuthApi, async (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Photo title cannot be empty.'
    });
  }

  try {
    const existing = await dbService.getGalleryItemById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Gallery photo record not found.'
      });
    }

    const safeCategory = ['farms', 'harvest', 'logistics', 'products', 'packaging'].includes(category)
      ? category
      : existing.category;

    const updated = await dbService.updateGalleryItem(id, {
      title: title.trim(),
      description: description ? description.trim() : '',
      category: safeCategory
    });

    logSecurityEvent(
      'GALLERY_IMAGE_UPDATED',
      `Admin '${req.user.username}' updated photo ID ${id} (${title.trim()})`,
      req.user.id,
      req,
      'INFO'
    );

    return res.json({
      success: true,
      message: 'Gallery item updated successfully.',
      data: updated
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
router.delete('/:id', requireAuthApi, async (req, res) => {
  const { id } = req.params;

  try {
    const item = await dbService.getGalleryItemById(id);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Gallery item not found.'
      });
    }

    // Delete DB record
    await dbService.deleteGalleryItem(id);

    // Safely delete file from disk if it was uploaded to gallery
    if (item.image_url && item.image_url.startsWith('/images/gallery/')) {
      const filename = path.basename(item.image_url);
      const safeFilePath = path.resolve(__dirname, '../../../public/images/gallery', filename);
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
