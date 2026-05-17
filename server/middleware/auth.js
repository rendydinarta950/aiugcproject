const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nyarai-dev-secret-CHANGE-IN-PRODUCTION';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token. Please login again.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
