import { Showtime, sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis Cache] REDIS_URL not configured in showtimeService.');
}

import axios from 'axios';
const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';

export const listShowtimes = async ({ date, movie_id, hall_id }) => {
  const where = {};
  const Op = sequelize.Sequelize.Op;
  const conditions = [];
  const replacements = {};

  if (movie_id) conditions.push('movie_id = :movie_id') && (replacements.movie_id = movie_id);
  if (hall_id) conditions.push('hall_id = :hall_id') && (replacements.hall_id = hall_id);
  if (date) {
    // filter by date (local midnights)
    conditions.push("CONVERT(date, start_time) = :date") && (replacements.date = date);
  }

  let sql = 'SELECT * FROM showtimes';
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  sql += ' ORDER BY start_time ASC';

  const rows = await sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
  return rows;
};

export const getShowtimeById = async (id) => {
  const { Movie, CinemaHall, Cinema } = sequelize.models;
  const st = await Showtime.findByPk(id, {
    include: [
      { model: Movie, attributes: ['id', 'title', 'duration_minutes', 'poster_url'] },
      { 
        model: CinemaHall, 
        attributes: ['id', 'name', 'cinema_id'],
        include: [{ model: Cinema, attributes: ['id', 'name', 'address', 'city'] }]
      }
    ]
  });
  if (!st) return null;
  const json = st.toJSON();
  json.movie_title = json.Movie?.title || 'Unknown Movie';
  json.hall_name = json.CinemaHall?.name || 'Unknown Hall';
  json.cinema_name = json.CinemaHall?.Cinema?.name || '';
  return json;
};

const timesOverlap = (aStart, aEnd, bStart, bEnd) => {
  return (aStart < bEnd) && (aEnd > bStart);
};

const parseLocal = (val) => {
  if (!val) return null;
  if (val instanceof Date) return val;
  const s = String(val);
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

  const created = await Showtime.create({ movie_id, hall_id, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), base_price });

  if (redis) {
    try {
      await redis.del(`showtimes:movie:${movie_id}`);
      console.log(`⚡ [Redis Cache] Invalidated: showtimes:movie:${movie_id}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

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

  const oldMovieId = st.movie_id;

  if (updates.start_time) st.start_time = newStart.toISOString();
  if (updates.end_time) st.end_time = newEnd.toISOString();
  if (updates.base_price !== undefined) st.base_price = updates.base_price;
  if (updates.movie_id) st.movie_id = updates.movie_id;
  if (updates.hall_id !== undefined) st.hall_id = updates.hall_id;

  await st.save();

  if (redis) {
    try {
      await redis.del(`showtimes:movie:${oldMovieId}`);
      if (st.movie_id !== oldMovieId) {
        await redis.del(`showtimes:movie:${st.movie_id}`);
      }
      console.log('⚡ [Redis Cache] Invalidated showtimes cache for updated showtime');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return st.toJSON();
};

export const deleteShowtime = async (id) => {
  const st = await Showtime.findByPk(id);
  if (!st) return false;

  let number = 0;
  try {
    const res = await axios.get(`${BOOKING_SERVICE}/api/bookings/showtimes/${id}/bookings-count`);
    number = res.data?.count || 0;
  } catch (err) {
    console.error('Failed to check bookings for showtime from booking-service:', err.message);
    throw new Error('Could not verify existing bookings for showtime');
  }

  if (number > 0) {
    const err = new Error('Cannot delete showtime: existing bookings found');
    err.code = 'HAS_BOOKINGS';
    throw err;
  }

  const movieId = st.movie_id;
  await st.destroy();

  if (redis) {
    try {
      await redis.del(`showtimes:movie:${movieId}`);
      console.log(`⚡ [Redis Cache] Invalidated: showtimes:movie:${movieId}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return true;
};
