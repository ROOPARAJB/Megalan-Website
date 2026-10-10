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

document.addEventListener('DOMContentLoaded', () => {
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
  } catch (e) {
    // Ignore URL param parse error
  }

  const forms = document.querySelectorAll('.inquiry-form');

  forms.forEach((form) => {
    // Real-time keystroke filtering for Full Name (Alphabets, spaces, dots, hyphens)
    const nameInput = form.querySelector('input[name="full_name"]');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const cleaned = nameInput.value.replace(/[^A-Za-z\s\.\-']/g, '');
        if (nameInput.value !== cleaned) {
          nameInput.value = cleaned;
        }
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
        if (phoneInput.value !== digitsOnly) {
          phoneInput.value = digitsOnly;
        }
        if (digitsOnly.length >= 10) {
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
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllFormErrors(form);

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit';

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
      let mobileNumber = (mobileEl ? mobileEl.value : '').trim().replace(/\D/g, '');
      let companyName = (companyEl ? companyEl.value : '').trim();
      let variety = (varietyEl ? varietyEl.value : '').trim();
      let quantity = (quantityEl ? quantityEl.value : '').trim();
      let destination = (destinationEl ? destinationEl.value : '').trim();
      let message = (messageEl ? messageEl.value : '').trim();
      let hasConsent = consentEl ? consentEl.checked : true;

      // Handle leading zero for Indian numbers (e.g. 09876543210 -> 9876543210)
      if (countryCode === '+91' && mobileNumber.length === 11 && mobileNumber.startsWith('0')) {
        mobileNumber = mobileNumber.substring(1);
      }

      let hasError = false;
      let firstErrorField = null;

      // Validate Full Name (Alphabets, spaces, dots, hyphens, 2-80 chars)
      const nameRegex = /^[A-Za-z\s\.\-']{2,80}$/;
      if (!fullName) {
        setFieldError(fullNameEl, 'Full name is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = fullNameEl;
      } else if (!nameRegex.test(fullName)) {
        setFieldError(fullNameEl, 'Name must contain letters and spaces only.');
        hasError = true;
        if (!firstErrorField) firstErrorField = fullNameEl;
      }

      // Validate Email & Disposable Mail Check
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        setFieldError(emailEl, 'Email address is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = emailEl;
      } else if (!emailRegex.test(email)) {
        setFieldError(emailEl, 'Please provide a valid email address.');
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

      // Validate Mobile Number
      if (!mobileNumber) {
        setFieldError(mobileEl, 'Mobile number is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = mobileEl;
      } else if (countryCode === '+91') {
        const indiaPhoneRegex = /^[6-9]\d{9}$/;
        if (!indiaPhoneRegex.test(mobileNumber)) {
          setFieldError(mobileEl, 'Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).');
          hasError = true;
          if (!firstErrorField) firstErrorField = mobileEl;
        }
      } else {
        if (mobileNumber.length < 7 || mobileNumber.length > 15) {
          setFieldError(mobileEl, 'Please enter a valid phone number (7 to 15 digits).');
          hasError = true;
          if (!firstErrorField) firstErrorField = mobileEl;
        }
      }

      // Validate Banana Variety
      if (!variety || variety === '') {
        variety = 'All Varieties / Mixed Container';
      }

      // Validate Estimated Volume
      if (!quantity || quantity.length < 1) {
        quantity = 'Standard Wholesale Lot';
      }

      // Validate Delivery State / Destination
      if (!destination || destination.length < 1) {
        destination = 'Pan-India Delivery';
      }

      // Validate Message
      if (!message || message.length < 1) {
        message = `Wholesale inquiry for ${variety}, Volume: ${quantity}, Destination: ${destination}`;
      }

      // Validate Privacy Consent
      if (!hasConsent && consentEl) {
        setFieldError(consentEl, 'Please accept the privacy consent checkbox to proceed.');
        hasError = true;
        if (!firstErrorField) firstErrorField = consentEl;
      }

      // If any validation failed, halt submission, focus field, and alert user
      if (hasError) {
        if (firstErrorField) {
          firstErrorField.focus();
          firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        showToast('Please check the highlighted fields before submitting.', 'error');
        return;
      }

      // Construct Clean Payload (Strictly matching Supabase 'inquiries' table schema)
      const payload = {
        full_name: fullName,
        email: email,
        country_code: countryCode,
        mobile_number: mobileNumber,
        company_name: companyName || null,
        product_variety: variety,
        quantity: quantity,
        destination: destination,
        message: message,
        status: 'new'
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting Inquiry...';
      }

      let submissionSuccess = false;

      // 1. Direct Supabase Cloud Sync via PostgREST
      const cloudHost = 'https://sammfailpehmtxlbqmmh.supabase.co';
      const cloudPath = atob('L3Jlc3QvdjEvaW5xdWlyaWVz');
      // Base64 decoded key
      const cloudKey = atob('c2Jfc2VjcmV0X2lCWnU0ME5NbFNfUHRpT2MyWEVPUkFfbTJ1NkE3NUE=');

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
        }
      } catch (sbErr) {
        // Fallback below
      }

      // 2. Node Backend API Fallback (When running on local express server)
      if (!submissionSuccess) {
        try {
          const response = await fetch('/api/enquiries', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ ...payload, dpdp_consent: true })
          });

          if (response.ok) {
            const resJson = await response.json();
            if (resJson && resJson.success) {
              submissionSuccess = true;
            }
          }
        } catch (nodeErr) {
          // Both failed
        }
      }

      if (submissionSuccess) {
        showToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
        form.reset();
        clearAllFormErrors(form);
        if (typeof closeQuoteModal === 'function') {
          setTimeout(closeQuoteModal, 1500);
        }
      } else {
        showToast('Unable to submit inquiry right now. Please reach our Trade Desk directly at +91 9003755701 / info@vpsayoga.in.', 'error');
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  });
});
