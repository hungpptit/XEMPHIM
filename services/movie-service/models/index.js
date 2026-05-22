import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import MovieModel from './movie.js';
import GenreModel from './genre.js';
import MovieGenreModel from './movie_genre.js';
import ShowtimeModel from './showtime.js';
import CinemaHallModel from './cinema_hall_v2.js';
import SeatModel from './seat_v2.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.DB_NAME) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'master',
  process.env.DB_USER || 'sa',
  process.env.DB_PASS || process.env.SA_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    dialect: 'mssql',
    logging: false,
    dialectOptions: {
      options: {
        encrypt: (process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
        trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true'
      }
    }
  }
);

const Movie = MovieModel(sequelize, DataTypes);
const Genre = GenreModel(sequelize, DataTypes);
const MovieGenre = MovieGenreModel(sequelize, DataTypes);
const Showtime = ShowtimeModel(sequelize, DataTypes);
const CinemaHall = CinemaHallModel(sequelize, DataTypes);
const Seat = SeatModel(sequelize, DataTypes);

// Associations
Movie.hasMany(Showtime, { foreignKey: 'movie_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Showtime.belongsTo(Movie, { foreignKey: 'movie_id' });

CinemaHall.hasMany(Seat, { foreignKey: 'hall_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Seat.belongsTo(CinemaHall, { foreignKey: 'hall_id' });

Showtime.belongsTo(CinemaHall, { foreignKey: 'hall_id' });
CinemaHall.hasMany(Showtime, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

export {
  sequelize,
  Sequelize,
  Movie,
  Genre,
  MovieGenre,
  Showtime,
  CinemaHall,
  Seat
};
