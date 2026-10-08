/**
 * VPSA YOGA - Main Client Script
 * Ultra-Smooth Flow, Micro-Interactions, and Custom Language Handlers
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
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
    });

    // Close mobile menu on click outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });

    // Close menu when clicking any nav link
    navMenu.querySelectorAll('.nav-link, .btn').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
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

  // Dynamic Intelligent Header Layout System
  initDynamicHeaderLayout();

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

  // Custom Language Picker Initialization (Zero Browser Selects)
  initCustomLanguagePicker();
});

// Google Translate Custom Language Handler (Replaces browser select)
function setGoogleLanguage(langCode, langName) {
  const hostname = window.location.hostname;
  
  // Set translation cookies
  if (langCode === 'en') {
    // Reset / clear translation
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname}`;
    if (hostname.includes('.')) {
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname}`;
    }
    document.cookie = 'googtrans=/en/en; path=/;';
    document.cookie = `googtrans=/en/en; path=/; domain=${hostname}`;
    if (hostname.includes('.')) {
      document.cookie = `googtrans=/en/en; path=/; domain=.${hostname}`;
    }
  } else {
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${hostname}`;
    if (hostname.includes('.')) {
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${hostname}`;
    }
    document.cookie = `googtrans=/auto/${langCode}; path=/;`;
    document.cookie = `googtrans=/auto/${langCode}; path=/; domain=${hostname}`;
  }

  localStorage.setItem('vpsa_lang_code', langCode);
  if (langName) {
    localStorage.setItem('vpsa_lang_name', langName);
  }

  const labelEl = document.getElementById('currentLangLabel');
  if (labelEl && langName) {
    labelEl.textContent = langName;
  }

  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === langCode);
  });

  const picker = document.getElementById('customLangPicker');
  if (picker) {
    picker.classList.remove('open');
  }

  // Adjust RTL for Arabic / Urdu
  if (langCode === 'ar' || langCode === 'ur') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-layout');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl-layout');
  }

  // Trigger Google Translate engine
  const googleCombo = document.querySelector('.goog-te-combo');
  if (googleCombo) {
    googleCombo.value = langCode;
    googleCombo.dispatchEvent(new Event('change', { bubbles: true }));
    googleCombo.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    // Reload so Google Translate initializes with the new cookie
    window.location.reload();
  }
}

function initCustomLanguagePicker() {
  const picker = document.getElementById('customLangPicker');
  const trigger = document.getElementById('langPickerTrigger');
  if (!picker || !trigger) return;

  const savedName = localStorage.getItem('vpsa_lang_name');
  const savedCode = localStorage.getItem('vpsa_lang_code') || 'en';
  if (savedName) {
    const labelEl = document.getElementById('currentLangLabel');
    if (labelEl) labelEl.textContent = savedName;
  }

  if (savedCode === 'ar' || savedCode === 'ur') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-layout');
  }

  // Set active class
  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === savedCode);
  });

  // Toggle Dropdown
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    picker.classList.toggle('open');
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) {
      picker.classList.remove('open');
    }
  });

  // Attach click listener to each language item
  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const langCode = btn.getAttribute('data-lang');
      const langName = btn.getAttribute('data-name') || btn.textContent.trim();
      setGoogleLanguage(langCode, langName);
    });
  });

  // Sync with Google Translate combo if already mounted
  const syncGoogleCombo = () => {
    const googleCombo = document.querySelector('.goog-te-combo');
    if (googleCombo && savedCode && savedCode !== 'en' && googleCombo.value !== savedCode) {
      googleCombo.value = savedCode;
      googleCombo.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  setTimeout(syncGoogleCombo, 800);
  setTimeout(syncGoogleCombo, 2000);
}

// Google Translate Anti-Highlight & Tooltip Stripper
function initGoogleTranslateCleaners() {
  const cleanHighlights = () => {
    document.querySelectorAll('.goog-text-highlight').forEach(el => {
      el.classList.remove('goog-text-highlight');
      el.style.backgroundColor = 'transparent';
      el.style.boxShadow = 'none';
      el.style.border = 'none';
      el.style.outline = 'none';
    });
    const tooltip = document.getElementById('goog-gt-tt');
    if (tooltip) {
      tooltip.style.display = 'none';
      tooltip.style.visibility = 'hidden';
    }
    const frame = document.querySelector('.goog-te-balloon-frame');
    if (frame) {
      frame.style.display = 'none';
    }
  };

  cleanHighlights();

  if (window.MutationObserver && document.body) {
    const observer = new MutationObserver(() => {
      cleanHighlights();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  document.addEventListener('mouseover', (e) => {
    if (e.target && (e.target.classList.contains('goog-text-highlight') || e.target.tagName === 'FONT')) {
      e.target.classList.remove('goog-text-highlight');
      e.target.style.backgroundColor = 'transparent';
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', () => {
  initGoogleTranslateCleaners();
});

/**
 * Dynamic Intelligent Navigation Layout Adapter
 * Dynamically computes real-time element widths, font metrics, and translation text length.
 * Automatically switches between desktop row menu and clean slide-out drawer
 * whenever text expansion threatens to collide or push elements off the screen.
 */
