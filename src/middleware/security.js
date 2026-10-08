import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';
import db from '../database/db.js';

/**
 * Helmet Security Headers Configuration
 * Enforces OWASP A05 (Security Misconfiguration) & A03 (Injection) mitigations
 */
export const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https://translate.google.com", "https://translate.googleapis.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://translate.google.com",
          "https://translate.googleapis.com",
          "https://translate-pa.googleapis.com"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://translate.googleapis.com",
          "https://www.gstatic.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
          "data:"
        ],
        imgSrc: ["'self'", "data:", "blob:", "https:", "https://translate.google.com", "https://www.google.com", "https://www.gstatic.com"],
        mediaSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: [
          "'self'",
          "https://translate.google.com",
          "https://translate.googleapis.com",
          "https://translate-pa.googleapis.com"
        ],
        frameSrc: ["'self'", "https://translate.google.com", "https://translate.googleapis.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  });
};

/**
 * Global Rate Limiter (DDoS / Scraping Protection)
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again in 15 minutes.'
  }
});

/**
 * Auth Rate Limiter (Brute-force protection)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Too many login attempts. Account temporarily locked for 15 minutes.'
  }
});

/**
 * Inquiry Submission Rate Limiter (Spam Protection)
 */
export const inquiryRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: 'Submission rate limit reached. Please wait before submitting another quote inquiry.'
  }
});

/**
 * Deep Input Sanitization (XSS & Injection Protection - OWASP A03)
 */
export const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeValue = (val, key = '') => {
      // Don't strip passwords to preserve special characters and hashes
      if (key && (key.toLowerCase().includes('password') || key === 'bot_honey')) {
        return val;
      }
      if (typeof val === 'string') {
        // Strip out HTML tags and malicious payloads
        return sanitizeHtml(val.trim(), {
          allowedTags: [], // Strip all HTML tags
          allowedAttributes: {}
        });
      }
      if (typeof val === 'object' && val !== null) {
        for (const k in val) {
          val[k] = sanitizeValue(val[k], k);
        }
      }
      return val;
    };

    for (const key in req.body) {
      req.body[key] = sanitizeValue(req.body[key], key);
    }
  }
  next();
};

/**
 * Audit Logging Helper (OWASP A09 - Security Logging & Monitoring)
 */
export const logSecurityEvent = (eventType, description, userId = null, req = null, severity = 'INFO') => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : null;
    const userAgent = req ? (req.headers['user-agent'] || 'UNKNOWN') : null;

    db.prepare(`
      INSERT INTO audit_logs (event_type, description, user_id, ip_address, user_agent, severity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(eventType, description, userId, String(ipAddress), String(userAgent), severity);
  } catch (err) {
    // If running solely on Supabase or SQLite migration in progress
    console.warn('[AUDIT LOG]', eventType, description);
  }
};
