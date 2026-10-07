import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { logSecurityEvent } from './security.js';

const JWT_SECRET = process.env.JWT_SECRET || 'c8f89e248f21950d7e7c8ab3f92d4f590bc62a348e8913b821a81dcfe55bc29938b81';
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'vpsa_session_token';

/**
 * Authentication Middleware for API endpoints (returns JSON 401/403)
 */
export const requireAuthApi = (req, res, next) => {
  const candidates = [];

  if (req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1] && parts[1] !== 'null' && parts[1] !== 'undefined') {
      candidates.push(parts[1]);
    }
  }

  if (req.cookies?.[COOKIE_NAME] && req.cookies[COOKIE_NAME] !== 'null' && req.cookies[COOKIE_NAME] !== 'undefined') {
    if (!candidates.includes(req.cookies[COOKIE_NAME])) {
      candidates.push(req.cookies[COOKIE_NAME]);
    }
  }

  if (candidates.length === 0) {
    logSecurityEvent('UNAUTHORIZED_API_ACCESS', `Unauthorized access attempt to ${req.originalUrl}`, null, req, 'WARN');
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }

  for (const token of candidates) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.id);

      if (user) {
        req.user = user;
        return next();
      }
    } catch (err) {
      // Continue to next candidate token
    }
  }

  logSecurityEvent('INVALID_TOKEN_ATTEMPT', `Invalid token supplied to ${req.originalUrl}`, null, req, 'WARN');
  res.clearCookie(COOKIE_NAME);
  return res.status(401).json({
    success: false,
    error: 'Session expired or invalid. Please log in again.'
  });
};

/**
 * Authentication Middleware for Page Routes (redirects to /admin/login)
 */
export const requireAuthPage = (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.redirect(`/admin/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      res.clearCookie(COOKIE_NAME);
      return res.redirect('/admin/login');
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.redirect('/admin/login');
  }
};