function initDynamicHeaderLayout() {
  const header = document.querySelector('.site-header');
  const navbar = document.querySelector('.navbar');
  const brandLogo = document.querySelector('.brand-logo');
  const navMenu = document.getElementById('navMenu');
  const navActions = document.querySelector('.nav-actions');

  if (!header || !navbar || !navMenu || !navActions) return;

  function evaluateHeaderLayout() {
    const windowWidth = window.innerWidth;

    // Below 1024px, always collapse to touch drawer
    if (windowWidth <= 1024) {
      header.classList.add('navbar-dynamic-collapse');
      return;
    }

    // Preserve active drawer state during measurement
    const wasActive = navMenu.classList.contains('active');
    
    // Temporarily disable collapse to measure unconstrained width
    header.classList.remove('navbar-dynamic-collapse');

    const containerWidth = navbar.clientWidth;
    const logoWidth = brandLogo ? brandLogo.getBoundingClientRect().width : 0;
    const actionsWidth = navActions ? navActions.getBoundingClientRect().width : 0;

    let navItemsWidth = 0;
    const navItems = navMenu.querySelectorAll('li:not(.mobile-nav-cta-item)');
    navItems.forEach(item => {
      navItemsWidth += item.getBoundingClientRect().width;
    });

    // Gap buffer: accounts for flex gaps and padding
    const gapBuffer = (navItems.length + 2) * 18 + 40;
    const totalRequiredWidth = logoWidth + navItemsWidth + actionsWidth + gapBuffer;

    if (totalRequiredWidth > containerWidth || windowWidth <= 1180) {
      header.classList.add('navbar-dynamic-collapse');
      if (wasActive) {
        navMenu.classList.add('active');
      }
    } else {
      header.classList.remove('navbar-dynamic-collapse');
      navMenu.classList.remove('active');
    }
  }

  evaluateHeaderLayout();

  // Resize listener
  let resizeTimer;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(evaluateHeaderLayout);
  }, { passive: true });

  // Web Fonts Ready listener
  if (document.fonts) {
    document.fonts.ready.then(evaluateHeaderLayout);
  }

  // ResizeObserver on navbar
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => {
      evaluateHeaderLayout();
    });
    ro.observe(navbar);
  }

  // MutationObserver for translation changes
  if ('MutationObserver' in window) {
    const mo = new MutationObserver(() => {
      requestAnimationFrame(evaluateHeaderLayout);
    });
    mo.observe(header, { childList: true, subtree: true, characterData: true });
  }

  // Periodic safety checks for late-loading Google Translate elements
  setTimeout(evaluateHeaderLayout, 300);
  setTimeout(evaluateHeaderLayout, 800);
  setTimeout(evaluateHeaderLayout, 1500);
  setTimeout(evaluateHeaderLayout, 3000);
}


