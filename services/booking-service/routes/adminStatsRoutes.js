import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminStatsController from '../controllers/adminStatsController.js';

const router = express.Router();

// Require admin for all stats routes
router.use(adminAuth);

router.get('/dashboard', adminStatsController.getDashboardStats);

export default router;
