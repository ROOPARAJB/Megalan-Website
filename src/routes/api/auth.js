import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import dbService from '../../database/db-service.js';
import { authRateLimiter, logSecurityEvent } from '../../middleware/security.js';
import { requireAuthApi, getJwtSecret } from '../../middleware/auth.js';

const router = express.Router();
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'vpsa_session_token';

// Helper to generate 4 emergency backup codes
function generateBackupCodes() {
  const codes = [];
  for (let i = 0; i < 4; i++) {
    const part1 = crypto.randomInt(1000, 9999);
    const part2 = crypto.randomInt(1000, 9999);
    codes.push(`VPSA-${part1}-${part2}`);
  }
  return codes;
}

// POST /api/auth/login (Step 1: Credential Verification)
router.post('/login', authRateLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required.'
    });
  }

  try {
    const user = await dbService.getUserByUsername(username.trim());

    if (!user) {
      logSecurityEvent('FAILED_LOGIN_ATTEMPT', `Failed login attempt for nonexistent user: ${username}`, null, req, 'WARN');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials provided.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      logSecurityEvent('FAILED_LOGIN_ATTEMPT', `Incorrect password for user: ${username}`, user.id, req, 'WARN');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials provided.'
      });
    }

    // Check if 2FA is already enabled
    if (user.two_factor_enabled === 1 && user.two_factor_secret) {
      // Issue short-lived 2FA challenge token (5 min limit, strictly scoped)
      const tempToken = jwt.sign(
        { id: user.id, username: user.username, role: user.role, step: '2FA_VERIFICATION' },
        getJwtSecret(),
        { expiresIn: '5m' }
      );

      return res.json({
        success: true,
        require_2fa: true,
        setup_required: false,
        temp_token: tempToken,
        message: 'Enter the 6-digit code from Microsoft Authenticator to proceed.'
      });
    }

    // If 2FA not enabled yet, initiate First-Time Configuration Flow
    const tempSecret = generateSecret();
    await dbService.updateUser2FA(user.id, { two_factor_temp_secret: tempSecret });

    const otpauthUrl = generateURI({
      issuer: 'VPSA YOGA',
      label: user.username,
      secret: tempSecret
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: { dark: '#022c22', light: '#ffffff' }
    });

    const tempSetupToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role, step: '2FA_SETUP' },
      getJwtSecret(),
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      require_2fa: true,
      setup_required: true,
      qr_code: qrCodeDataUrl,
      secret: tempSecret,
      temp_token: tempSetupToken,
      message: 'Scan the QR code with Microsoft Authenticator and enter the generated 6-digit code.'
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal authentication server error.'
    });
  }
});

// POST /api/auth/2fa/confirm-setup (Confirm First-Time 2FA Activation)
router.post('/2fa/confirm-setup', authRateLimiter, async (req, res) => {
  const { temp_token, code } = req.body;

  if (!temp_token || !code) {
    return res.status(400).json({
      success: false,
      error: 'Temporary token and 6-digit authenticator code are required.'
    });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(temp_token, getJwtSecret());
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: 'Verification session expired. Please log in again.'
      });
    }

    if (decoded.step !== '2FA_SETUP') {
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication step sequence.'
      });
    }

    const user = await dbService.getUserById(decoded.id);
    if (!user || !user.two_factor_temp_secret) {
      return res.status(400).json({
        success: false,
        error: 'No active 2FA setup staging request found.'
      });
    }

    const cleanCode = String(code).trim().replace(/\s+/g, '');
    const verifyRes = verifySync({
      token: cleanCode,
      secret: user.two_factor_temp_secret,
      window: 1
    });
    const isValid = verifyRes && verifyRes.valid === true;

    if (!isValid) {
      logSecurityEvent('FAILED_2FA_SETUP', `Invalid 2FA setup verification code entered by user ID ${user.id}`, user.id, req, 'WARN');
      return res.status(400).json({
        success: false,
        error: 'Invalid 6-digit code. Please check Microsoft Authenticator and enter the current code.'
      });
    }

    // Generate emergency backup recovery codes
    const backupCodes = generateBackupCodes();

    // Activate 2FA on account
    await dbService.updateUser2FA(user.id, {
      two_factor_secret: user.two_factor_temp_secret,
      two_factor_enabled: 1,
      two_factor_temp_secret: null,
      two_factor_backup_codes: JSON.stringify(backupCodes),
      last_login_at: new Date().toISOString()
    });

    // Sign full 8-hour admin session token
    const fullSessionToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, fullSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    logSecurityEvent('2FA_ACTIVATED', `Admin '${user.username}' successfully configured & activated 2FA.`, user.id, req, 'INFO');

    return res.json({
      success: true,
      message: 'Two-Factor Authentication activated successfully!',
      backup_codes: backupCodes,
      token: fullSessionToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('2FA Confirm Setup error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify and activate Two-Factor Authentication.'
    });
  }
});

