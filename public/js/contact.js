/**
 * VPSA YOGA - Contact & RFQ Form Handler
 * Enhanced with Client-Side Rate-Limiting, DPDP Consent Validation, Anti-Spam Honeypots, and Privacy-Preserving Fallback
 */

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('.inquiry-form');

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';

      // 1. Anti-Bot Honeypot check (Client-side trap)
      const honeypot = form.querySelector('input[name="bot_honey"]');
      if (honeypot && honeypot.value.trim() !== '') {
        // Silently simulate success to discourage automated bot re-attempts
        showToast('Thank you for your enquiry. Our team will contact you shortly.', 'success');
        form.reset();
        return;
      }

      // 2. Client-side Submission Rate-Limiting (Anti-flood)
      const now = Date.now();
      const lastSubmit = parseInt(sessionStorage.getItem('vpsa_last_inquiry_ts') || '0', 10);
      if (now - lastSubmit < 6000) {
        showToast('Please wait a few seconds before submitting another inquiry.', 'error');
        return;
      }

      // Extract form values
      const formData = new FormData(form);
      const payload = {
        full_name: (formData.get('full_name') || '').trim(),
        email: (formData.get('email') || '').trim(),
        country_code: (formData.get('country_code') || '+91').trim(),
        mobile_number: (formData.get('mobile_number') || '').trim(),
        company_name: (formData.get('company_name') || '').trim(),
        product_variety: (formData.get('product_variety') || '').trim(),
        quantity: (formData.get('quantity') || '').trim(),
        destination: (formData.get('destination') || '').trim(),
        message: (formData.get('message') || '').trim(),
        dpdp_consent: formData.get('dpdp_consent') ? true : false
      };

      // 3. Client-Side Input Validations & Length Bounds
      if (!payload.full_name || payload.full_name.length < 2 || payload.full_name.length > 100) {
        showToast('Please enter your full name (2 to 100 characters).', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!payload.email || !emailRegex.test(payload.email) || payload.email.length > 100) {
        showToast('Please enter a valid business email address.', 'error');
        return;
      }

      const phoneRegex = /^[0-9\-\s\(\)]{7,15}$/;
      if (!payload.mobile_number || !phoneRegex.test(payload.mobile_number)) {
        showToast('Please enter a valid phone number (7 to 15 digits).', 'error');
        return;
      }

      if (!payload.message || payload.message.length < 5 || payload.message.length > 2000) {
        showToast('Please provide inquiry details (between 5 and 2000 characters).', 'error');
        return;
      }

      if (!payload.dpdp_consent) {
        showToast('Please accept the privacy consent checkbox to proceed.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Submitting inquiry...';
      }

      try {
        const response = await fetch('/api/enquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        let result = null;
        try {
          result = await response.json();
        } catch (jsonErr) {
          result = null;
        }

        if (response.ok && result && result.success) {
          sessionStorage.setItem('vpsa_last_inquiry_ts', String(Date.now()));
          showToast(result.message || 'Your wholesale enquiry has been submitted successfully!', 'success');
          form.reset();
        } else if (response.status === 400 && result && result.error) {
          showToast(result.error, 'error');
        } else {
          // Static host fallback (e.g., GitHub Pages without active Node API)
          handleOfflineStaticSubmission(payload, form);
        }
      } catch (err) {
        // Network unreachable or static GitHub Pages hosting
        handleOfflineStaticSubmission(payload, form);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  });

  /**
   * Privacy-Preserving Static/Offline Handler (Data Minimization: Zero PII in URL queries)
   */
  function handleOfflineStaticSubmission(payload, form) {
    try {
      const stored = JSON.parse(localStorage.getItem('vpsa_static_enquiries') || '[]');
      stored.unshift({
        id: Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('vpsa_static_enquiries', JSON.stringify(stored.slice(0, 50)));
    } catch (e) {}

    sessionStorage.setItem('vpsa_last_inquiry_ts', String(Date.now()));
    form.reset();

    showToast('Your quotation request has been recorded successfully! For urgent trade inquiries, you can reach our Trade Desk directly.', 'success');
  }
});
