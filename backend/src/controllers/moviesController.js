import * as moviesService from '../services/moviesService.js';

// 🟢 Lấy danh sách phim
export const list = async (req, res) => {
  try {
    const movies = await moviesService.listMovies();
    res.json({ movies });
  } catch (err) {
    console.error('Error listing movies:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🔵 Lấy chi tiết phim
export const detail = async (req, res) => {
  try {
    const movie = await moviesService.getMovieById(req.params.id);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ movie });
  } catch (err) {
    console.error('Error getting movie detail:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🟠 Tạo mới phim
export const create = async (req, res) => {
  try {
    const movie = await moviesService.createMovie(req.body);
    res.status(201).json({ movie });
  } catch (err) {
    console.error('Error creating movie:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🟣 Cập nhật phim
export const update = async (req, res) => {
  try {
    const movie = await moviesService.updateMovie(req.params.id, req.body);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ movie });
  } catch (err) {
    console.error('Error updating movie:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 🔴 Xóa phim
export const remove = async (req, res) => {
  try {
    const ok = await moviesService.deleteMovie(req.params.id);
    if (!ok) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    console.error('Error deleting movie:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Lấy showtimes cho 1 movie
export const getShowtimesByMovie = async (req, res) => {
  try {
    const movieId = parseInt(req.params.id, 10);
    if (Number.isNaN(movieId)) return res.status(400).json({ message: 'Invalid movie id' });
    const rows = await moviesService.getShowtimesForMovie(movieId);
    res.json(rows.map(r => r.toJSON()));
  } catch (err) {
    console.error('Error getting showtimes for movie:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
