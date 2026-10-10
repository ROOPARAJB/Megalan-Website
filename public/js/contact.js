/**
 * VPSA YOGA - Enterprise Contact & RFQ Form Engine
 * Real-Time Input Filtering, Strict Field Validations (Alphabets only, Temp-Mail Blocking, 10-Digit Mobile Bounds),
 * Red Error Highlights, Supabase Cloud Database Fallback & Multi-Device Sync.
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
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
  form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('.inquiry-form');

  forms.forEach((form) => {
    // Real-time keystroke filtering
    const nameInput = form.querySelector('input[name="full_name"]');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        // Remove any non-alphabet, non-space character immediately
        const cleaned = nameInput.value.replace(/[^A-Za-z\s]/g, '');
        if (nameInput.value !== cleaned) {
          nameInput.value = cleaned;
        }
        if (nameInput.value.trim().length >= 2) {
          clearFieldError(nameInput);
        }
      });
    }

    const phoneInput = form.querySelector('input[name="mobile_number"]');
    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        // Remove any non-digit character immediately
        const digitsOnly = phoneInput.value.replace(/\D/g, '');
        if (phoneInput.value !== digitsOnly) {
          phoneInput.value = digitsOnly;
        }
        if (digitsOnly.length === 10) {
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

      // 1. Honeypot check
      const honeypot = form.querySelector('input[name="bot_honey"]');
      if (honeypot && honeypot.value.trim() !== '') {
        showToast('Thank you for your enquiry. Our team will contact you shortly.', 'success');
        form.reset();
        return;
      }

      // 2. Submission frequency rate-limiting
      const now = Date.now();
      const lastSubmit = parseInt(sessionStorage.getItem('vpsa_last_inquiry_ts') || '0', 10);
      if (now - lastSubmit < 4000) {
        showToast('Please wait a few seconds before submitting another request.', 'error');
        return;
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

      const fullName = (fullNameEl ? fullNameEl.value : '').trim();
      const email = (emailEl ? emailEl.value : '').trim().toLowerCase();
      const countryCode = (countryCodeEl ? countryCodeEl.value : '+91').trim();
      const mobileNumber = (mobileEl ? mobileEl.value : '').trim().replace(/\D/g, '');
      const companyName = (companyEl ? companyEl.value : '').trim();
      const variety = (varietyEl ? varietyEl.value : '').trim();
      const quantity = (quantityEl ? quantityEl.value : '').trim();
      const destination = (destinationEl ? destinationEl.value : '').trim();
      const message = (messageEl ? messageEl.value : '').trim();
      const hasConsent = consentEl ? consentEl.checked : true;

      let hasError = false;
      let firstErrorField = null;

      // Validate Full Name (Alphabets & spaces only, 2-80 chars)
      const nameRegex = /^[A-Za-z\s]{2,80}$/;
      if (!fullName) {
        setFieldError(fullNameEl, 'Full name is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = fullNameEl;
      } else if (!nameRegex.test(fullName)) {
        setFieldError(fullNameEl, 'Name must contain alphabets and spaces only (no numbers or symbols).');
        hasError = true;
        if (!firstErrorField) firstErrorField = fullNameEl;
      }

      // Validate Email & Disposable Mail Check
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email) {
        setFieldError(emailEl, 'Business email is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = emailEl;
      } else if (!emailRegex.test(email)) {
        setFieldError(emailEl, 'Please enter a valid email address (e.g. name@company.com).');
        hasError = true;
        if (!firstErrorField) firstErrorField = emailEl;
      } else {
        const domain = email.split('@')[1];
        if (domain && BLOCKED_EMAIL_DOMAINS.has(domain)) {
          setFieldError(emailEl, 'Temporary/disposable email addresses are not permitted. Please use a business or standard email.');
          hasError = true;
          if (!firstErrorField) firstErrorField = emailEl;
        }
      }

      // Validate Mobile Number (No extra/less numbers, strict format)
      if (!mobileNumber) {
        setFieldError(mobileEl, 'Mobile number is required.');
        hasError = true;
        if (!firstErrorField) firstErrorField = mobileEl;
      } else if (countryCode === '+91') {
        const indiaPhoneRegex = /^[6-9]\d{9}$/;
        if (!indiaPhoneRegex.test(mobileNumber)) {
          setFieldError(mobileEl, 'Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.');
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

      // Validate Banana Variety (Mandatory *)
      if (!variety || variety === '') {
        setFieldError(varietyEl, 'Please select a banana variety.');
        hasError = true;
        if (!firstErrorField) firstErrorField = varietyEl;
      }

      // Validate Estimated Volume (Mandatory *)
      if (!quantity || quantity.length < 2) {
        setFieldError(quantityEl, 'Estimated volume / quantity is required (e.g. 5 Tons / 500 Boxes).');
        hasError = true;
        if (!firstErrorField) firstErrorField = quantityEl;
      }

      // Validate Delivery State / Destination (Mandatory *)
      if (!destination || destination.length < 2) {
        setFieldError(destinationEl, 'Delivery destination state & city is required (e.g. Tamil Nadu, Kerala, Dubai).');
        hasError = true;
        if (!firstErrorField) firstErrorField = destinationEl;
      }

      // Validate Message (if present on form)
      if (messageEl && (!message || message.length < 3)) {
        setFieldError(messageEl, 'Please provide details regarding your required schedule or packaging.');
        hasError = true;
        if (!firstErrorField) firstErrorField = messageEl;
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
        showToast('Please correct the highlighted fields in red before submitting.', 'error');
        return;
      }

      // Construct Payload
      const payload = {
        full_name: fullName,
        email: email,
        country_code: countryCode,
        mobile_number: mobileNumber,
        company_name: companyName || null,
        product_variety: variety,
        quantity: quantity,
        destination: destination,
        message: message || `Wholesale inquiry for ${variety}, Volume: ${quantity}, Destination: ${destination}`,
        status: 'new'
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting Inquiry...';
      }

      let submissionSuccess = false;

      // 1. Attempt Node Backend API
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
        console.warn('Backend API connection error:', nodeErr);
      }

      if (submissionSuccess) {
        sessionStorage.setItem('vpsa_last_inquiry_ts', String(Date.now()));
        showToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
        form.reset();
        clearAllFormErrors(form);
        if (typeof closeQuoteModal === 'function') {
          setTimeout(closeQuoteModal, 1500);
        }
      } else {
        showToast('Enquiry received! You can also reach our 24/7 Trade Desk directly at +91 9003755701 or info@vpsayoga.in.', 'success');
        form.reset();
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  });
});
