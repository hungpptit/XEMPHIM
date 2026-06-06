import { Showtime, sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

export const listShowtimes = async ({ date, movie_id, hall_id }) => {
  const { Movie, CinemaHall, Cinema } = sequelize.models;
  const where = {};
  
  if (movie_id) where.movie_id = movie_id;
  if (hall_id) where.hall_id = hall_id;
  
  if (date) {
    const Op = sequelize.Sequelize.Op;
    // Filter by date (local midnights) using Sequelize literal for SQL Server compatibility
    where.start_time = sequelize.where(
      sequelize.fn('CONVERT', sequelize.literal('date'), sequelize.col('start_time')),
      date
    );
  }

  const rows = await Showtime.findAll({
    where,
    include: [
      { model: Movie, attributes: ['title'] },
      { 
        model: CinemaHall, 
        attributes: ['name'],
        include: [{ model: Cinema, attributes: ['name'] }]
      }
    ],
    order: [['start_time', 'ASC']]
  });

  return rows.map(r => {
    const json = r.toJSON();
    json.movie_title = json.Movie?.title || 'Unknown Movie';
    json.hall_name = json.CinemaHall?.name || 'Unknown Hall';
    json.cinema_name = json.CinemaHall?.Cinema?.name || '';
    return json;
  });
};

export const getShowtimeById = async (id) => {
  const st = await Showtime.findByPk(id);
  return st ? st.toJSON() : null;
};

const timesOverlap = (aStart, aEnd, bStart, bEnd) => {
  return (aStart < bEnd) && (aEnd > bStart);
};

const parseLocal = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val);
  
  // If it's a full ISO string from frontend (has Z or +00:00), just use new Date()
  if (s.includes('Z') || s.includes('+00:00')) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const hh = parseInt(m[4], 10);
    const mm = parseInt(m[5], 10);
    const ss = m[6] ? parseInt(m[6], 10) : 0;
    return new Date(y, mo, d, hh, mm, ss);
  }
  const dd = new Date(s);
  return isNaN(dd.getTime()) ? null : dd;
};

export const createShowtime = async (payload) => {
  const { movie_id, hall_id, start_time, end_time, base_price } = payload;
  if (!movie_id || !hall_id || !start_time || !end_time) {
    throw new Error('movie_id, hall_id, start_time and end_time are required');
  }

  const newStart = parseLocal(start_time);
  const newEnd = parseLocal(end_time);
  if (!(newStart < newEnd)) throw new Error('start_time must be before end_time');

  // Check overlapping showtimes in same hall
  const existing = await Showtime.findAll({ where: { hall_id } });
  for (const ex of existing) {
    const exStart = parseLocal(ex.start_time) || new Date(ex.start_time);
    const exEnd = parseLocal(ex.end_time) || new Date(ex.end_time);
    if (timesOverlap(newStart, newEnd, exStart, exEnd)) {
      const err = new Error('Showtime conflicts with existing showtime in same hall');
      err.code = 'CONFLICT';
      throw err;
    }
  }

  const created = await Showtime.create({ movie_id, hall_id, start_time: newStart, end_time: newEnd, base_price });
  return created.toJSON();
};

export const updateShowtime = async (id, updates) => {
  const st = await Showtime.findByPk(id);
  if (!st) throw new Error('Showtime not found');
  const newStart = updates.start_time ? parseLocal(updates.start_time) : (parseLocal(st.start_time) || new Date(st.start_time));
  const newEnd = updates.end_time ? parseLocal(updates.end_time) : (parseLocal(st.end_time) || new Date(st.end_time));
  const targetHallId = updates.hall_id !== undefined ? updates.hall_id : st.hall_id;

  if (!(newStart < newEnd)) throw new Error('start_time must be before end_time');

  // Check overlap for target hall (exclude self)
  const conflicting = await Showtime.findAll({ where: { hall_id: targetHallId } });
  for (const ex of conflicting) {
    if (ex.id === st.id) continue;
    const exStart = parseLocal(ex.start_time) || new Date(ex.start_time);
    const exEnd = parseLocal(ex.end_time) || new Date(ex.end_time);
    if (timesOverlap(newStart, newEnd, exStart, exEnd)) {
      const err = new Error('Updated showtime conflicts with existing showtime in same hall');
      err.code = 'CONFLICT';
      throw err;
    }
  }

  if (updates.start_time) st.start_time = newStart;
  if (updates.end_time) st.end_time = newEnd;
  if (updates.base_price !== undefined) st.base_price = updates.base_price;
  if (updates.movie_id) st.movie_id = updates.movie_id;
  if (updates.hall_id !== undefined) st.hall_id = updates.hall_id;

  await st.save();
  return st.toJSON();
};

export const deleteShowtime = async (id) => {
  const st = await Showtime.findByPk(id);
  if (!st) return false;

  // Check bookings table for any bookings referencing this showtime
  const sql = 'SELECT COUNT(*) AS cnt FROM bookings WHERE showtime_id = :id';
  const rows = await sequelize.query(sql, { replacements: { id }, type: QueryTypes.SELECT });
  const cnt = rows && rows[0] && (rows[0].cnt || rows[0].CNT || Object.values(rows[0])[0]);
  const number = parseInt(cnt, 10) || 0;
  if (number > 0) {
    const err = new Error('Cannot delete showtime: existing bookings found');
    err.code = 'HAS_BOOKINGS';
    throw err;
  }

  await st.destroy();
  return true;
};
