const { connect, mssql, config } = require('./connection');

(async function() {
  console.log('Testing DB connection with config:', {
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    encrypt: config.options.encrypt,
    trustServerCertificate: config.options.trustServerCertificate
  });

  let pool;
  try {
    pool = await connect();
    const result = await pool.request().query('SELECT GETDATE() as now');
    console.log('Connection successful. Server time:', result.recordset[0].now);
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err.message || err);
    if (pool && pool.close) await pool.close();
    process.exit(2);
  }
})();
