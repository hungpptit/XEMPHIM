import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import BookingModel from './booking.js';
import BookingSeatModel from './booking_seat.js';
import SeatModel from './seat.js';
import ShowtimeModel from './showtime.js';
import CinemaHallModel from './cinema_hall.js';
import MovieModel from './movie.js';
import UserModel from './user.js';
import PaymentModel from './payment.js';

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

const Booking = BookingModel(sequelize, DataTypes);
const BookingSeat = BookingSeatModel(sequelize, DataTypes);
const Seat = SeatModel(sequelize, DataTypes);
const Showtime = ShowtimeModel(sequelize, DataTypes);
const CinemaHall = CinemaHallModel(sequelize, DataTypes);
const Movie = MovieModel(sequelize, DataTypes);
const User = UserModel(sequelize, DataTypes);
const Payment = PaymentModel(sequelize, DataTypes);

// Associations
Booking.hasMany(BookingSeat, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Booking, { foreignKey: 'booking_id' });

Seat.hasMany(BookingSeat, { foreignKey: 'seat_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Seat, { foreignKey: 'seat_id' });

Showtime.hasMany(Booking, { foreignKey: 'showtime_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id' });

Showtime.belongsTo(Movie, { foreignKey: 'movie_id' });
Movie.hasMany(Showtime, { foreignKey: 'movie_id' });

Showtime.belongsTo(CinemaHall, { foreignKey: 'hall_id' });
CinemaHall.hasMany(Showtime, { foreignKey: 'hall_id' });

Booking.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Booking, { foreignKey: 'user_id' });

Booking.hasMany(Payment, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id' });

export {
  sequelize,
  Sequelize,
  Booking,
  BookingSeat,
  Seat,
  Showtime,
  CinemaHall,
  Movie,
  User,
  Payment
};
