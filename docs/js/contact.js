/**
 * VPSA YOGA - Enterprise Contact & RFQ Form Engine
 * Multi-device Supabase Direct Cloud Sync, Input Validation & Real-time Feedback.
 */

// Disposable & Temporary Mail Blacklist Domains
const BLOCKED_EMAIL_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'tempmail.net', 'temp-mail.org',
  'mailinator.com', 'guerrillamail.com', 'guerrillamailblock.com', 'guerrillamail.org',
  'guerrillamail.biz', 'guerrillamail.info', 'grr.la', 'sharklasers.com', 'throwawaymail.com',
  'yopmail.com', 'yopmail.net', 'dispostable.com', 'trashmail.com', 'trashmail.net',
  'getairmail.com', 'mohmal.com', 'maildrop.cc', 'mintemail.com', 'fakeinbox.com',
  'fakemailgenerator.com', 'crazymailing.com', 'generator.email', 'tempinbox.com',
  'mytemp.email', 'inboxbear.com', 'emailondeck.com', 'burnermail.io', 'getnada.com',
  'abcvg.com', 'dropmail.me', 'tempail.com', 'clipmail.eu', 'moakt.com', 'mytempemail.com',
  'nada.ltd', 'inboxkitten.com', 'spam4.me', 'trashmail.de', 'tempmailaddress.com'
]);

// Helper to display error on a specific form field
function setFieldError(field, message) {
  if (!field) return;
  field.classList.add('input-error');

  const formGroup = field.closest('.form-group') || field.parentElement;
  if (formGroup) {
    let errEl = formGroup.querySelector('.field-error-msg');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.className = 'field-error-msg';
      formGroup.appendChild(errEl);
    }
    errEl.innerHTML = `⚠️ ${message}`;
  }
}

// Helper to clear error on a specific form field
function clearFieldError(field) {
  if (!field) return;
  field.classList.remove('input-error');

  const formGroup = field.closest('.form-group') || field.parentElement;
  if (formGroup) {
    const errEl = formGroup.querySelector('.field-error-msg');
    if (errEl) {
      errEl.remove();
    }
  }
}

// Clear all errors on a form
function clearAllFormErrors(form) {
  if (!form) return;
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

// Safe Toast Display
function safeShowToast(message, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    alert(message);
  }
}

