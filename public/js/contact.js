/**
 * VPSA YOGA - High-Performance Enterprise Contact & RFQ Form Engine
 * Fast direct submission, zero browser validation delay, multi-device cloud sync.
 */

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

// Form Submission Core Handler (Direct submission without browser-side validation)
async function handleFormSubmit(e, form) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (!form) return false;

  // Guard against concurrent double submissions
  if (form.dataset.submitting === 'true') {
    return false;
  }
  form.dataset.submitting = 'true';

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Submit';

  // 1. Honeypot Bot Defense (OWASP A04) - silent fake success if filled
  const honeyEl = form.querySelector('input[name="bot_honey"]');
  if (honeyEl && honeyEl.value.trim() !== '') {
    safeShowToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
    form.reset();
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

  // 2. Rate Limiting Defense (~6 seconds between submissions)
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

  // Extract Form Fields directly without browser validation delays
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
  let mobileNumber = (mobileEl ? mobileEl.value : '').trim().replace(/\D/g, '');
  if (countryCode === '+91') {
    if (mobileNumber.length === 12 && mobileNumber.startsWith('91')) {
      mobileNumber = mobileNumber.substring(2);
    } else if (mobileNumber.length === 11 && mobileNumber.startsWith('0')) {
      mobileNumber = mobileNumber.substring(1);
    }
  }

  const companyName = (companyEl ? companyEl.value : '').trim();
  const variety = (varietyEl ? varietyEl.value : '').trim() || 'All Varieties / Mixed Container';
  const quantity = (quantityEl ? quantityEl.value : '').trim() || 'Standard Wholesale Lot';
  const destination = (destinationEl ? destinationEl.value : '').trim() || 'Pan-India Delivery';
  const message = (messageEl ? messageEl.value : '').trim() || `Wholesale inquiry for ${variety}, Volume: ${quantity}, Destination: ${destination}`;
  const hasConsent = Boolean(consentEl && consentEl.checked);

  // Construct Clean Payload with Bound Slicing
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
    dpdp_consent: hasConsent,
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

    const resJson = await response.json().catch(() => null);

    if (response.ok && resJson && resJson.success) {
      submissionSuccess = true;
    } else if (resJson && resJson.error) {
      safeShowToast(resJson.error, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
      form.dataset.submitting = 'false';
      return false;
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
      } else {
        try {
          const errData = await sbRes.json();
          if (errData && errData.message) {
            safeShowToast(errData.message, 'error');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
            }
            form.dataset.submitting = 'false';
            return false;
          }
        } catch (e) {}
      }
    } catch (sbErr) {
      // Offline fallback
    }
  }

  if (submissionSuccess) {
    sessionStorage.setItem('vpsa_last_inquiry_ts', String(Date.now()));
    safeShowToast('✓ Wholesale inquiry submitted successfully! Our trade desk will contact you promptly.', 'success');
    form.reset();
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

// Attach Form Handlers (Zero overhead on input/keystrokes)
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
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.addEventListener('submit', (e) => handleFormSubmit(e, form));
  });
}

// Self-executing initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContactForms);
} else {
  initContactForms();
}

// Global hooks
window.initContactForms = initContactForms;
window.handleFormSubmit = handleFormSubmit;
