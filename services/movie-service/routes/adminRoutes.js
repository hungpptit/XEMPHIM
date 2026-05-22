import express from 'express';
import cinemaRoutes from './cinemaRoutes.js';

const router = express.Router();

// Import cinema management routes (includes Cinema, Hall, and Seat management)
router.use(cinemaRoutes);

export default router;
