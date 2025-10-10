import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import MovieModel from './movie.js';
import GenreModel from './genre.js';
import MovieGenreModel from './movie_genre.js';
import CinemaHallModel from './cinema_hall.js';
import SeatModel from './seat.js';
import ShowtimeModel from './showtime.js';
import BookingModel from './booking.js';
import BookingSeatModel from './booking_seat.js';
import UserModel from './user.js';
import PaymentModel from './payment.js';
import SysDiagramModel from './sysdiagram.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Khởi tạo Sequelize
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

// Gọi model init
const Movie = MovieModel(sequelize, DataTypes);
const Genre = GenreModel(sequelize, DataTypes);
const MovieGenre = MovieGenreModel(sequelize, DataTypes);
const CinemaHall = CinemaHallModel(sequelize, DataTypes);
const Seat = SeatModel(sequelize, DataTypes);
const Showtime = ShowtimeModel(sequelize, DataTypes);
const Booking = BookingModel(sequelize, DataTypes);
const BookingSeat = BookingSeatModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Payment = PaymentModel(sequelize, DataTypes);
const SysDiagram = SysDiagramModel(sequelize, DataTypes);

// Associations
Movie.hasMany(Showtime, { foreignKey: 'movie_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Showtime.belongsTo(Movie, { foreignKey: 'movie_id' });

CinemaHall.hasMany(Seat, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Seat.belongsTo(CinemaHall, { foreignKey: 'hall_id' });

// (Các quan hệ khác giữ nguyên như cũ…)

export {
  sequelize,
  Sequelize,
  Movie,
  Genre,
  MovieGenre,
  CinemaHall,
  Seat,
  Showtime,
  Booking,
  BookingSeat,
  User,
  Payment,
  SysDiagram
};
