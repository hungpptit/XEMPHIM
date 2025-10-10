import axios from 'axios';

function toEmbedYoutube(url) {
  if (!url) return null;
  try {
    // if already embed, return as-is
    if (url.includes('/embed/')) return url;
    const u = new URL(url, 'https://example.com');
    const hostname = (u.hostname || '').toLowerCase();
    // youtube.com watch?v=
    if (hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    // youtu.be short link
    if (hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch (e) {
    // fallthrough
  }
  // fallback: try to extract watch?v= manually
  const match = (url || '').match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  return url; // unknown format, return original
}

function mapMovie(m) {
  if (!m) return null;
  const status = (m.status || '').toString().toLowerCase();
  const rawRating = parseFloat(m.rating);
  const rating = Number.isFinite(rawRating) ? rawRating : 0;
  const releaseYear = m.release_date ? (new Date(m.release_date)).getFullYear() : null;
  return {
    id: m.id,
    title: m.title || '',
    description: m.description || '',
    poster: m.poster_url || m.poster || null,
    backdrop: m.backdrop_url || m.backdrop || null,
    trailerUrl: toEmbedYoutube(m.trailer_url || m.trailerUrl || ''),
    rating,
    duration: m.duration_minutes ?? m.duration ?? null,
    releaseYear,
    genres: Array.isArray(m.genres) ? m.genres : (m.genres || []),
    director: m.director || null,
    cast: Array.isArray(m.cast) ? m.cast : (m.cast || []),
    status,
    isAvailable: ['now_showing', 'active', 'available'].includes(status)
  };
}

export async function listMovies() {
  const res = await axios.get('/api/movies', { withCredentials: true });
  const raw = res.data && res.data.movies ? res.data.movies : [];
  return raw.map(mapMovie);
}

export async function getMovie(id) {
  const res = await axios.get(`/api/movies/${id}`, { withCredentials: true });
  const raw = res.data && res.data.movie ? res.data.movie : null;
  return mapMovie(raw);
}

export default {
  listMovies,
  getMovie,
  mapMovie
};