// POST /api/auth/2fa/verify (Step 2: Authenticate with 6-Digit Code or Backup Code)
router.post('/2fa/verify', authRateLimiter, async (req, res) => {
  const { temp_token, code } = req.body;

  if (!temp_token || !code) {
    return res.status(400).json({
      success: false,
      error: 'Temporary token and authenticator code are required.'
    });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(temp_token, getJwtSecret());
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: 'Verification session expired. Please log in again.'
      });
    }

    if (decoded.step !== '2FA_VERIFICATION') {
      return res.status(400).json({
        success: false,
        error: 'Invalid authentication step sequence.'
      });
    }

    const user = await dbService.getUserById(decoded.id);
    if (!user || !user.two_factor_secret) {
      return res.status(400).json({
        success: false,
        error: 'Two-factor configuration missing for this account.'
      });
    }

    const cleanInput = String(code).trim().replace(/\s+/g, '');
    let isAuthorized = false;
    let usedBackupCode = false;

    // 1. Check TOTP Code
    if (/^\d{6}$/.test(cleanInput)) {
      const verifyRes = verifySync({
        token: cleanInput,
        secret: user.two_factor_secret,
        window: 1
      });
      isAuthorized = verifyRes && verifyRes.valid === true;
    }

    // 2. Check Emergency Backup Code Fallback
    if (!isAuthorized && user.two_factor_backup_codes) {
      try {
        const storedCodes = JSON.parse(user.two_factor_backup_codes);
        const matchIdx = storedCodes.findIndex(c => c.toUpperCase() === cleanInput.toUpperCase());
        if (matchIdx !== -1) {
          isAuthorized = true;
          usedBackupCode = true;
          // Consume the one-time recovery code
          storedCodes.splice(matchIdx, 1);
          await dbService.updateUser2FA(user.id, {
            two_factor_backup_codes: JSON.stringify(storedCodes)
          });
          logSecurityEvent('BACKUP_CODE_USED', `Admin '${user.username}' used one-time emergency backup code to log in.`, user.id, req, 'WARN');
        }
      } catch (e) {}
    }

    if (!isAuthorized) {
      logSecurityEvent('FAILED_2FA_VERIFICATION', `Invalid 2FA verification code entered for user '${user.username}'`, user.id, req, 'WARN');
      return res.status(401).json({
        success: false,
        error: 'Invalid authenticator code. Please check Microsoft Authenticator and try again.'
      });
    }

    // Update last login
    await dbService.updateUserLogin(user.id);

    // Sign full 8-hour admin session token
    const fullSessionToken = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: '8h' }
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, fullSessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000
    });

    logSecurityEvent('SUCCESSFUL_2FA_LOGIN', `Admin '${user.username}' authenticated with Two-Factor Authentication.`, user.id, req, 'INFO');

    return res.json({
      success: true,
      message: 'Authentication successful.',
      used_backup_code: usedBackupCode,
      token: fullSessionToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('2FA Verify error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during 2FA verification.'
    });
  }
});

// GET /api/auth/2fa/status (Admin only: Check 2FA setup status)
router.get('/2fa/status', requireAuthApi, async (req, res) => {
  const user = await dbService.getUserById(req.user.id);
  return res.json({
    success: true,
    two_factor_enabled: user ? Boolean(user.two_factor_enabled) : false
  });
});

// POST /api/auth/2fa/reconfigure (Admin only: Generate new QR code to re-link Microsoft Authenticator)
router.post('/2fa/reconfigure', requireAuthApi, async (req, res) => {
  try {
    const tempSecret = generateSecret();
    await dbService.updateUser2FA(req.user.id, { two_factor_temp_secret: tempSecret });

    const otpauthUrl = generateURI({
      issuer: 'VPSA YOGA',
      label: req.user.username,
      secret: tempSecret
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 260,
      color: { dark: '#022c22', light: '#ffffff' }
    });

    const tempToken = jwt.sign(
      { id: req.user.id, username: req.user.username, role: req.user.role, step: '2FA_SETUP' },
      getJwtSecret(),
      { expiresIn: '10m' }
    );

    return res.json({
      success: true,
      qr_code: qrCodeDataUrl,
      secret: tempSecret,
      temp_token: tempToken
    });
  } catch (err) {
    console.error('2FA Reconfigure error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate re-configuration QR code.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      logSecurityEvent('USER_LOGOUT', `User ID ${decoded.id} logged out.`, decoded.id, req, 'INFO');
    } catch (e) {}
  }
  res.clearCookie(COOKIE_NAME);
  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
});

// GET /api/auth/me
router.get('/me', requireAuthApi, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuthApi, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required.'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long.'
    });
  }

  const user = await dbService.getUserById(req.user.id);
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: 'Current password does not match.'
    });
  }

  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(newPassword, salt);
  await dbService.updateUserPassword(req.user.id, hash);

  logSecurityEvent('PASSWORD_CHANGED', `User ID ${req.user.id} updated their password.`, req.user.id, req, 'INFO');

  return res.json({
    success: true,
    message: 'Password changed successfully.'
  });
});

export default router;
