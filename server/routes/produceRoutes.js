import express from 'express';
import { getProduce, syncProduceData, deleteProduce } from '../controllers/produceController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route: Anyone can view available produce on the dashboard
router.route('/')
  .get(getProduce);

// Protected route: Only 'farmer' or 'admin' accounts can sync IoT data from collection stations
router.route('/sync')
  .post(protect, authorizeRoles('farmer', 'admin'), syncProduceData);

// Protected route: Only 'admin' accounts can delete records from the system
router.route('/:id')
  .delete(protect, authorizeRoles('admin'), deleteProduce);

export default router;