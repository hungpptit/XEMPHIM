import { Movie, Genre } from '../models/index.js';

// 🟢 Lấy tất cả phim
export const listMovies = async () => {
  return Movie.findAll({
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
};

// 🔵 Lấy phim theo ID
export const getMovieById = async (id) => {
  return Movie.findByPk(id, {
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
};

// 🟠 Tạo phim mới
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
    status: payload.status || 'active'
  });

  if (payload.genres && Array.isArray(payload.genres)) {
    const genres = await Genre.findAll({ where: { id: payload.genres } });
    await m.setGenres(genres);
  }

  return m;
};

// 🟣 Cập nhật phim
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

  return movie;
};

// 🔴 Xóa phim
export const deleteMovie = async (id) => {
  const movie = await Movie.findByPk(id);
  if (!movie) return false;
  await movie.destroy();
  return true;
};
