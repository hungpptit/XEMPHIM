import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import movieRoutes from './routes/movies.js';
import adminRoutes from './routes/adminRoutes.js';
import * as models from './models/index.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const app = express();
const port = process.env.MOVIE_SERVICE_PORT || 4002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Make Sequelize models available to controllers via req.app.locals.models
app.locals.models = models;

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Movie Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/admin', adminRoutes);
import showtimeRoutes from './routes/showtimeRoutes.js';

app.use('/api/showtimes', showtimeRoutes);

// Initialize database and start server
(async () => {
  try {
    console.log('[DB] Starting database sync...');
    await models.sequelize.sync({ alter: false, logging: (sql) => console.log('[SQL]', sql) });
    console.log('✅ Database synced successfully');
    console.log('[DB] Available models:', Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize'));
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    console.error('❌ Full error:', error);
  }

  app.listen(port, () => {
    console.log(`🎬 Movie Catalog Service listening on port ${port}`);
  });
})();
