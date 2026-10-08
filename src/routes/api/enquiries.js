import express from 'express';
import validator from 'validator';
import dbService from '../../database/db-service.js';
import { inquiryRateLimiter, logSecurityEvent } from '../../middleware/security.js';
import { requireAuthApi, requireAdmin } from '../../middleware/auth.js';

const router = express.Router();

// Supported/Whitelisted country code pattern (e.g. +91, +971, +1, etc.)
const COUNTRY_CODE_REGEX = /^\+[1-9]\d{0,3}$/;
const PHONE_REGEX = /^[0-9\-\s\(\)]{7,15}$/;

// POST /api/enquiries (Public form submission with rate limiting, bot honeypot, DPDP consent & strict bounds)
router.post('/', inquiryRateLimiter, async (req, res) => {
  const {
    full_name,
    email,
    country_code = '+91',
    mobile_number,
    company_name,
    product_variety,
    quantity,
    destination,
    message,
    dpdp_consent,
    bot_honey // Honeypot field - must be empty
  } = req.body;

  // Bot detection: If honeypot is filled, silently discard without DB insertion (OWASP A04)
  if (bot_honey) {
    logSecurityEvent('BOT_HONEYPOT_TRIGGERED', 'Spam bot attempted submission with filled honeypot.', null, req, 'WARN');
    return res.status(200).json({
      success: true,
      message: 'Thank you for your enquiry. Our team will contact you shortly.'
    });
  }

  // 1. Mandatory DPDP Consent Check
  const hasConsent = dpdp_consent === true || dpdp_consent === 'true' || dpdp_consent === 'on';
  if (!hasConsent) {
    return res.status(400).json({
      success: false,
      error: 'You must provide consent for VPSA YOGA to process your contact details for quotation and logistics purposes.'
    });
  }

  // 2. Full Name validation (2 to 100 characters)
  if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2 || full_name.trim().length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid full name (between 2 and 100 characters).'
    });
  }

  // 3. Email validation
  if (!email || typeof email !== 'string' || !validator.isEmail(email.trim()) || email.trim().length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address (up to 100 characters).'
    });
  }

  // 4. Country Code validation
  const cleanCountryCode = String(country_code || '+91').trim();
  if (!COUNTRY_CODE_REGEX.test(cleanCountryCode)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid international dialing code (e.g. +91, +971, +1).'
    });
  }

  // 5. Mobile Number validation
  const cleanMobile = String(mobile_number || '').trim();
  if (!cleanMobile || !PHONE_REGEX.test(cleanMobile)) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid contact phone number (7 to 15 digits).'
    });
  }

  // 6. Message validation (5 to 2000 characters)
  if (!message || typeof message !== 'string' || message.trim().length < 5 || message.trim().length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Please provide inquiry details (between 5 and 2000 characters).'
    });
  }

  // 7. Optional fields length bounding
  const cleanCompany = company_name && typeof company_name === 'string' ? company_name.trim().slice(0, 100) : null;
  const cleanVariety = product_variety && typeof product_variety === 'string' ? product_variety.trim().slice(0, 50) : null;
  const cleanQuantity = quantity && typeof quantity === 'string' ? quantity.trim().slice(0, 50) : null;
  const cleanDestination = destination && typeof destination === 'string' ? destination.trim().slice(0, 100) : null;

  try {
    // Resolve client IP safely via trust proxy setting
    const ipAddress = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    const created = await dbService.createInquiry({
      full_name: full_name.trim(),
      email: email.trim(),
      country_code: cleanCountryCode,
      mobile_number: cleanMobile,
      company_name: cleanCompany,
      product_variety: cleanVariety,
      quantity: cleanQuantity,
      destination: cleanDestination,
      message: message.trim(),
      ip_address: String(ipAddress)
    });

    logSecurityEvent(
      'NEW_ENQUIRY_RECEIVED',
      `New wholesale enquiry received from ${full_name.trim()} (${cleanCompany || 'Individual'})`,
      null,
      req,
      'INFO'
    );

    // Minimal privacy-conscious response (No internal IDs, PII or IP address reflection)
    return res.status(201).json({
      success: true,
      message: 'Your wholesale enquiry has been submitted successfully. Our team will contact you within 24 hours.'
    });
  } catch (err) {
    console.error('Enquiry submission error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record your inquiry. Please contact our trade desk directly.'
    });
  }
});

// GET /api/enquiries (Admin Only - List Inquiries with RBAC)
router.get('/', requireAuthApi, requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const list = await dbService.getInquiries(status);
    return res.json({
      success: true,
      data: list
    });
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve inquiries.'
    });
  }
});

// PATCH /api/enquiries/:id/status (Admin Only - Update Status with RBAC)
router.patch('/:id/status', requireAuthApi, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['new', 'contacted', 'in_review', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value.'
    });
  }

  try {
    await dbService.updateInquiryStatus(id, status);
    logSecurityEvent(
      'ENQUIRY_STATUS_UPDATED',
      `Admin '${req.user.username}' updated enquiry #${id} status to '${status}'`,
      req.user.id,
      req,
      'INFO'
    );

    return res.json({
      success: true,
      message: `Enquiry status updated to ${status}.`
    });
  } catch (err) {
    console.error('Error updating inquiry status:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update inquiry status.'
    });
  }
});

// DELETE /api/enquiries/:id (Admin Only - Delete Inquiry with RBAC)
router.delete('/:id', requireAuthApi, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await dbService.deleteInquiry(id);
    logSecurityEvent(
      'ENQUIRY_DELETED',
      `Admin '${req.user.username}' deleted enquiry #${id}`,
      req.user.id,
      req,
      'INFO'
    );

    return res.json({
      success: true,
      message: 'Enquiry deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting enquiry:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete inquiry.'
    });
  }
});

export default router;
