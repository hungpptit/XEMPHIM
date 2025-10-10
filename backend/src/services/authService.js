const db = require('../models');
const bcrypt = require('bcrypt');
const jwtUtil = require('../utils/jwt');

const SALT_ROUNDS = 10;

exports.login = async (email, password) => {
  const user = await db.User.findOne({ where: { email } });
  if(!user) return null;
  const match = await bcrypt.compare(password, user.password_hash);
  if(!match) return null;
  const token = jwtUtil.sign({ id: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, full_name: user.full_name, phone_number: user.phone_number } };
};

exports.register = async ({ full_name, email, password, phone }) => {
  const exists = await db.User.findOne({ where: { email } });
  if(exists) throw new Error('Email already registered');
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  // default role to 'customer' (DB CHECK allows 'admin' or 'customer')
  const user = await db.User.create({ full_name, email, password_hash: hash, phone_number: phone || null, role: 'customer', created_at: new Date() });
  // return token + user so frontend can auto-login after register if desired
  const token = jwtUtil.sign({ id: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, full_name: user.full_name, phone_number: user.phone_number } };
};

exports.userFromToken = async (token) => {
  try{
    const payload = jwtUtil.verify(token);
    if(!payload || !payload.id) return null;
    const user = await db.User.findByPk(payload.id);
    if(!user) return null;
    return { id: user.id, email: user.email, full_name: user.full_name, phone_number: user.phone_number };
  }catch(err){
    return null;
  }
};
