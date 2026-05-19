import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import BookingModel from './booking.js';
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
const Payment = PaymentModel(sequelize, DataTypes);

Booking.hasMany(Payment, { foreignKey: 'booking_id', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'booking_id' });

export {
  sequelize,
  Sequelize,
  Booking,
  Payment
};
