const authService = require('../services/authService');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try{
    const result = await authService.login(email, password);
    if(!result) return res.status(401).json({ message: 'Invalid credentials' });
    // set token as httpOnly cookie
    res.cookie('access_token', result.token, { httpOnly: true, sameSite: 'Lax' });
    res.json({ user: result.user });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.register = async (req, res) => {
  // Accept either full_name (snake_case) or fullName (camelCase) from frontend
  const { full_name, fullName, email, password, phone } = req.body;
  const name = full_name || fullName;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields: full_name/fullName, email, password' });
  }
  try{
  const result = await authService.register({ full_name: name, email, password, phone });
    // result contains { token, user }
    res.cookie('access_token', result.token, { httpOnly: true, sameSite: 'Lax' });
    res.status(201).json({ user: result.user });
  }catch(err){
    console.error(err);
    if(err.message && err.message.includes('Email already registered')){
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

exports.me = async (req, res) => {
  try{
    // read token from cookie
    const token = req.cookies && req.cookies.access_token;
    if(!token) return res.status(401).json({ message: 'Not authenticated' });
    const user = await authService.userFromToken(token);
    if(!user) return res.status(401).json({ message: 'Not authenticated' });
    res.json({ user });
  }catch(err){
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('access_token');
  res.json({ ok: true });
};
