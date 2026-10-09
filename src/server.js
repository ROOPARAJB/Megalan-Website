import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { configureHelmet, globalRateLimiter, sanitizeRequestBody, logSecurityEvent } from './middleware/security.js';
import pagesRouter from './routes/pages.js';
import authRouter from './routes/api/auth.js';
import productsRouter from './routes/api/products.js';
import galleryRouter from './routes/api/gallery.js';
import enquiriesRouter from './routes/api/enquiries.js';
import auditRouter from './routes/api/audit.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable reverse proxy trust for proper client IP resolution in loggers and rate limiters
app.set('trust proxy', 1);

// 1. Security Headers via Helmet (OWASP A05)
app.use(configureHelmet());

// 2. Strict CORS Configuration with Whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://rooparajb.github.io',
      'https://vpsayoga.in',
      'https://www.vpsayoga.in'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, test suites, internal microservices)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Request Parsers with bounded payload limits (DoS prevention)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. Input Sanitization for all requests (OWASP A03)
app.use(sanitizeRequestBody);

// 5. Global Rate Limiter
app.use(globalRateLimiter);

// 6. Serve Static Assets
app.use(express.static(path.resolve(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true
}));

// 7. API Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/audit-logs', auditRouter);

// 8. Health Check / Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    application: 'VPSA YOGA Wholesale & Cold-Chain Portal',
    timestamp: new Date().toISOString()
  });
});

// 9. Page Routes
app.use('/', pagesRouter);

// 10. 404 Handler
app.use((req, res) => {
  if (req.accepts('html')) {
    res.status(404).sendFile(path.resolve(__dirname, '../views/404.html'));
  } else {
    res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }
});

// 11. Centralized Error Handler (Prevent Information Disclosure)
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);

  logSecurityEvent('UNHANDLED_EXCEPTION', `Server error at ${req.originalUrl}: ${err.message}`, req.user?.id || null, req, 'CRITICAL');

  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'An unexpected internal server error occurred.' : err.message
  });
});

// Start Server if invoked directly as the entry point
const isMainModule = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));
if (isMainModule && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🍌 VPSA YOGA Web Server Running!`);
    console.log(`🌐 Application URL: http://localhost:${PORT}`);
    console.log(`🛡️  Admin Management Portal: http://localhost:${PORT}/admin/login`);
    console.log(`====================================================`);
  });
}

export default app;
