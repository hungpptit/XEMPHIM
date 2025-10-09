// Minimal starter for backend server
const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Placeholder route mounts (controllers to be implemented)
app.use('/api/movies', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/showtimes', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/bookings', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/payments', (req, res) => res.status(501).json({ message: 'Not implemented' }));
app.use('/api/users', (req, res) => res.status(501).json({ message: 'Not implemented' }));

app.listen(port, () => console.log(`Backend placeholder listening on ${port}`));
