export const adminAuth = (req, res, next) => {
  const role = req.headers['x-user-role'];
  if (role === 'admin') {
    return next();
  }
  res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};
