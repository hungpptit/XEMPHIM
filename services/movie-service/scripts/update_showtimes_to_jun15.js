import { Sequelize } from 'sequelize';
import { sequelize, Showtime, Movie } from '../models/index.js';

const Op = Sequelize.Op;

const TARGET_YEAR = 2026;
const TARGET_MONTH_INDEX = 5; // June (0-based index)
const TARGET_DAY = 15;

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    const now = new Date();
    const nowStr = now.toISOString();

    const pastShowtimes = await Showtime.findAll({
      where: {
        start_time: { [Op.lt]: nowStr }
      },
      include: [
        {
          model: Movie,
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    console.log(`Found ${pastShowtimes.length} past showtime(s)`);

    let updated = 0;

    for (const st of pastShowtimes) {
      const movie = st.Movie || null;
      if (!movie) continue;

      // Only adjust for movies that are currently showing
      if (movie.status !== 'now_showing' && movie.status !== 'now-showing' && movie.status !== 'showing') {
        continue;
      }

      const origStart = new Date(st.start_time);
      const origEnd = st.end_time ? new Date(st.end_time) : null;

      const newStart = new Date(TARGET_YEAR, TARGET_MONTH_INDEX, TARGET_DAY, origStart.getHours(), origStart.getMinutes(), origStart.getSeconds(), origStart.getMilliseconds());

      // If newStart is still in the past relative to now (unlikely), set to target day plus one
      if (newStart <= now) {
        newStart.setDate(newStart.getDate() + 1);
      }

      let newEnd = null;
      if (origEnd) {
        const duration = origEnd.getTime() - origStart.getTime();
        newEnd = new Date(newStart.getTime() + duration);
      }

      await st.update({ start_time: newStart, end_time: newEnd });
      console.log(`Updated showtime id=${st.id} for movie='${movie.title}' -> ${newStart.toISOString()}`);
      updated += 1;
    }

    console.log(`Done. Updated ${updated} showtime(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Error updating showtimes:', err);
    process.exit(2);
  }
}

main();
