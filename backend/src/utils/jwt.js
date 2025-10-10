const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SECRET = process.env.JWT_SECRET || 'dev-secret';
const EXPIRES = process.env.JWT_EXPIRES_IN || '1h';

exports.sign = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
exports.verify = (token) => jwt.verify(token, SECRET);
