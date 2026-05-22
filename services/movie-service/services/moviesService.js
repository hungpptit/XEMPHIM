import { Movie, Genre } from '../models/index.js';
import Redis from 'ioredis';

// Initialize Redis client with fallback
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis Cache] REDIS_URL not configured. Caching is disabled; falling back to DB queries directly.');
}

export const listMovies = async (options = {}) => {
  // options: { all: boolean, page: number, limit: number }
  const cacheKey = options.all ? 'movies:list:all' : 'movies:list';
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log('⚡ [Redis Cache] Hit: listMovies');
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error reading cache:', err.message);
    }
  }

  const { Sequelize } = await import('sequelize');
  const { Showtime } = await import('../models/index.js');
  const Op = Sequelize.Op;
  const now = new Date();

  // If options.page/limit provided, use pagination; otherwise fetch all
  const attributes = [
    'id',
    'title',
    'description',
    'poster_url',
    'backdrop_url',
    'trailer_url',
    'duration_minutes',
    'release_date',
    'rating',
    'director',
    'status'
  ];

  let movies;
  if (options.page && options.limit) {
    const page = parseInt(options.page, 10) || 1;
    const limit = parseInt(options.limit, 10) || 10;
    const offset = (page - 1) * limit;
    // use findAndCountAll to return total count for pagination
    const { rows, count } = await Movie.findAndCountAll({ attributes, offset, limit });
    movies = { rows, count };
  } else {
    movies = await Movie.findAll({ attributes });
  }

  // If caller requests all movies (options.all===true) or pagination, return raw fetch
  if (options.all || (options.page && options.limit)) {
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(movies), 'EX', 3600);
        console.log('⚡ [Redis Cache] Miss & Set: listMovies');
      } catch (err) {
        console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
      }
    }
    return movies;
  }

  const moviesWithFutureShowtimes = [];
  for (const movie of movies) {
    if (movie.status === 'coming_soon') {
      moviesWithFutureShowtimes.push(movie);
      continue;
    }

    const futureShowtimeCount = await Showtime.count({
      where: {
        movie_id: movie.id,
        start_time: {
          [Op.gt]: now
        }
      }
    });

    if (futureShowtimeCount > 0) {
      moviesWithFutureShowtimes.push(movie);
    }
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(moviesWithFutureShowtimes), 'EX', 3600); // cache for 1 hour
      console.log('⚡ [Redis Cache] Miss & Set: listMovies');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
    }
  }

  return moviesWithFutureShowtimes;
};

export const getMovieById = async (id) => {
  const cacheKey = `movies:detail:${id}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`⚡ [Redis Cache] Hit: getMovieById(${id})`);
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error reading cache:', err.message);
    }
  }

  const movie = await Movie.findByPk(id, {
    attributes: [
      'id',
      'title',
      'description',
      'poster_url',
      'backdrop_url',
      'trailer_url',
      'duration_minutes',
      'release_date',
      'rating',
      'director',
      'status'
    ]
  });

  if (movie && redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(movie), 'EX', 3600);
      console.log(`⚡ [Redis Cache] Miss & Set: getMovieById(${id})`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
    }
  }

  return movie;
};

export const createMovie = async (payload) => {
  const m = await Movie.create({
    title: payload.title,
    description: payload.description,
    poster_url: payload.poster_url || payload.poster || null,
    backdrop_url: payload.backdrop_url || payload.backdrop || null,
    trailer_url: payload.trailer_url || payload.trailerUrl || null,
    duration_minutes: payload.duration_minutes || payload.duration || null,
    release_date: payload.release_date || payload.releaseYear || null,
    rating: payload.rating || null,
    director: payload.director || null,
    status: payload.status || 'coming_soon'
  });

  if (payload.genres && Array.isArray(payload.genres)) {
    const genres = await Genre.findAll({ where: { id: payload.genres } });
    await m.setGenres(genres);
  }

  // Invalidate list cache
  if (redis) {
    try {
      await redis.del('movies:list');
      console.log('⚡ [Redis Cache] Invalidated: movies:list');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return m;
};

export const updateMovie = async (id, payload) => {
  const movie = await Movie.findByPk(id);
  if (!movie) return null;

  await movie.update({
    title: payload.title ?? movie.title,
    description: payload.description ?? movie.description,
    poster_url: payload.poster_url ?? payload.poster ?? movie.poster_url,
    backdrop_url: payload.backdrop_url ?? payload.backdrop ?? movie.backdrop_url,
    trailer_url: payload.trailer_url ?? payload.trailerUrl ?? movie.trailer_url,
    duration_minutes: payload.duration_minutes ?? payload.duration ?? movie.duration_minutes,
    release_date: payload.release_date ?? payload.releaseYear ?? movie.release_date,
    rating: payload.rating ?? movie.rating,
    director: payload.director ?? movie.director,
    status: payload.status ?? movie.status
  });

  if (payload.genres && Array.isArray(payload.genres)) {
    const genres = await Genre.findAll({ where: { id: payload.genres } });
    await movie.setGenres(genres);
  }

  // Invalidate cache
  if (redis) {
    try {
      await redis.del('movies:list');
      await redis.del(`movies:detail:${id}`);
      console.log(`⚡ [Redis Cache] Invalidated: movies:list and movies:detail:${id}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return movie;
};

export const deleteMovie = async (id) => {
  const movie = await Movie.findByPk(id);
  if (!movie) return false;
  await movie.destroy();

  // Invalidate cache
  if (redis) {
    try {
      await redis.del('movies:list');
      await redis.del(`movies:detail:${id}`);
      console.log(`⚡ [Redis Cache] Invalidated: movies:list and movies:detail:${id}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return true;
};

export const getShowtimesForMovie = async (movieId) => {
  const cacheKey = `showtimes:movie:${movieId}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`⚡ [Redis Cache] Hit: getShowtimesForMovie(${movieId})`);
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error reading cache:', err.message);
    }
  }

  const { Sequelize } = await import('sequelize');
  const { Showtime, CinemaHall, Cinema } = await import('../models/index.js');
  const Op = Sequelize.Op;
  
  const now = new Date();
  
  const showtimes = await Showtime.findAll({
    where: { 
      movie_id: movieId,
      start_time: {
        [Op.gt]: now
      }
    },
    attributes: ['id', 'movie_id', 'hall_id', 'start_time', 'end_time', 'base_price'],
    include: [
      {
        model: CinemaHall,
        attributes: ['id', 'name', 'cinema_id'],
        include: [
          {
            model: Cinema,
            attributes: ['id', 'name', 'address', 'city']
          }
        ]
      }
    ],
    order: [['start_time', 'ASC']]
  });

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(showtimes), 'EX', 600); // cache for 10 minutes
      console.log(`⚡ [Redis Cache] Miss & Set: getShowtimesForMovie(${movieId})`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
    }
  }

  return showtimes;
};
