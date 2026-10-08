/**
 * VPSA YOGA - Contact & RFQ Form Handler
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

        let result = null;
        try {
          result = await response.json();
        } catch (jsonErr) {
          result = null;
        }

        if (response.ok && result && result.success) {
          showToast(result.message || 'Inquiry submitted successfully! Our team will contact you soon.', 'success');
          form.reset();
        } else {
          // If on a static host (e.g. GitHub Pages without server backend)
          const fallbackMsg = encodeURIComponent(
            `*VPSA YOGA Wholesale Inquiry*\n\n` +
            `*Name:* ${payload.full_name}\n` +
            `*Phone:* ${payload.country_code} ${payload.mobile_number}\n` +
            `*Email:* ${payload.email}\n` +
            `*Company:* ${payload.company_name || 'N/A'}\n` +
            `*Variety:* ${payload.product_variety || 'All Varieties'}\n` +
            `*Volume:* ${payload.quantity || 'N/A'}\n` +
            `*Destination:* ${payload.destination || 'N/A'}\n` +
            `*Details:* ${payload.message}`
          );
          
          showToast('Forwarding your inquiry directly to VPSA YOGA WhatsApp Trade Desk...', 'success');
          setTimeout(() => {
            window.open(`https://wa.me/919003755701?text=${fallbackMsg}`, '_blank');
          }, 1200);
          form.reset();
        }
      } catch (err) {
        console.warn('API submission unreachable, redirecting via WhatsApp:', err);
        const fallbackMsg = encodeURIComponent(
          `*VPSA YOGA Wholesale Inquiry*\n\n` +
          `*Name:* ${payload.full_name}\n` +
          `*Phone:* ${payload.country_code} ${payload.mobile_number}\n` +
          `*Email:* ${payload.email}\n` +
          `*Company:* ${payload.company_name || 'N/A'}\n` +
          `*Variety:* ${payload.product_variety || 'All Varieties'}\n` +
          `*Volume:* ${payload.quantity || 'N/A'}\n` +
          `*Destination:* ${payload.destination || 'N/A'}\n` +
          `*Details:* ${payload.message}`
        );
        showToast('Forwarding your inquiry to WhatsApp Trade Desk...', 'success');
        setTimeout(() => {
          window.open(`https://wa.me/919003755701?text=${fallbackMsg}`, '_blank');
        }, 1200);
        form.reset();
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  });
});
