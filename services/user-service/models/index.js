import { Sequelize, DataTypes } from 'sequelize';

// Override timezone formatting for MSSQL to prevent "Conversion failed when converting date and/or time from character string"
Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
  date = this._applyTimezone(date, options);
  return date.format('YYYY-MM-DD HH:mm:ss.SSS');
};

import path from 'path';
import dotenv from 'dotenv';
import UserModel from './user.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.USER_DB_NAME) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const sequelize = new Sequelize(
  process.env.USER_DB_NAME || 'XemPhim_User',
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

const User = UserModel(sequelize, DataTypes);

export {
  sequelize,
  Sequelize,
  User
};
