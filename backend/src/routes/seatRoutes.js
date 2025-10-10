import express from 'express';
import {
  getAllSeats,
  getSeat,
  createNewSeat,
  updateSeatById,
  deleteSeatById
} from '../controllers/seatController.js';

const router = express.Router();

router.get('/', getAllSeats);
router.get('/:id', getSeat);
router.post('/', createNewSeat);
router.put('/:id', updateSeatById);
router.delete('/:id', deleteSeatById);

export default router;