const mssql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend folder
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  user: process.env.DB_USERNAME || process.env.DB_USER || 'sa',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || process.env.SA_PASSWORD,
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || 'master',
  options: {
    encrypt: (process.env.DB_ENCRYPT || 'false').toLowerCase() === 'true',
    trustServerCertificate: (process.env.DB_TRUST_SERVER_CERT || 'true').toLowerCase() === 'true'
  },
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10)
  }
};

module.exports = {
  mssql,
  config,
  connect: async function() {
    const pool = await mssql.connect(config);
    return pool; // caller should close pool if needed: await pool.close();
  }
};
