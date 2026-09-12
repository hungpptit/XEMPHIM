import { Sequelize } from 'sequelize';
import { sequelize, Showtime, Movie } from '../models/index.js';

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
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to XemPhim_Movie DB');

    const now = new Date();
    console.log(`Current time: ${now.toLocaleString()} (${formatDateTime(now)})`);

    const allShowtimes = await Showtime.findAll({
      include: [
        {
          model: Movie,
          attributes: ['id', 'title', 'status', 'duration_minutes']
        }
      ],
      order: [['id', 'ASC']]
    });

    console.log(`Found total ${allShowtimes.length} showtime(s) in DB.`);

    if (allShowtimes.length === 0) {
      console.log('No showtimes found to update.');
      process.exit(0);
    }

    let updated = 0;

    for (let i = 0; i < allShowtimes.length; i++) {
      const st = allShowtimes[i];
      const movie = st.Movie || null;

      const dayOffset = i % 7;
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + dayOffset);

      const timeSlots = [
        { h: 9, m: 0 },
        { h: 11, m: 30 },
        { h: 14, m: 0 },
        { h: 16, m: 30 },
        { h: 19, m: 0 },
        { h: 21, m: 30 }
      ];
      const slot = timeSlots[i % timeSlots.length];

      const newStart = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate(),
        slot.h,
        slot.m,
        0,
        0
      );

      if (newStart <= now) {
        newStart.setDate(newStart.getDate() + 1);
      }

      const durationMinutes = movie?.duration_minutes || 120;
      const newEnd = new Date(newStart.getTime() + durationMinutes * 60 * 1000);

      if (movie && movie.status !== 'now_showing' && movie.status !== 'coming_soon') {
        await movie.update({ status: 'now_showing' });
      }

      const startStr = formatDateTime(newStart);
      const endStr = formatDateTime(newEnd);

      await st.update({
        start_time: startStr,
        end_time: endStr
      });

      console.log(`[${i + 1}/${allShowtimes.length}] Showtime #${st.id} | Phim: '${movie?.title || 'Phim #' + st.movie_id}' | Bắt đầu: ${startStr}`);
      updated++;
    }

    console.log(`\n🎉 Cập nhật thành công ${updated} suất chiếu sang thời gian hiện tại và các ngày tới!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating showtimes:', err);
    process.exit(1);
  }
}

main();
