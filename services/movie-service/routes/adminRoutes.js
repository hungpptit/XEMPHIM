import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Apply admin auth middleware to all routes
router.use(adminAuth);

// ============= CINEMA ROUTES =============

/**
 * POST /api/admin/cinemas
 * Create a new cinema
 * Body: { name, location, hotline }
 */
router.post('/cinemas', adminController.createCinema);

/**
 * GET /api/admin/cinemas
 * Get all cinemas
 */
router.get('/cinemas', adminController.getCinemas);

/**
 * GET /api/admin/cinemas/:id
 * Get cinema by ID
 */
router.get('/cinemas/:id', adminController.getCinemaById);

/**
 * PUT /api/admin/cinemas/:id
 * Update cinema by ID
 * Body: { name?, location?, hotline? }
 */
router.put('/cinemas/:id', adminController.updateCinema);

/**
 * DELETE /api/admin/cinemas/:id
 * Delete cinema by ID
 */
router.delete('/cinemas/:id', adminController.deleteCinema);

// ============= HALL ROUTES =============

/**
 * POST /api/admin/cinemas/:cinemaId/halls
 * Create a new hall in a cinema
 * Body: { name, rows, seatsPerRow }
 */
router.post('/cinemas/:cinemaId/halls', adminController.createHall);

/**
 * GET /api/admin/cinemas/:cinemaId/halls
 * Get all halls for a cinema
 */
router.get('/cinemas/:cinemaId/halls', adminController.getHallsByCinema);

/**
 * PUT /api/admin/halls/:hallId
 * Update hall by ID
 * Body: { name?, total_seats? }
 */
router.put('/halls/:hallId', adminController.updateHall);

/**
 * DELETE /api/admin/halls/:hallId
 * Delete hall by ID
 */
router.delete('/halls/:hallId', adminController.deleteHall);

export default router;
