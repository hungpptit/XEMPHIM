/**
 * Admin Authorization Middleware
 * Checks if user has 'admin' role in x-user-role header
 * This header is injected by API Gateway from JWT token
 */
export const adminAuth = (req, res, next) => {
  try {
    const userRole = req.headers['x-user-role'];
    
    if (!userRole || userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.',
        code: 'ADMIN_REQUIRED'
      });
    }
    
    const userId = req.headers['x-user-id'];
    req.userId = userId; // Attach to request for logging purposes
    
    console.log(`✅ Admin access granted for user ID: ${userId}`);
    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};
