import { Showtime, Movie, CinemaHall, sequelize } from '../models/index.js';
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

function formatDateTime(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.000`;
}

async function main() {
  const movies = await Movie.findAll();
  const halls = await CinemaHall.findAll();

  if (halls.length === 0) {
    console.log('No halls available.');
    process.exit(0);
  }

  const now = new Date();
  const timeSlots = [
    { h: 9, m: 0 },
    { h: 11, m: 30 },
    { h: 14, m: 0 },
    { h: 16, m: 30 },
    { h: 19, m: 0 },
    { h: 21, m: 30 }
  ];

  for (const m of movies) {
    const existingCount = await Showtime.count({ where: { movie_id: m.id } });
    if (existingCount === 0) {
      console.log(`Movie #${m.id} [${m.title}] has 0 showtimes. Creating 6 showtimes across the next 3 days...`);
      for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
        for (let slotIdx = 0; slotIdx < 2; slotIdx++) {
          const slot = timeSlots[(m.id + dayOffset * 2 + slotIdx) % timeSlots.length];
          const startTime = new Date(now);
          startTime.setDate(startTime.getDate() + dayOffset);
          startTime.setHours(slot.h, slot.m, 0, 0);

          const duration = m.duration_minutes || 120;
          const endTime = new Date(startTime.getTime() + duration * 60000);
          const hall = halls[(m.id + slotIdx) % halls.length];

          await Showtime.create({
            movie_id: m.id,
            hall_id: hall.id,
            start_time: formatDateTime(startTime),
            end_time: formatDateTime(endTime),
            base_price: 65000
          });
        }
      }
      console.log(`✅ Created showtimes for movie #${m.id}`);
    }
  }

  // Invalidate Redis cache
  if (redis) {
    const keys = await redis.keys('showtimes:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`⚡ Cleared ${keys.length} showtime cache keys in Redis`);
    }
    const movieKeys = await redis.keys('movies:*');
    if (movieKeys.length > 0) {
      await redis.del(...movieKeys);
      console.log(`⚡ Cleared ${movieKeys.length} movie cache keys in Redis`);
    }
    await redis.quit();
  }

  console.log('🎉 Hoàn tất kiểm tra và tạo lịch chiếu cho tất cả các phim!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
