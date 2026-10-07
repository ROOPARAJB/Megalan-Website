import express from 'express';
import db from '../../database/db.js';
import { requireAuthApi } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/audit-logs (Admin Only)
router.get('/', requireAuthApi, (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT a.*, u.username
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();

    return res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    console.error('Audit logs fetch error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve audit security logs.'
    });
  }
});

export default router;
