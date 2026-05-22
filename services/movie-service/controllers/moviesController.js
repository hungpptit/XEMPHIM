import * as moviesService from '../services/moviesService.js';

export const list = async (req, res) => {
  try {
    // Support query params: ?all=1 to return all movies (no showtime filtering)
    // or pagination ?page=1&limit=10
    const { all, page, limit } = req.query;
    const options = {};
    if (all === '1' || all === 'true') options.all = true;
    if (page) options.page = parseInt(page, 10);
    if (limit) options.limit = parseInt(limit, 10);

    const result = await moviesService.listMovies(options);

    if (options.page && options.limit) {
      // result expected to be { rows, count }
      const rows = result.rows || [];
      const total = result.count || 0;
      return res.json({ movies: rows, total });
    }

    // non-paginated: may return array
    return res.json({ movies: result });
  } catch (err) {
    console.error('Error listing movies:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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

export const create = async (req, res) => {
  try {
    const movie = await moviesService.createMovie(req.body);
    res.status(201).json({ movie });
  } catch (err) {
    console.error('Error creating movie:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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
