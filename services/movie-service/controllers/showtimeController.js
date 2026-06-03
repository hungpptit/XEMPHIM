import * as showtimeService from '../services/showtimeService.js';

export const listShowtimes = async (req, res) => {
  try {
    const { date, movie_id, hall_id } = req.query;
    const rows = await showtimeService.listShowtimes({ date, movie_id, hall_id });
    res.json(rows);
  } catch (err) {
    console.error('Error listing showtimes:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getShowtime = async (req, res) => {
  try {
    const st = await showtimeService.getShowtimeById(req.params.id);
    if (!st) return res.status(404).json({ message: 'Showtime not found' });
    res.json(st);
  } catch (err) {
    console.error('Error getting showtime:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createShowtime = async (req, res) => {
  try {
    const payload = req.body;
    const st = await showtimeService.createShowtime(payload);
    res.status(201).json(st);
  } catch (err) {
    console.error('Error creating showtime:', err);
    if (err.code === 'CONFLICT') return res.status(409).json({ message: err.message });
    res.status(400).json({ message: err.message });
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const updated = await showtimeService.updateShowtime(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating showtime:', err);
    if (err.code === 'CONFLICT') return res.status(409).json({ message: err.message });
    res.status(400).json({ message: err.message });
  }
};

export const deleteShowtime = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await showtimeService.deleteShowtime(id);
    if (!ok) return res.status(404).json({ message: 'Showtime not found' });
    res.json({ message: 'Showtime deleted' });
  } catch (err) {
    console.error('Error deleting showtime:', err);
    if (err.code === 'HAS_BOOKINGS') return res.status(400).json({ message: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
};