// Form Submission Core Handler
async function handleFormSubmit(e, form) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (!form) return false;

  // Guard against double / concurrent submissions
  if (form.dataset.submitting === 'true') {
    return false;
  }
  form.dataset.submitting = 'true';

  clearAllFormErrors(form);

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit';

  // 1. Honeypot Bot Defense (OWASP A04) - silent fake success if filled
  const honeyEl = form.querySelector('input[name="bot_honey"]');
  if (honeyEl && honeyEl.value.trim() !== '') {
    safeShowToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
    form.reset();
    clearAllFormErrors(form);
    if (typeof closeQuoteModal === 'function') {
      setTimeout(closeQuoteModal, 1500);
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
    form.dataset.submitting = 'false';
    return false;
  }

  // 2. Client-side Rate Limiting (~6 seconds between submissions)
  const lastSubTs = sessionStorage.getItem('vpsa_last_inquiry_ts');
  const now = Date.now();
  if (lastSubTs && (now - Number(lastSubTs)) < 6000) {
    form.dataset.submitting = 'false';
    safeShowToast('Please wait a few seconds before submitting another inquiry.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
    return false;
  }

  // Extract Form Fields
  const fullNameEl = form.querySelector('input[name="full_name"]');
  const emailEl = form.querySelector('input[name="email"]');
  const countryCodeEl = form.querySelector('select[name="country_code"]') || form.querySelector('input[name="country_code"]');
  const mobileEl = form.querySelector('input[name="mobile_number"]');
  const companyEl = form.querySelector('input[name="company_name"]');
  const varietyEl = form.querySelector('select[name="product_variety"]') || form.querySelector('input[name="product_variety"]');
  const quantityEl = form.querySelector('input[name="quantity"]');
  const destinationEl = form.querySelector('input[name="destination"]');
  const messageEl = form.querySelector('textarea[name="message"]');
  const consentEl = form.querySelector('input[name="dpdp_consent"]');

  let fullName = (fullNameEl ? fullNameEl.value : '').trim();
  let email = (emailEl ? emailEl.value : '').trim().toLowerCase();
  let countryCode = (countryCodeEl ? countryCodeEl.value : '+91').trim();
  let rawPhone = (mobileEl ? mobileEl.value : '').trim();
  let companyName = (companyEl ? companyEl.value : '').trim();
  let variety = (varietyEl ? varietyEl.value : '').trim();
  let quantity = (quantityEl ? quantityEl.value : '').trim();
  let destination = (destinationEl ? destinationEl.value : '').trim();
  let message = (messageEl ? messageEl.value : '').trim();
  let hasConsent = Boolean(consentEl && consentEl.checked);

  // Phone Normalization
  let mobileNumber = rawPhone.replace(/\D/g, '');
  if (countryCode === '+91') {
    // Strip leading 91 or 0 if entered
    if (mobileNumber.length === 12 && mobileNumber.startsWith('91')) {
      mobileNumber = mobileNumber.substring(2);
    } else if (mobileNumber.length === 11 && mobileNumber.startsWith('0')) {
      mobileNumber = mobileNumber.substring(1);
    }
  }

  let hasError = false;
  let firstErrorField = null;

  // Validate Full Name (2 to 100 characters)
  if (!fullName || fullName.length < 2 || fullName.length > 100) {
    setFieldError(fullNameEl, 'Full name is required (between 2 and 100 characters).');
    hasError = true;
    if (!firstErrorField) firstErrorField = fullNameEl;
  }

  // Validate Email (<= 100 characters, valid format, disposable domain block)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length > 100) {
    setFieldError(emailEl, 'Valid email address is required (up to 100 characters).');
    hasError = true;
    if (!firstErrorField) firstErrorField = emailEl;
  } else if (!emailRegex.test(email)) {
    setFieldError(emailEl, 'Please provide a valid email address (e.g. name@domain.com).');
    hasError = true;
    if (!firstErrorField) firstErrorField = emailEl;
  } else {
    const domain = email.split('@')[1];
    if (domain && BLOCKED_EMAIL_DOMAINS.has(domain)) {
      setFieldError(emailEl, 'Temporary disposable emails are not accepted. Please use a valid email.');
      hasError = true;
      if (!firstErrorField) firstErrorField = emailEl;
    }
  }

  // Validate Mobile Number (7 to 15 digits)
  if (!mobileNumber || mobileNumber.length < 7 || mobileNumber.length > 15) {
    setFieldError(mobileEl, 'Valid contact phone number is required (7 to 15 digits).');
    hasError = true;
    if (!firstErrorField) firstErrorField = mobileEl;
  }

  // Validate Banana Variety Fallback
  if (!variety || variety === '') {
    variety = 'All Varieties / Mixed Container';
  }

  // Validate Estimated Volume Fallback
  if (!quantity || quantity.length < 1) {
    quantity = 'Standard Wholesale Lot';
  }

  // Validate Delivery Destination Fallback
  if (!destination || destination.length < 1) {
    destination = 'Pan-India Delivery';
  }

  // Validate Message Fallback & Length (5 to 2000 characters)
  if (!message || message.length < 1) {
    message = `Wholesale inquiry for ${variety}, Volume: ${quantity}, Destination: ${destination}`;
  }
  if (message.length < 5 || message.length > 2000) {
    if (messageEl) {
      setFieldError(messageEl, 'Message must be between 5 and 2000 characters.');
    }
    hasError = true;
    if (!firstErrorField && messageEl) firstErrorField = messageEl;
  }

  // Validate Mandatory Privacy Consent (Freely Given, DPDP Act 2023)
  if (!hasConsent) {
    if (consentEl) {
      setFieldError(consentEl, 'Please accept the privacy consent checkbox to proceed.');
    }
    hasError = true;
    if (!firstErrorField) firstErrorField = consentEl;
  }

  // If validation failed, focus field and notify
  if (hasError) {
    form.dataset.submitting = 'false';
    if (firstErrorField) {
      firstErrorField.focus();
      firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    safeShowToast('Please check the highlighted fields before submitting.', 'error');
    return false;
  }

  // Construct Clean Payload with Bound Slicing and Stripping to Null
  const payload = {
    full_name: fullName.slice(0, 100),
    email: email.slice(0, 100),
    country_code: (countryCode || '+91').slice(0, 10),
    mobile_number: mobileNumber.slice(0, 20),
    company_name: companyName ? companyName.slice(0, 100) : null,
    product_variety: variety.slice(0, 50),
    quantity: quantity.slice(0, 50),
    destination: destination.slice(0, 100),
    message: message.slice(0, 2000),
    status: 'new',
    dpdp_consent: true,
    consent_at: new Date().toISOString(),
    consent_text_version: 'dpdp-v1'
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Submitting Inquiry...';
  }

  let submissionSuccess = false;

  // 1. Attempt Node Backend API First (/api/enquiries)
  try {
    const response = await fetch('/api/enquiries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const resJson = await response.json();
      if (resJson && resJson.success) {
        submissionSuccess = true;
      }
    }
  } catch (nodeErr) {
    // Cloud fallback below
  }

  // 2. Direct Supabase Cloud Sync via PostgREST (Public Anon Client Fallback)
  if (!submissionSuccess) {
    const cloudHost = 'https://sammfailpehmtxlbqmmh.supabase.co';
    const cloudPath = '/rest/v1/inquiries';
    const cloudKey = 'sb_publishable_fW8EO__Y0fyRVkflrZ4Vlw_LFH-nVN0';

    try {
      const sbRes = await fetch(cloudHost + cloudPath, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'apikey': cloudKey,
          'Authorization': `Bearer ${cloudKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      if (sbRes.ok || (sbRes.status >= 200 && sbRes.status < 300)) {
        submissionSuccess = true;
      } else if (sbRes.status === 400) {
        // Resilient fallback: in case new schema columns (consent_at, dpdp_consent) are not yet in Supabase cache
        const basePayload = {
          full_name: payload.full_name,
          email: payload.email,
          country_code: payload.country_code,
          mobile_number: payload.mobile_number,
          company_name: payload.company_name,
          product_variety: payload.product_variety,
          quantity: payload.quantity,
          destination: payload.destination,
          message: payload.message,
          status: 'new'
        };
        const retryRes = await fetch(cloudHost + cloudPath, {
          method: 'POST',
          cache: 'no-store',
          headers: {
            'apikey': cloudKey,
            'Authorization': `Bearer ${cloudKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(basePayload)
        });
        if (retryRes.ok || (retryRes.status >= 200 && retryRes.status < 300)) {
          submissionSuccess = true;
        }
      }
    } catch (sbErr) {
      // Offline fallback
    }
  }

  if (submissionSuccess) {
    sessionStorage.setItem('vpsa_last_inquiry_ts', String(Date.now()));
    safeShowToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
    form.reset();
    clearAllFormErrors(form);
    if (typeof closeQuoteModal === 'function') {
      setTimeout(closeQuoteModal, 1500);
    }
  } else {
    safeShowToast('Unable to submit inquiry right now. Please reach our Trade Desk directly at +91 9003755701 / info@vpsayoga.in.', 'error');
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }

  form.dataset.submitting = 'false';
  return false;
}

