import express from 'express';
import {
  getAllSeats,
  getSeat,
  getSeatsBatchHandler,
  createNewSeat,
  updateSeatById,
  deleteSeatById,
  getSeatMap,
  createBulkSeats,
  getSeatsByHallHandler,
  getSeatLayoutByHallHandler,
  initSeatsForHallHandler,
  deleteSeatsByHallHandler,
  updateSeatTypeByHallHandler
} from '../controllers/seatController.js';

const router = express.Router();

router.get('/', getAllSeats);
router.post('/batch', getSeatsBatchHandler);
router.get('/showtimes/:showtimeId/seats', getSeatMap);
router.post('/bulk', createBulkSeats);

// Hall seats routes
router.get('/hall/:hallId', getSeatsByHallHandler);
router.get('/hall/:hallId/layout', getSeatLayoutByHallHandler);
router.post('/hall/:hallId/init', initSeatsForHallHandler);
router.delete('/hall/:hallId', deleteSeatsByHallHandler);
router.put('/hall/:hallId/type', updateSeatTypeByHallHandler);

// Single seat routes
router.get('/:id', getSeat);
router.post('/', createNewSeat);
router.put('/:id', updateSeatById);
router.delete('/:id', deleteSeatById);

export default router;

