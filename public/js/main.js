/**
 * VPSA YOGA FRISH PVT LTD - Main Client Script
 * Ultra-Smooth Flow, Micro-Interactions, and DPDP Consent Handlers
 */

// Toast Notification Utility
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.1rem; line-height: 1;">${type === 'success' ? '✓' : '⚠️'}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// Privacy & Data Notice Banner
function initPrivacyConsentBanner() {
  if (localStorage.getItem('vpsa_privacy_consent') === 'accepted') {
    return;
  }

  // Do not show on admin dashboard
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'privacyConsentBanner';
  banner.className = 'dpdp-consent-banner';
  banner.innerHTML = `
    <div class="dpdp-consent-text">
      <strong>🍪 Privacy &amp; Data Notice:</strong> We collect and process your contact details solely for wholesale quotations, orders, and logistics fulfillment. We never sell or share your data with third parties. Learn more in our <a href="/privacy" style="color: var(--accent); text-decoration: underline;">Privacy Policy</a>.
    </div>
    <div class="dpdp-consent-actions">
      <button type="button" id="acceptPrivacyBtn" class="btn btn-sm btn-primary" style="white-space: nowrap; padding: 0.45rem 1.25rem;">
        Accept &amp; Continue
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  const acceptBtn = document.getElementById('acceptPrivacyBtn');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      localStorage.setItem('vpsa_privacy_consent', 'accepted');
      banner.classList.add('hidden');
      setTimeout(() => banner.remove(), 300);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Privacy Consent Initialization
  initPrivacyConsentBanner();

  // Mobile Nav Menu Toggle
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close mobile menu on click outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });
  }

  // Active navigation highlight based on current path
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/') || (currentPath !== '/' && href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    }
  });

  // Sticky Header elevation on scroll
  const siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        siteHeader.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
      } else {
        siteHeader.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)';
      }
    }, { passive: true });
  }

  // Animated counters for stats
  const statNumbers = document.querySelectorAll('.hero-stat-number');
  statNumbers.forEach((stat) => {
    const text = stat.innerText;
    if (text.includes('+')) {
      const target = parseInt(text, 10);
      if (!isNaN(target)) {
        let count = 0;
        const interval = setInterval(() => {
          count += 1;
          stat.innerText = count + '+';
          if (count >= target) clearInterval(interval);
        }, 50);
      }
    }
  });

  // Smooth Reveal on Scroll using IntersectionObserver
  if ('IntersectionObserver' in window) {
    const revealElements = document.querySelectorAll('.pillar-card, .product-card, .gallery-card, .about-badge-card, .social-card');
    
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      revealObserver.observe(el);
    });
  }
});
