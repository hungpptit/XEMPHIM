import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import SeatModel from './seat.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.SEAT_DB_NAME) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const sequelize = new Sequelize(
  process.env.SEAT_DB_NAME || 'XemPhim_Seat',
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

export {
  sequelize,
  Sequelize,
  Seat
};
