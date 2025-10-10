const moviesService = require('../services/moviesService');

const list = async (req, res) => {
  try {
    const movies = await moviesService.listMovies();
    res.json({ movies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const detail = async (req, res) => {
  try {
    const m = await moviesService.getMovieById(req.params.id);
    if (!m) return res.status(404).json({ message: 'Movie not found' });
    res.json({ movie: m });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const m = await moviesService.createMovie(req.body);
    res.status(201).json({ movie: m });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const m = await moviesService.updateMovie(req.params.id, req.body);
    if (!m) return res.status(404).json({ message: 'Movie not found' });
    res.json({ movie: m });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const remove = async (req, res) => {
  try {
    const ok = await moviesService.deleteMovie(req.params.id);
    if (!ok) return res.status(404).json({ message: 'Movie not found' });
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { list, detail, create, update, remove };
