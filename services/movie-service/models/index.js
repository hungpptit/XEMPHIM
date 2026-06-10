import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import MovieModel from './movie.js';
import GenreModel from './genre.js';
import MovieGenreModel from './movie_genre.js';
import ShowtimeModel from './showtime.js';
import CinemaHallModel from './cinema_hall.js';
import SeatModel from './seat.js';
import CinemaModel from './cinema.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.MOVIE_DB_NAME) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const sequelize = new Sequelize(
  process.env.MOVIE_DB_NAME || 'XemPhim_Movie',
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
const Cinema = CinemaModel(sequelize, DataTypes);

// Associations
Cinema.hasMany(CinemaHall, { foreignKey: 'cinema_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
CinemaHall.belongsTo(Cinema, { foreignKey: 'cinema_id' });

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
  Seat,
  Cinema
};
