import API from './api';
import { mockUser } from '../mock/mockData';

// Helper: fetch current user from /me
const getCurrentUser = async () => {
  try {
    const res = await API.get('/auth/me');
    if (res.data?.user) return res.data.user;
  } catch (err) {
    // If fails, continue to fallback
  }

  // Check if user explicitly logged out
  if (localStorage.getItem('demo_logged_out') === 'true') {
    return null;
  }

  // Demo fallback: Return stored demo session
  const stored = localStorage.getItem('demo_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return mockUser;
};

const login = async ({ email, password }) => {
  console.log('[auth] login request', { email });
  localStorage.removeItem('demo_logged_out');

  try {
    const res = await API.post('/auth/login', { email, password });
    const user = res.data?.user || mockUser;
    localStorage.setItem('demo_user', JSON.stringify(user));
    try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
    return { user };
  } catch (err) {
    // Check if account was registered previously in localStorage
    let user = null;
    try {
      const registered = JSON.parse(localStorage.getItem('registered_accounts') || '[]');
      const found = registered.find(a => (a.email || '').toLowerCase() === (email || '').toLowerCase());
      if (found) {
        user = found;
      }
    } catch (e) {}

    if (!user) {
      const displayName = email ? email.split('@')[0] : 'Thành Viên Demo';
      user = {
        ...mockUser,
        id: Math.floor(1000 + Math.random() * 9000),
        name: displayName,
        fullName: displayName,
        email: email || mockUser.email,
        role: 'user'
      };
    }

    localStorage.setItem('demo_user', JSON.stringify(user));
    try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
    return { user };
  }
};

const logout = async () => {
  try {
    await API.post('/auth/logout', {});
  } catch (e) {
    console.warn('logout error', e);
  }
  localStorage.removeItem('demo_user');
  localStorage.setItem('demo_logged_out', 'true');
  try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
  console.log('[auth] logged out');
};

const register = async ({ fullName, email, password, phone }) => {
  console.log('[auth] register request', { fullName, email, phone });
  localStorage.removeItem('demo_logged_out');

  const newUser = {
    id: Math.floor(1000 + Math.random() * 9000),
    fullName: fullName || 'Thành Viên Mới',
    name: fullName || 'Thành Viên Mới',
    email: email,
    phone: phone || '0988888888',
    role: 'user'
  };

  try {
    const registered = JSON.parse(localStorage.getItem('registered_accounts') || '[]');
    registered.push(newUser);
    localStorage.setItem('registered_accounts', JSON.stringify(registered));
  } catch (e) {}

  try {
    const res = await API.post('/auth/register', { fullName, email, password, phone });
    const user = res.data?.user || newUser;
    localStorage.setItem('demo_user', JSON.stringify(user));
    try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
    return { user };
  } catch (err) {
    localStorage.setItem('demo_user', JSON.stringify(newUser));
    try { window.dispatchEvent(new Event('authChanged')); } catch (e) {}
    return { user: newUser };
  }
};

const authService = { login, logout, register, getCurrentUser };

export default authService;
