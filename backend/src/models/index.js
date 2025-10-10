const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const dbConfig = {
  username: process.env.DB_USERNAME || process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || process.env.SA_PASSWORD,
  database: process.env.DB_NAME || 'master',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 1433,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: (process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
      trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true'
    }
  },
  logging: false,
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

// Import models
const Movie = require('./movie')(sequelize, DataTypes);
const Genre = require('./genre')(sequelize, DataTypes);
const MovieGenre = require('./movie_genre')(sequelize, DataTypes);
const CinemaHall = require('./cinema_hall')(sequelize, DataTypes);
const Seat = require('./seat')(sequelize, DataTypes);
const Showtime = require('./showtime')(sequelize, DataTypes);
const Booking = require('./booking')(sequelize, DataTypes);
const BookingSeat = require('./booking_seat')(sequelize, DataTypes);
const User = require('./user')(sequelize, DataTypes);
const Payment = require('./payment')(sequelize, DataTypes);
const SysDiagram = require('./sysdiagram')(sequelize, DataTypes);

// Associations
// Movie -> Showtime: prevent deleting a Movie while Showtimes exist (use RESTRICT)
Movie.hasMany(Showtime, { foreignKey: 'movie_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Showtime.belongsTo(Movie, { foreignKey: 'movie_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// CinemaHall -> Seat: do not allow deleting a hall when seats exist (RESTRICT)
CinemaHall.hasMany(Seat, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Seat.belongsTo(CinemaHall, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// CinemaHall -> Showtime: prevent deleting a hall when showtimes exist (RESTRICT)
CinemaHall.hasMany(Showtime, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Showtime.belongsTo(CinemaHall, { foreignKey: 'hall_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// Movie <-> Genre (join table MovieGenre): cascade delete on association rows
Movie.belongsToMany(Genre, { through: MovieGenre, foreignKey: 'movie_id', otherKey: 'genre_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Genre.belongsToMany(Movie, { through: MovieGenre, foreignKey: 'genre_id', otherKey: 'movie_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// User -> Booking: if a user is removed, keep bookings for audit (SET NULL)
User.hasMany(Booking, { foreignKey: 'user_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
Booking.belongsTo(User, { foreignKey: 'user_id', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

// Showtime -> Booking: do not allow deleting a showtime with existing bookings (RESTRICT)
Showtime.hasMany(Booking, { foreignKey: 'showtime_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// Booking -> BookingSeat: deleting a booking should remove its seats (CASCADE)
Booking.hasMany(BookingSeat, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Booking, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

// Seat -> BookingSeat: prevent deleting a seat if booking records exist (RESTRICT)
Seat.hasMany(BookingSeat, { foreignKey: 'seat_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });
BookingSeat.belongsTo(Seat, { foreignKey: 'seat_id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' });

// Booking -> Payment: deleting a booking should remove its payment record (CASCADE)
Booking.hasOne(Payment, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

module.exports = {
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
