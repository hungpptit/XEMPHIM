import { User } from '../models/index.js';
import bcrypt from 'bcrypt';
import * as jwtUtil from '../utils/jwt.js';

const SALT_ROUNDS = 10;

export const login = async (email, password) => {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return null;

  const token = jwtUtil.sign({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone_number: user.phone_number,
      role: user.role
    }
  };
};

export const register = async ({ full_name, email, password, phone }) => {
  const exists = await User.findOne({ where: { email } });
  if (exists) throw new Error('Email already registered');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    full_name,
    email,
    password_hash: hash,
    phone_number: phone || null,
    role: 'customer',
    created_at: new Date()
  });

  const token = jwtUtil.sign({
    id: user.id,
    email: user.email,
    role: user.role
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone_number: user.phone_number,
      role: user.role
    }
  };
};

export const userFromToken = async (token) => {
  try {
    const payload = jwtUtil.verify(token);
    if (!payload || !payload.id) return null;

    const user = await User.findByPk(payload.id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone_number: user.phone_number,
      role: user.role
    };
  } catch (err) {
    return null;
  }
};
