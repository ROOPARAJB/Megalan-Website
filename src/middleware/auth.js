import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dbService from '../database/db-service.js';
import db from '../database/db.js';
import { logSecurityEvent } from './security.js';

// Secure JWT Secret handling: Fail-closed in production, dynamic runtime entropy in development/testing
let runtimeJwtSecret = process.env.JWT_SECRET;
if (!runtimeJwtSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable must be set in production.');
  }
  // Generate a non-deterministic 512-bit random secret for this server lifecycle
  runtimeJwtSecret = crypto.randomBytes(64).toString('hex');
}

export const getJwtSecret = () => runtimeJwtSecret;
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'vpsa_session_token';

/**
 * Authentication Middleware for API endpoints (returns JSON 401/403)
 */
export const requireAuthApi = async (req, res, next) => {
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
      const decoded = jwt.verify(token, getJwtSecret());
      let user = null;
      try {
        user = await dbService.getUserById(decoded.id);
      } catch (dbErr) {
        user = null;
      }

      if (!user) {
        try {
          user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.id);
        } catch (e) {}
      }

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
 * Role-Based Access Control Middleware (RBAC) - returns 403 Forbidden on role mismatch
 */
export const requireRole = (allowedRoles = ['admin']) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRole = req.user.role || 'editor';

    if (!roles.includes(userRole)) {
      logSecurityEvent(
        'UNAUTHORIZED_ROLE_ACCESS',
        `User '${req.user.username}' with role '${userRole}' attempted to access restricted endpoint: ${req.originalUrl}`,
        req.user.id,
        req,
        'WARN'
      );
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have sufficient administrative privileges to perform this action.'
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);

/**
 * Authentication Middleware for Page Routes (redirects to /admin/login)
 */
export const requireAuthPage = async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.redirect(`/admin/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    let user = null;
    try {
      user = await dbService.getUserById(decoded.id);
    } catch (dbErr) {
      user = db.prepare('SELECT id, username, email, role FROM users WHERE id = ?').get(decoded.id);
    }

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
