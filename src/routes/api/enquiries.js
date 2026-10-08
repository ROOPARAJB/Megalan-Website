import express from 'express';
import validator from 'validator';
import dbService from '../../database/db-service.js';
import { inquiryRateLimiter, logSecurityEvent } from '../../middleware/security.js';
import { requireAuthApi } from '../../middleware/auth.js';

const router = express.Router();

// POST /api/enquiries (Public form submission with rate limiting and bot honeypot)
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
    bot_honey // Honeypot field - must be empty
  } = req.body;

  // Bot detection: If honeypot is filled, silently discard or reject
  if (bot_honey) {
    logSecurityEvent('BOT_HONEYPOT_TRIGGERED', 'Spam bot attempted submission with filled honeypot.', null, req, 'WARN');
    return res.status(200).json({
      success: true,
      message: 'Thank you for your enquiry. Our team will contact you shortly.'
    });
  }

  // Mandatory fields validation
  if (!full_name || full_name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Please enter your full name.'
    });
  }

  if (!email || !validator.isEmail(email.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid email address.'
    });
  }

  if (!mobile_number || mobile_number.trim().length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid contact phone number.'
    });
  }

  if (!message || message.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'Please provide details in your message.'
    });
  }

  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const created = await dbService.createInquiry({
      full_name: full_name.trim(),
      email: email.trim(),
      country_code: country_code.trim(),
      mobile_number: mobile_number.trim(),
      company_name: company_name ? company_name.trim() : null,
      product_variety: product_variety ? product_variety.trim() : null,
      quantity: quantity ? quantity.trim() : null,
      destination: destination ? destination.trim() : null,
      message: message.trim(),
      ip_address: String(ipAddress)
    });

    logSecurityEvent(
      'NEW_ENQUIRY_RECEIVED',
      `New wholesale enquiry #${created.id} from ${full_name.trim()} (${company_name || 'Individual'})`,
      null,
      req,
      'INFO'
    );

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been sent successfully. Our logistics and wholesale team will contact you within 24 hours.',
      data: created
    });
  } catch (err) {
    console.error('Enquiry submission error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to record your inquiry. Please contact us directly via WhatsApp or Email.'
    });
  }
});

// GET /api/enquiries (Admin Only - List Inquiries)
router.get('/', requireAuthApi, async (req, res) => {
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

// PATCH /api/enquiries/:id/status (Admin Only - Update Status)
router.patch('/:id/status', requireAuthApi, async (req, res) => {
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

// DELETE /api/enquiries/:id (Admin Only)
router.delete('/:id', requireAuthApi, async (req, res) => {
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
