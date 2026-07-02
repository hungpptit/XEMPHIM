import { Movie, Genre } from '../models/index.js';
import Redis from 'ioredis';

// Khởi tạo Redis client với cơ chế dự phòng
// Thiết kế: Sử dụng Redis làm lớp đệm cache để giảm tải cho DB SQL Server đối với các truy vấn đọc dữ liệu phim/lịch chiếu.
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis Cache] REDIS_URL not configured. Caching is disabled; falling back to DB queries directly.');
}

// Xóa bỏ toàn bộ cache danh sách phim (movies:list*)
// Thiết kế: Dùng cơ chế Active Invalidation (Xóa cache chủ động) khi có thay đổi dữ liệu (thêm/sửa/xóa phim).
// Sử dụng lệnh SCAN của Redis để duyệt qua tất cả key khớp với pattern và xóa chúng.
export const invalidateListCache = async () => {
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, 'MATCH', 'movies:list*', 'COUNT', 100);
      cursor = reply[0];
      const keys = reply[1];
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
    console.log('⚡ [Redis Cache] Invalidated all movies:list keys');
  } catch (err) {
    console.warn('⚠️ [Redis Cache] Error invalidating list cache:', err.message);
  }
};

// Lấy danh sách phim
// Thiết kế: Áp dụng Cache-Aside Pattern.
// Bước 1: Sinh cache key dựa trên tham số phân trang.
// Bước 2: Kiểm tra trong Redis. Nếu có (Cache Hit), trả về dữ liệu JSON ngay lập tức.
// Bước 3: Nếu không có (Cache Miss), truy vấn Database SQL Server.
// Bước 4: Lưu dữ liệu vừa lấy được từ DB vào Redis với TTL là 1 giờ (3600 giây) để tái sử dụng.
export const listMovies = async (options = {}) => {
  // options: { all: boolean, page: number, limit: number }
  const cacheKey = options.all
    ? 'movies:list:all'
    : (options.page && options.limit)
      ? `movies:list:${options.page}:${options.limit}`
      : 'movies:list';
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`⚡ [Redis Cache] Hit: listMovies (${cacheKey})`);
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error reading cache:', err.message);
    }
  }

  const { Sequelize } = await import('sequelize');
  const { Showtime } = await import('../models/index.js');
  const Op = Sequelize.Op;
  const now = new Date().toISOString();

  // Nếu có thông số page/limit thì dùng phân trang; ngược lại lấy toàn bộ
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
    const { rows, count } = await Movie.findAndCountAll({ attributes, offset, limit });
    movies = { rows, count };
  } else {
    movies = await Movie.findAll({ attributes });
  }

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
          [Op.gt]: Sequelize.literal(`'${now}'`)
        }
      }
    });

    if (futureShowtimeCount > 0) {
      moviesWithFutureShowtimes.push(movie);
    }
  }

  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(moviesWithFutureShowtimes), 'EX', 3600); // cache 1 giờ
      console.log('⚡ [Redis Cache] Miss & Set: listMovies');
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
    }
  }

  return moviesWithFutureShowtimes;
};

// Lấy thông tin chi tiết một bộ phim theo ID
// Thiết kế: Cache-Aside Pattern. Lưu cache chi tiết phim theo key: movies:detail:${id} với TTL 1 giờ.
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

// Thêm mới phim
// Thiết kế: Sau khi tạo phim thành công trong SQL Server, thực hiện xóa cache danh sách phim (movies:list*) để đảm bảo dữ liệu mới nhất được cập nhật cho người dùng (Active Invalidation).
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

  // Hủy cache danh sách
  await invalidateListCache();

  return m;
};

// Cập nhật thông tin phim
// Thiết kế: Thực hiện cập nhật DB thành công, sau đó xóa cả cache danh sách phim (movies:list*) và cache chi tiết của bộ phim đó (movies:detail:${id}) để ngăn chặn hiện tượng dữ liệu cũ (Stale Data).
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

  // Hủy cache danh sách và cache chi tiết phim
  await invalidateListCache();
  if (redis) {
    try {
      await redis.del(`movies:detail:${id}`);
      console.log(`⚡ [Redis Cache] Invalidated: movies:detail:${id}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return movie;
};

// Xóa phim
// Thiết kế: Xóa phim thành công ở DB, hủy bỏ cache danh sách và cache chi tiết phim khỏi Redis.
export const deleteMovie = async (id) => {
  const movie = await Movie.findByPk(id);
  if (!movie) return false;
  await movie.destroy();

  // Hủy cache danh sách và cache chi tiết phim
  await invalidateListCache();
  if (redis) {
    try {
      await redis.del(`movies:detail:${id}`);
      console.log(`⚡ [Redis Cache] Invalidated: movies:detail:${id}`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error invalidating cache:', err.message);
    }
  }

  return true;
};

// Lấy danh sách lịch chiếu của một bộ phim
// Thiết kế: Áp dụng Cache-Aside Pattern cho lịch chiếu của từng bộ phim với cache key là: showtimes:movie:${movieId} và TTL ngắn hơn (10 phút - 600 giây) vì lịch chiếu có thể biến động liên tục.
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

  const now = new Date().toISOString();

  const showtimes = await Showtime.findAll({
    where: {
      movie_id: movieId,
      start_time: {
        [Op.gt]: Sequelize.literal(`'${now}'`)
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
      await redis.set(cacheKey, JSON.stringify(showtimes), 'EX', 600); // cache trong 10 phút
      console.log(`⚡ [Redis Cache] Miss & Set: getShowtimesForMovie(${movieId})`);
    } catch (err) {
      console.warn('⚠️ [Redis Cache] Error writing cache:', err.message);
    }
  }

  return showtimes;
};
