import express from 'express';
import { createOrder, updateOrderStatus, getMyOrders } from '../controllers/orderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Base route
router.route('/')
  .post(protect, authorizeRoles('buyer', 'admin'), createOrder);

// 2. THIS MUST GO HERE (Before /:id routes)
router.route('/myorders')
  .get(protect, getMyOrders);

// 3. Dynamic ID routes go at the bottom
router.route('/:id/status')
  .put(protect, authorizeRoles('farmer', 'admin'), updateOrderStatus);

export default router;