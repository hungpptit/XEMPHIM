import axios from 'axios';

const API = '/api/auth';

// Helper: fetch current user from /me
const getCurrentUser = async () => {
  try{
    const res = await axios.get(API + '/me', { withCredentials: true });
    return res.data.user;
  }catch(err){
    // If fails, no current user
    return null;
  }
};

const login = async ({ email, password }) => {
  console.log('[auth] login request', { email });
  // send credentials and let server set httpOnly cookie
  const res = await axios.post(API + '/login', { email, password }, { withCredentials: true });
  console.log('[auth] login response', res.data);
  // fetch /me to get user info
  const user = await getCurrentUser();
  if(user){
    try{ window.dispatchEvent(new Event('authChanged')); }catch(e){}
  }
  return { user };
};

const logout = async () => {
  try{
    await axios.post(API + '/logout', {}, { withCredentials: true });
  }catch(e){ console.warn('logout error', e); }
  // notify listeners that auth changed
  try{ window.dispatchEvent(new Event('authChanged')); }catch(e){}
  try{ window.dispatchEvent(new Event('authChanged')); }catch(e){}
  console.log('[auth] logged out');
};

const register = async ({ fullName, email, password, phone }) => {
  console.log('[auth] register request', { fullName, email, phone });
  const res = await axios.post(API + '/register', { fullName, email, password, phone }, { withCredentials: true });
  console.log('[auth] register response', res.data);
  // fetch current user and notify listeners
  const user = await getCurrentUser();
  if(user) { try{ window.dispatchEvent(new Event('authChanged')); }catch(e){} }
  return { user };
};

export default { login, logout, register, getCurrentUser };
