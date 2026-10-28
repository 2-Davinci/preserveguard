import express from 'express';
import { downloadDashboardReport } from '../controllers/reportController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/reports/download
// @access  Private (Admin only)
router.route('/download')
  .get(protect, authorizeRoles('admin'), downloadDashboardReport);

export default router;