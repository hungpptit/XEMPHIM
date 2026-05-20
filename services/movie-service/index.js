import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import movieRoutes from './routes/movies.js';
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

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`[Movie Service] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/showtimes', (req, res) => {
  res.status(501).json({ message: 'Not implemented at root level. Use /api/movies/:id/showtimes instead.' });
});

app.listen(port, () => {
  console.log(`🎬 Movie Catalog Service listening on port ${port}`);
});
