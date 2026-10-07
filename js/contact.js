/**
 * VPSA YOGA FRISH PVT LTD - Contact & RFQ Form Handler
 */

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('.inquiry-form');

  forms.forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      // Extract form values
      const formData = new FormData(form);
      const payload = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        country_code: formData.get('country_code') || '+91',
        mobile_number: formData.get('mobile_number'),
        company_name: formData.get('company_name'),
        product_variety: formData.get('product_variety'),
        quantity: formData.get('quantity'),
        destination: formData.get('destination'),
        message: formData.get('message'),
        bot_honey: formData.get('bot_honey') // Anti-bot honeypot
      };

      // Client-side quick checks
      if (!payload.full_name || !payload.email || !payload.mobile_number || !payload.message) {
        showToast('Please fill in all required fields (Name, Email, Mobile, and Message).', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Submitting inquiry...';

      try {
        const response = await fetch('/api/enquiries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showToast(result.message || 'Inquiry submitted successfully! Our team will contact you soon.', 'success');
          form.reset();
        } else {
          showToast(result.error || 'Failed to submit inquiry. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Submission error:', err);
        showToast('Network connection error. Please try reaching us directly on WhatsApp.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
});
