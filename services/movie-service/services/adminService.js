import { CinemaHall, Showtime, Movie, Cinema } from '../models/index.js';
import Redis from 'ioredis';
import * as showtimeService from './showtimeService.js';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis Cache] REDIS_URL not configured in adminService. Caching is disabled.');
}

/**
 * Admin Cinema & Hall Management Service
 */

// ============= CINEMA MANAGEMENT =============

export const createCinema = async (name, location, hotline) => {
  if (!name || !location) {
    throw new Error('Cinema name and location are required');
  }
  
  const cinema = await CinemaHall.create({
    name,
    cinema_name: location, // Using cinema_name field for location
    total_seats: 0
  });
  
  return cinema;
};

export const listCinemas = async () => {
  const cinemas = await CinemaHall.findAll({
    order: [['id', 'ASC']]
  });
  return cinemas;
};

export const getCinemaById = async (id) => {
  const cinema = await CinemaHall.findByPk(id);
  return cinema;
};

export const updateCinema = async (id, updates) => {
  const cinema = await CinemaHall.findByPk(id);
  if (!cinema) {
    throw new Error('Cinema not found');
  }
  
  if (updates.name) cinema.name = updates.name;
  if (updates.location) cinema.cinema_name = updates.location;
  if (updates.hotline !== undefined) cinema.hotline = updates.hotline;
  
  await cinema.save();
  return cinema;
};

export const deleteCinema = async (id) => {
  const cinema = await CinemaHall.findByPk(id);
  if (!cinema) {
    throw new Error('Cinema not found');
  }
  
  // Check if cinema has any showtimes
  const showtimes = await Showtime.findAll({ where: { cinema_id: id } });
  if (showtimes.length > 0) {
    throw new Error('Cannot delete cinema with active showtimes. Delete showtimes first.');
  }
  
  await cinema.destroy();
  return { message: 'Cinema deleted successfully' };
};

// ============= HALL MANAGEMENT =============

export const createHall = async (cinemaId, name, rows, seatsPerRow) => {
  if (!name || !rows || !seatsPerRow) {
    throw new Error('Name, rows, and seatsPerRow are required');
  }
  
  // Verify cinema exists
  const cinema = await CinemaHall.findByPk(cinemaId);
  if (!cinema) {
    throw new Error('Cinema not found');
  }
  
  const totalSeats = rows * seatsPerRow;
  
  const hall = await CinemaHall.create({
    name: `${cinema.name} - ${name}`,
    cinema_name: cinema.cinema_name,
    total_seats: totalSeats
  });
  
  return hall;
};

export const getHallsByCinema = async (cinemaId) => {
  const cinema = await CinemaHall.findByPk(cinemaId);
  if (!cinema) {
    throw new Error('Cinema not found');
  }
  
  // Get all halls for this cinema (filtering by cinema name)
  const halls = await CinemaHall.findAll({
    where: { cinema_name: cinema.cinema_name },
    order: [['id', 'ASC']]
  });
  
  return halls;
};

export const updateHall = async (hallId, updates) => {
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Hall not found');
  }
  
  if (updates.name) hall.name = updates.name;
  if (updates.total_seats) hall.total_seats = updates.total_seats;
  
  await hall.save();
  return hall;
};

export const deleteHall = async (hallId) => {
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Hall not found');
  }
  
  // Check if hall has showtimes
  const showtimes = await Showtime.findAll({ where: { hall_id: hallId } });
  if (showtimes.length > 0) {
    throw new Error('Cannot delete hall with active showtimes. Delete showtimes first.');
  }
  
  await hall.destroy();
  return { message: 'Hall deleted successfully' };
};

// ============= SHOWTIME MANAGEMENT =============

export const createShowtime = async (movieId, hallId, startTime, endTime, basePrice) => {
  if (!movieId || !hallId || !startTime || !endTime || !basePrice) {
    throw new Error('All fields are required: movieId, hallId, startTime, endTime, basePrice');
  }

  // Verify movie exists
  const movie = await Movie.findByPk(movieId);
  if (!movie) {
    throw new Error('Movie not found');
  }

  // Verify hall exists
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Hall not found');
  }

  // Delegate to showtimeService for full time-overlap validation
  const showtime = await showtimeService.createShowtime({
    movie_id: movieId,
    hall_id: hallId,
    start_time: startTime,
    end_time: endTime,
    base_price: basePrice
  });

  if (redis) {
    try {
      await redis.del('movies:list');
      console.log('⚡ [Redis Cache] Invalidated: movies:list');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return showtime;
};

export const getShowtimes = async () => {
  try {
    console.log('[Showtime Service] Fetching all showtimes with associations...');
    const showtimes = await Showtime.findAll({
      include: [
        { 
          model: Movie, 
          required: false,
          attributes: ['id', 'title', 'poster_url'] 
        },
        { 
          model: CinemaHall, 
          required: false,
          attributes: ['id', 'name'],
          include: [
            {
              model: Cinema,
              attributes: ['name']
            }
          ]
        }
      ],
      order: [['start_time', 'ASC']]
    });
    console.log(`[Showtime Service] Found ${showtimes.length} showtimes`);
    return showtimes;
  } catch (error) {
    console.error('[Showtime Service] Error fetching showtimes:', error);
    throw error;
  }
};

export const deleteShowtime = async (id) => {
  // Delegate to showtimeService for bookings check before deletion
  const ok = await showtimeService.deleteShowtime(id);
  if (!ok) {
    throw new Error('Showtime not found');
  }

  if (redis) {
    try {
      await redis.del('movies:list');
      console.log('⚡ [Redis Cache] Invalidated: movies:list');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return { message: 'Showtime deleted successfully' };
};
