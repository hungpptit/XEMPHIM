import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import SeatModel from './seat.js';
import CinemaHallModel from './cinema_hall.js';
import ShowtimeModel from './showtime.js';
import BookingModel from './booking.js';
import BookingSeatModel from './booking_seat.js';

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

const Seat = SeatModel(sequelize, DataTypes);
const CinemaHall = CinemaHallModel(sequelize, DataTypes);
const Showtime = ShowtimeModel(sequelize, DataTypes);
const Booking = BookingModel(sequelize, DataTypes);
const BookingSeat = BookingSeatModel(sequelize, DataTypes);

// Associations
CinemaHall.hasMany(Seat, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Seat.belongsTo(CinemaHall, { foreignKey: 'hall_id' });

Booking.hasMany(BookingSeat, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Booking, { foreignKey: 'booking_id' });

Seat.hasMany(BookingSeat, { foreignKey: 'seat_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Seat, { foreignKey: 'seat_id' });

Showtime.hasMany(Booking, { foreignKey: 'showtime_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id' });

export {
  sequelize,
  Sequelize,
  Seat,
  CinemaHall,
  Showtime,
  Booking,
  BookingSeat
};
