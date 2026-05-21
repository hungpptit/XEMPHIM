import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: path.join(process.cwd(), '..', '..', '.env') });
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Admin Authorization Middleware
 * Checks JWT token and validates admin privileges
 * Supports two sources:
 * 1. Authorization header (Bearer token) - from direct frontend calls
 * 2. x-user-role header - from API Gateway calls
 */
export const adminAuth = (req, res, next) => {
  try {
    // Check 1: From API Gateway (x-user-role header)
    const userRole = req.headers['x-user-role'];
    if (userRole === 'admin') {
      const userId = req.headers['x-user-id'];
      req.userId = userId;
      console.log(`✅ Admin access granted for user ID: ${userId} (via Gateway)`);
      return next();
    }

    // Check 2: From Authorization header (direct calls)
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No authorization token provided',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user has admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Access denied. Admin privileges required.',
          code: 'ADMIN_REQUIRED'
        });
      }

      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
      
      console.log(`✅ Admin access granted for user ID: ${decoded.id} (via Bearer token)`);
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};