// Attach Form Handlers
function initContactForms() {
  // Pre-fill variety from URL parameter if present
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const prefilledVariety = urlParams.get('variety');
    if (prefilledVariety) {
      const varietySelect = document.querySelector('select[name="product_variety"]');
      if (varietySelect) {
        for (let i = 0; i < varietySelect.options.length; i++) {
          const opt = varietySelect.options[i];
          if (opt.value && (opt.value.toLowerCase().includes(prefilledVariety.toLowerCase()) || 
              opt.text.toLowerCase().includes(prefilledVariety.toLowerCase()) ||
              prefilledVariety.toLowerCase().includes(opt.value.toLowerCase()))) {
            varietySelect.selectedIndex = i;
            break;
          }
        }
      }
    }
  } catch (e) {}

  const forms = document.querySelectorAll('.inquiry-form');

  forms.forEach((form) => {
    // Avoid double binding
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    // Real-time keystroke filtering for Full Name
    const nameInput = form.querySelector('input[name="full_name"]');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameInput.value.trim().length >= 2) {
          clearFieldError(nameInput);
        }
      });
    }

    // Real-time keystroke filtering for Mobile Number
    const phoneInput = form.querySelector('input[name="mobile_number"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        const digitsOnly = phoneInput.value.replace(/\D/g, '');
        if (digitsOnly.length >= 7) {
          clearFieldError(phoneInput);
        }
      });
    }

    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailInput.value.includes('@') && emailInput.value.includes('.')) {
          clearFieldError(emailInput);
        }
      });
    }

    // Clear error on change for selects and other inputs
    form.querySelectorAll('select, input, textarea').forEach(field => {
      field.addEventListener('change', () => clearFieldError(field));
      field.addEventListener('input', () => {
        if (field.value.trim() !== '') clearFieldError(field);
      });
    });

    // Form Submit Handler
    form.addEventListener('submit', (e) => handleFormSubmit(e, form));
  });
}

// Self-executing initialization (works in all lifecycle phases)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForms);
} else {
  initContactForms();
}

// Global hook
window.initContactForms = initContactForms;
window.handleFormSubmit = handleFormSubmit;
