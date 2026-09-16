import {
    listSeats, getSeatById, getSeatsByIds, createSeat, updateSeat, deleteSeat, bulkCreateSeats
} from "../services/seatService.js";
import { getSeatMapForShowtime } from '../services/seatService.js';

export const getAllSeats = async (req, res) =>{
    try{
        const seats = await listSeats();
        res.json(seats);
    }catch( err){
        res.status(500).json({message: err.message});
    }
};

export const getSeatsBatchHandler = async (req, res) => {
    try {
        const { seat_ids } = req.body;
        if (!Array.isArray(seat_ids)) {
            return res.status(400).json({ message: 'seat_ids must be an array of IDs' });
        }
        const seats = await getSeatsByIds(seat_ids);
        res.json(seats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getSeat = async (req, res) => {
    try{
        const seat = await getSeatById(req.params.id);
        if (!seat) return res.status(404).json({message:'Seat not found'});
        res.json(seat);
    }catch(err){
        res.status(500).json({message: err.message});
    }
};

export const createNewSeat  = async (req, res) =>{
    try{
        const seat = await createSeat(req.body);
        res.status(201).json(seat);
    }catch(err){
        res.status(400).json({message: err.message});
    }
};

export const updateSeatById = async (req, res) => {
    try {
        const seat = await updateSeat(req.params.id, req.body);
        if (!seat) return res.status(404).json({ message: 'Seat not found' });
        res.json(seat);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

export const deleteSeatById = async (req, res) => {
  try {
    const deleted = await deleteSeat(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSeatMap = async (req, res) => {
    try {
        const showtimeId = parseInt(req.params.showtimeId || req.query.showtimeId, 10);
        if (Number.isNaN(showtimeId)) return res.status(400).json({ message: 'Invalid showtime id' });

        console.log(`GET /api/seats/showtimes/${showtimeId}/seats requested`);

        const data = await getSeatMapForShowtime(showtimeId);
        if (!data) return res.status(404).json({ message: 'Showtime not found' });
        res.json(data);
    } catch (err) {
        console.error('Error in getSeatMap:', err && err.stack ? err.stack : err);
        res.status(500).json({ message: err.message });
    }
};

export const createBulkSeats = async (req, res) => {
  try {
    const seats = req.body;
    const seatsArray = Array.isArray(seats) ? seats : (seats.seats || []);
    if (seatsArray.length === 0) {
      return res.status(400).json({ message: 'No seats provided' });
    }
    const result = await bulkCreateSeats(seatsArray);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating bulk seats:', err);
    res.status(500).json({ message: err.message });
  }
};

export const getSeatsByHallHandler = async (req, res) => {
  try {
    const { hallId } = req.params;
    const seats = await (await import('../services/seatService.js')).getSeatsByHall(hallId);
    res.json({ success: true, data: seats, total: seats.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getSeatLayoutByHallHandler = async (req, res) => {
  try {
    const { hallId } = req.params;
    const layout = await (await import('../services/seatService.js')).getSeatLayoutByHall(hallId);
    res.json({ success: true, data: layout });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const initSeatsForHallHandler = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { rows, seatsPerRow, vipRows } = req.body;
    const created = await (await import('../services/seatService.js')).initSeatsForHall(hallId, { rows, seatsPerRow, vipRows });
    res.status(201).json({ success: true, message: `${created.length} ghế được tạo thành công`, data: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const deleteSeatsByHallHandler = async (req, res) => {
  try {
    const { hallId } = req.params;
    const result = await (await import('../services/seatService.js')).deleteSeatsByHall(hallId);
    res.json({ success: true, message: 'Ghế của phòng đã được xóa', data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateSeatTypeByHallHandler = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { seatType, priceModifier, totalPrice, basePrice } = req.body;
    const modifier = priceModifier !== undefined ? priceModifier : (totalPrice && basePrice ? (totalPrice - basePrice) : 0);
    const result = await (await import('../services/seatService.js')).updateSeatTypeByHall(hallId, { seatType, priceModifier: modifier });
    res.json({ success: true, message: 'Đã cập nhật loại ghế thành công', data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

