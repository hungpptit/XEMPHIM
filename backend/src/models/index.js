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
Movie.hasMany(Showtime, { foreignKey: 'movie_id' });
Showtime.belongsTo(Movie, { foreignKey: 'movie_id' });

CinemaHall.hasMany(Seat, { foreignKey: 'hall_id' });
Seat.belongsTo(CinemaHall, { foreignKey: 'hall_id' });

CinemaHall.hasMany(Showtime, { foreignKey: 'hall_id' });
Showtime.belongsTo(CinemaHall, { foreignKey: 'hall_id' });

Movie.belongsToMany(Genre, { through: MovieGenre, foreignKey: 'movie_id', otherKey: 'genre_id' });
Genre.belongsToMany(Movie, { through: MovieGenre, foreignKey: 'genre_id', otherKey: 'movie_id' });

User.hasMany(Booking, { foreignKey: 'user_id' });
Booking.belongsTo(User, { foreignKey: 'user_id' });

Showtime.hasMany(Booking, { foreignKey: 'showtime_id' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id' });

Booking.hasMany(BookingSeat, { foreignKey: 'booking_id' });
BookingSeat.belongsTo(Booking, { foreignKey: 'booking_id' });

Seat.hasMany(BookingSeat, { foreignKey: 'seat_id' });
BookingSeat.belongsTo(Seat, { foreignKey: 'seat_id' });

Booking.hasOne(Payment, { foreignKey: 'booking_id' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id' });

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
