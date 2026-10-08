import express from 'express';
import dbService from '../../database/db-service.js';
import { requireAuthApi, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// GET /api/audit-logs (Admin Only with RBAC)
router.get('/', requireAuthApi, requireAdmin, async (req, res) => {
  try {
    const logs = await dbService.getAuditLogs(100);
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
