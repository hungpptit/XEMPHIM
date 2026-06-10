/**
 * Admin Authentication Middleware for User Service
 * Checks if the request is coming from an Admin
 */
export const adminAuth = (req, res, next) => {
  // Check headers injected by API Gateway
  const role = req.headers['x-user-role'];
  
  if (role === 'admin') {
    return next();
  }
  
  // Fallback: check session/cookies if gateway headers are missing (local testing)
  // But usually in this architecture, gateway handles the auth and passes headers.
  
  res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};
