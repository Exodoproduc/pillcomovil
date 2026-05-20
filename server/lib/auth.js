// ════════════════════════════════════════════════════════════
//  Autenticación JWT
// ════════════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'pillco-dev-secret-change-in-prod';
const EXPIRES = '7d';

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Middleware Express
function authRequired(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    const decoded = token && verify(token);
    if (!decoded) return res.status(401).json({ error: 'No autenticado' });
    if (role && decoded.role !== role) return res.status(403).json({ error: 'Sin permiso' });
    req.user = decoded;
    next();
  };
}

module.exports = { sign, verify, authRequired };
