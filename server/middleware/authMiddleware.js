import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // The token is pulled cleanly from the cookie, not the authorization header
  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach the user to the request object, excluding the password
      req.user = await User.findById(decoded.userId).select('-password');
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
// ... existing protect middleware

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // req.user is populated by the protect middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user data missing' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }
    
    next();
  };
};