import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protectUser = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.role !== 'user') {
        return res.status(401).json({ success: false, message: 'Not authorized.' });
      }

      // Reject refresh tokens used as access tokens
      if (decoded.type === 'refresh') {
        return res.status(401).json({ success: false, message: 'Invalid token type. Use access token.' });
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found.' });
      }
      if (user.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
      }
      if (user.invalidatedTokens && user.invalidatedTokens.includes(token)) {
        return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired. Please refresh your session.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({ success: false, message: 'Not authorized, token failed.' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
  }
};
