// Minimal starter for backend server
const express = require('express');
const app = express();
const port = process.env.PORT || 4000;
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Allow credentials for cookie-based auth from frontend dev server
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Route mounts
app.use('/api/auth', require('./routes/auth'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/showtimes', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/bookings', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/payments', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/users', (req, res) => res.status(501).json({ message: 'Not implemented' }));

app.listen(port, () => console.log(`Backend listening on ${port}`));
