import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';
import Admin from '../models/Admin.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let superadmin = await SuperAdmin.findById(decoded.id).select('-password');
      if (!superadmin) {
        superadmin = await Admin.findById(decoded.id).select('-password');
      }

      if (!superadmin) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      req.superadmin = superadmin;
      next();
    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};
