import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as hallController from '../controllers/hallController.js';
import * as seatController from '../controllers/seatController.js';

const router = express.Router();

// ============= HALL ROUTES (Quản lý phòng chiếu) =============

/**
 * POST /api/admin/halls
 * Create a new hall
 * Body: { name, rows, seatsPerRow, hallType?, description? }
 */
router.post('/halls', adminAuth, hallController.createHall);

/**
 * GET /api/admin/halls
 * Get all halls
 */
router.get('/halls', adminAuth, hallController.getAllHalls);

/**
 * GET /api/admin/halls/:hallId
 * Get hall by ID
 */
router.get('/halls/:hallId', adminAuth, hallController.getHallById);

/**
 * GET /api/admin/halls/:hallId/detail
 * Get hall details with seat layout
 */
router.get('/halls/:hallId/detail', adminAuth, hallController.getHallDetail);

/**
 * PUT /api/admin/halls/:hallId
 * Update hall by ID
 * Body: { name?, hall_type?, description?, is_active? }
 */
router.put('/halls/:hallId', adminAuth, hallController.updateHall);

/**
 * DELETE /api/admin/halls/:hallId
 * Delete hall by ID
 */
router.delete('/halls/:hallId', adminAuth, hallController.deleteHall);

// ============= SEAT ROUTES (Quản lý ghế) =============

/**
 * POST /api/admin/seats
 * Create seats for a hall
 * Body: { hallId, seats: [{ row_name, seat_number, seat_type?, price_modifier? }] }
 */
router.post('/seats', adminAuth, seatController.createSeats);

/**
 * GET /api/admin/halls/:hallId/seats
 * Get all seats for a specific hall
 */
router.get('/halls/:hallId/seats', adminAuth, seatController.getSeatsByHall);

/**
 * GET /api/admin/halls/:hallId/seats/layout
 * Get seat layout for a specific hall
 */
router.get('/halls/:hallId/seats/layout', adminAuth, seatController.getSeatLayout);

/**
 * PUT /api/admin/seats/:seatId
 * Update seat by ID
 * Body: { seat_type?, price_modifier?, is_active? }
 */
router.put('/seats/:seatId', adminAuth, seatController.updateSeat);

/**
 * PUT /api/admin/halls/:hallId/seats/type
 * Update all seats type in a hall
 * Body: { seatType, priceModifier? }
 */
router.put('/halls/:hallId/seats/type', adminAuth, seatController.updateSeatType);

/**
 * DELETE /api/admin/seats/:seatId
 * Delete seat by ID
 */
router.delete('/seats/:seatId', adminAuth, seatController.deleteSeat);

export default router;
