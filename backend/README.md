# Backend (skeleton) for XEMPHIM

This folder contains a recommended backend structure that pairs with the existing frontend in `frontend/`.

Purpose: only create folder structure and placeholder files for the backend. No packages are installed by this script.

Suggested stack: Node.js + Express, PostgreSQL (or SQL Server), Sequelize/TypeORM/knex, JWT for auth.

Suggested routes (match frontend modules):
- /api/movies
- /api/showtimes
- /api/bookings
- /api/payments
- /api/users

Developer notes:
- Add DB migrations to `migrations/`.
- Add controllers in `src/controllers`, services in `src/services`, and route definitions in `src/routes`.
- Add stored procedures/migrations for payment QR sessions under `migrations/` if needed.

How to initialize (example):
1. cd backend
2. npm init -y
3. npm i express pg knex dotenv
4. Create `src/index.js` to start server

