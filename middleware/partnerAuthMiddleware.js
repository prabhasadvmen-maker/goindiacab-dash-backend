import jwt from 'jsonwebtoken';
import Partner from '../models/Partner.js';

export const protectPartner = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const partner = await Partner.findById(decoded.id).select('-password');
      if (!partner) {
        return res.status(401).json({ success: false, message: 'Not authorized, partner not found.' });
      }

      req.partner = partner;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Not authorized, token failed.' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided.' });
  }
};
