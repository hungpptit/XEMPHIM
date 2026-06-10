import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as controller from '../controllers/showtimeController.js';

const router = express.Router();

// Public list / filter
router.get('/', controller.listShowtimes);
router.get('/:id', controller.getShowtime);

// Admin operations
router.post('/', adminAuth, controller.createShowtime);
router.put('/:id', adminAuth, controller.updateShowtime);
router.delete('/:id', adminAuth, controller.deleteShowtime);

export default router;
