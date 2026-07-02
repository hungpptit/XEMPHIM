import { CinemaHall, Showtime, Movie, Cinema } from '../models/index.js';
import Redis from 'ioredis';
import * as showtimeService from './showtimeService.js';

// Khởi tạo Redis client phục vụ cho tác vụ xóa cache danh sách phim của Admin
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;
if (!redis) {
  console.warn('⚠️ [Redis Cache] REDIS_URL not configured in adminService. Caching is disabled.');
}

/**
 * Dịch vụ Quản lý Rạp chiếu, Phòng chiếu và Lịch chiếu dành cho Quản trị viên (Admin)
 */

// ============= QUẢN LÝ RẠP CHIẾU (CINEMA) =============

export const createCinema = async (name, location, hotline) => {
  if (!name || !location) {
    throw new Error('Cinema name and location are required');
  }
  
  const cinema = await CinemaHall.create({
    name,
    cinema_name: location, // Sử dụng trường cinema_name để lưu địa điểm rạp
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
  
  // Kiểm tra rạp chiếu có đang chứa lịch chiếu hoạt động nào không
  const showtimes = await Showtime.findAll({ where: { cinema_id: id } });
  if (showtimes.length > 0) {
    throw new Error('Cannot delete cinema with active showtimes. Delete showtimes first.');
  }
  
  await cinema.destroy();
  return { message: 'Cinema deleted successfully' };
};

// ============= QUẢN LÝ PHÒNG CHIẾU (HALL) =============

export const createHall = async (cinemaId, name, rows, seatsPerRow) => {
  if (!name || !rows || !seatsPerRow) {
    throw new Error('Name, rows, and seatsPerRow are required');
  }
  
  // Xác nhận rạp chiếu tồn tại
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
  
  // Lấy tất cả phòng chiếu thuộc rạp (lọc theo tên rạp)
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
  
  // Kiểm tra phòng chiếu có lịch chiếu hoạt động không
  const showtimes = await Showtime.findAll({ where: { hall_id: hallId } });
  if (showtimes.length > 0) {
    throw new Error('Cannot delete hall with active showtimes. Delete showtimes first.');
  }
  
  await hall.destroy();
  return { message: 'Hall deleted successfully' };
};

// ============= QUẢN LÝ LỊCH CHIẾU (SHOWTIME) =============

// Tạo mới lịch chiếu
// Thiết kế Cache: Việc tạo lịch chiếu mới sẽ ảnh hưởng trực tiếp tới danh sách hiển thị phim của khách hàng (vì hệ thống chỉ hiển thị phim có lịch chiếu tương lai).
// Vì thế, ta phải xóa key cache 'movies:list' trên Redis.
export const createShowtime = async (movieId, hallId, startTime, endTime, basePrice) => {
  if (!movieId || !hallId || !startTime || !endTime || !basePrice) {
    throw new Error('All fields are required: movieId, hallId, startTime, endTime, basePrice');
  }

  // Xác thực phim tồn tại
  const movie = await Movie.findByPk(movieId);
  if (!movie) {
    throw new Error('Movie not found');
  }

  // Xác thực phòng chiếu tồn tại
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Hall not found');
  }

  // Ủy quyền cho showtimeService thực hiện kiểm tra thời gian chồng chéo và lưu vào DB
  const showtime = await showtimeService.createShowtime({
    movie_id: movieId,
    hall_id: hallId,
    start_time: startTime,
    end_time: endTime,
    base_price: basePrice
  });

  // Hủy cache danh sách phim (movies:list)
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

// Xóa lịch chiếu
// Thiết kế Cache: Xóa lịch chiếu thành công sẽ thay đổi danh sách phim của người dùng, nên cũng cần xóa key cache 'movies:list' trên Redis.
export const deleteShowtime = async (id) => {
  // Ủy quyền cho showtimeService thực hiện kiểm tra đặt vé trước khi xóa
  const ok = await showtimeService.deleteShowtime(id);
  if (!ok) {
    throw new Error('Showtime not found');
  }

  // Hủy cache danh sách phim (movies:list)
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
