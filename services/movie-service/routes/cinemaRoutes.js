import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as hallController from '../controllers/hallController.js';
import * as seatController from '../controllers/seatController.js';
import * as cinemaController from '../controllers/cinemaController.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// ============= CINEMA ROUTES (Quản lý rạp chiếu) =============
router.post('/cinemas', adminAuth, cinemaController.createCinema);
router.get('/cinemas', adminAuth, cinemaController.getCinemas);
router.get('/cinemas/stats/overview', adminAuth, cinemaController.getCinemaStats);
router.get('/cinemas/:id', adminAuth, cinemaController.getCinemaById);
router.put('/cinemas/:id', adminAuth, cinemaController.updateCinema);
router.delete('/cinemas/:id', adminAuth, cinemaController.deleteCinema);
router.get('/cinemas/:cinemaId/halls', adminAuth, hallController.getHallsByCinema);

// ============= HALL ROUTES (Quản lý phòng chiếu) =============
router.post('/halls', adminAuth, hallController.createHall);
router.get('/halls', adminAuth, hallController.getAllHalls);
router.get('/halls/:hallId', adminAuth, hallController.getHallById);
router.get('/halls/:hallId/detail', adminAuth, hallController.getHallDetail);
router.put('/halls/:hallId', adminAuth, hallController.updateHall);
router.delete('/halls/:hallId', adminAuth, hallController.deleteHall);

// ============= SEAT ROUTES (Quản lý ghế) =============
router.post('/seats', adminAuth, seatController.createSeats);
router.get('/halls/:hallId/seats', adminAuth, seatController.getSeatsByHall);
router.get('/halls/:hallId/seats/layout', adminAuth, seatController.getSeatLayout);
router.put('/seats/:seatId', adminAuth, seatController.updateSeat);
router.put('/halls/:hallId/seats/type', adminAuth, seatController.updateSeatType);
router.delete('/seats/:seatId', adminAuth, seatController.deleteSeat);



// ============= SHOWTIME ROUTES (Quản lý suất chiếu) =============
router.post('/showtimes', adminAuth, adminController.createShowtime);
router.get('/showtimes', adminAuth, adminController.getShowtimes);
router.delete('/showtimes/:id', adminAuth, adminController.deleteShowtime);

export default router;

