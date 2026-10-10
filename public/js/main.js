/**
 * VPSA YOGA - Main Client Script
 * Ultra-Smooth Flow, Micro-Interactions, Crisp SVG Flags, Bulletproof Multi-Language Handlers,
 * Variety Details Popup Modal (Live Gallery Pattern), and Clean URL Normalizer
 */

// Global Banana Varieties Master Catalog (Used for Variety Lightbox Popups)
const BANANA_VARIETIES = {
  'red-banana': {
    id: 'red-banana',
    name: 'Red Banana (செவ்வாழை)',
    badge: 'Nutrient Superfruit',
    tagline: 'Rich in Vitamin C, B6 & Beta-Carotene',
    description: 'Rich in potassium, magnesium, vitamin B6, and significantly higher levels of vitamin C and beta-carotene than standard yellow bananas. Known for immunity boosting, blood pressure regulation, and ocular health.',
    shelf_life: '6 to 8 Days @ 13-14°C',
    ideal_temp: '13.0°C - 14.5°C',
    taste_profile: 'Velvety berry sweetness',
    packing: '7kg / 13kg Corrugated Box, Foam Wrapped',
    image: '/images/products/red-banana.jpg'
  },
  'poovan-banana': {
    id: 'poovan-banana',
    name: 'Poovan Banana (பூவன்)',
    badge: 'Digestive Health',
    tagline: 'Gentle on Stomach & Easy Digestion',
    description: 'Rich in dietary fiber, making it gentle on the stomach and exceptionally easy to digest. Enhances intestinal health, relieves acidity, and provides quick, sustained energy.',
    shelf_life: '7 to 10 Days @ 13-14°C',
    ideal_temp: '13.5°C - 14.0°C',
    taste_profile: 'Tangy-sweet, fragrant',
    packing: '10kg / 15kg Telescopic Cartons',
    image: '/images/products/poovan-banana.jpg'
  },
  'nendran-banana': {
    id: 'nendran-banana',
    name: 'Nendran Banana (நேந்திரன்)',
    badge: 'Specialty Plantain',
    tagline: 'High Resistant Starch & Heart Health',
    description: 'High in resistant starch, dietary fiber, potassium, and Vitamin B6, making them beneficial for gut and heart health. Premier choice for traditional culinary delicacies and banana chips.',
    shelf_life: '8 to 12 Days @ 13-14°C',
    ideal_temp: '13.0°C - 14.0°C',
    taste_profile: 'Rich, firm, versatile',
    packing: '12kg / 18kg Heavy Duty Crates',
    image: '/images/products/nendran-banana.jpg'
  },
  'robusta-banana': {
    id: 'robusta-banana',
    name: 'Robusta Cavendish (ரோபஸ்டா)',
    badge: 'Export Leader',
    tagline: 'Global Favorite for Commercial Wholesale',
    description: 'Robusta is a widely consumed, medium-to-large Cavendish banana variety known for its sweet flavor, soft creamy texture, and thick green peel that ripens to a bright golden-yellow.',
    shelf_life: '14 to 21 Days @ 13.5°C',
    ideal_temp: '13.2°C - 14.0°C',
    taste_profile: 'Smooth, rich, classic',
    packing: '13.5kg / 18.14kg Reefer Export Boxes',
    image: '/images/products/robusta-banana.jpg'
  },
  'yelakki-banana': {
    id: 'yelakki-banana',
    name: 'Yelakki Banana (ஏலக்கி)',
    badge: 'Honey Sweet Aroma',
    tagline: 'Small, Highly Sweet & Aromatic Variety',
    description: 'Yelakki bananas are a small, highly sweet, and aromatic variety widely cultivated in South India. Packed with instant energy, calcium, vitamin C, and dietary fiber.',
    shelf_life: '5 to 7 Days @ 13-14°C',
    ideal_temp: '13.5°C - 14.5°C',
    taste_profile: 'Concentrated honey sweetness',
    packing: '5kg / 10kg Premium Cartons',
    image: '/images/products/yelakki-banana.jpg'
  },
  'karpuravalli-banana': {
    id: 'karpuravalli-banana',
    name: 'Karpuravalli Banana (கற்பூரவள்ளி)',
    badge: 'Creamy & Traditional',
    tagline: 'Plump, Golden-Yellow & Ash-Grey Flesh',
    description: 'Karpuravalli is a popular, traditional South Indian banana variety known for its plump shape, ash-grey or golden-yellow skin, and exceptionally sweet, creamy honey flesh.',
    shelf_life: '6 to 9 Days @ 13-14°C',
    ideal_temp: '13.0°C - 14.0°C',
    taste_profile: 'Creamy, fragrant sweetness',
    packing: '10kg Ventilated Export Boxes',
    image: '/images/products/karpuravalli-banana.jpg'
  },
  'rasthali-banana': {
    id: 'rasthali-banana',
    name: 'Rasthali Banana (ரஸ்தாளி)',
    badge: 'Apple-Aroma Delicacy',
    tagline: 'Silky Texture & Subtle Apple-Like Aroma',
    description: 'Rasthali is a premium, traditional Indian banana variety known for its exceptionally sweet taste, silky smooth texture, and delicate apple-like aroma. High in natural enzymes and vitamins.',
    shelf_life: '5 to 8 Days @ 13-14°C',
    ideal_temp: '13.5°C - 14.0°C',
    taste_profile: 'Silky sweet with apple notes',
    packing: '8kg / 12kg Master Boxes',
    image: '/images/products/rasthali-banana.jpg'
  },
  'monthan-banana': {
    id: 'monthan-banana',
    name: 'Monthan Banana (மொந்தன்)',
    badge: 'Robust Culinary Variety',
    tagline: 'Large Stocky Fruits & Starchy Mealy Pulp',
    description: 'Monthan banana is a robust culinary plantain in India known for its large, stocky green fruits and nutrient-dense, starchy pulp. Perfect for bulk culinary processing and export.',
    shelf_life: '15 to 25 Days @ 14°C',
    ideal_temp: '14.0°C - 16.0°C',
    taste_profile: 'Savory, starchy, firm',
    packing: '20kg / 25kg Ventilated Heavy Bags',
    image: '/images/products/monthan-banana.jpg'
  }
};

// High-Quality SVG Flags Map (Crisp rendering on Windows, Mac, iOS, Android, Linux)
const FLAG_SVGS = {
  // UK Flag
  'gb': '<svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk_c"><path d="M0 0v30h60V0z"/></clipPath><clipPath id="uk_d"><path d="M30 15h30v15zM30 15v15H0zM30 15H0V0zM30 15V0h30z"/></clipPath><g clip-path="url(#uk_c)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk_d)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
  // India Flag with Ashoka Chakra
  'in': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>',
  // UAE Flag
  'ae': '<svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="10" fill="#00732f"/><rect y="10" width="60" height="10" fill="#ffffff"/><rect y="20" width="60" height="10" fill="#000000"/><rect width="18" height="30" fill="#ff0000"/></svg>',
  // Spain Flag
  'es': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="10" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/><rect y="30" width="60" height="10" fill="#AA151B"/></svg>',
  // France Flag
  'fr': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#002654"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE1126"/></svg>',
  // Germany Flag
  'de': '<svg class="lang-flag-svg" viewBox="0 0 60 36" aria-hidden="true"><rect width="60" height="12" fill="#000000"/><rect y="12" width="60" height="12" fill="#DD0000"/><rect y="24" width="60" height="12" fill="#FFCC00"/></svg>',
  // China Flag
  'cn': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#DE2910"/><polygon points="10,6 12,12 8,8 12,8 8,12" fill="#FFDE00"/></svg>',
  // Japan Flag
  'jp': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#FFFFFF"/><circle cx="30" cy="20" r="11" fill="#BC002D"/></svg>',
  // Russia Flag
  'ru': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FFFFFF"/><rect y="13.33" width="60" height="13.34" fill="#0039A6"/><rect y="26.67" width="60" height="13.33" fill="#D52B1E"/></svg>',
  // Portugal Flag
  'pt': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="24" height="40" fill="#006600"/><rect x="24" width="36" height="40" fill="#FF0000"/><circle cx="24" cy="20" r="7" fill="#FFFF00"/></svg>',
  // Italy Flag
  'it': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE2B37"/></svg>',
  // Malaysia Flag
  'my': '<svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="30" fill="#CC0000"/><rect y="4.28" width="60" height="4.28" fill="#FFFFFF"/><rect y="12.84" width="60" height="4.28" fill="#FFFFFF"/><rect y="21.4" width="60" height="4.28" fill="#FFFFFF"/><rect width="30" height="16" fill="#000066"/><circle cx="15" cy="8" r="5" fill="#FFCC00"/></svg>',
  // Indonesia Flag
  'id': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="20" fill="#FF0000"/><rect y="20" width="60" height="20" fill="#FFFFFF"/></svg>',
  // Vietnam Flag
  'vn': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#DA251D"/><polygon points="30,10 33,21 21,14 39,14 27,21" fill="#FFFF00"/></svg>',
  // Thailand Flag
  'th': '<svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="6.67" fill="#A51931"/><rect y="6.67" width="60" height="6.67" fill="#F4F5F8"/><rect y="13.34" width="60" height="13.32" fill="#2D2A4A"/><rect y="26.66" width="60" height="6.67" fill="#F4F5F8"/><rect y="33.33" width="60" height="6.67" fill="#A51931"/></svg>'
};

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

// Clean URL Normalizer (Enforces Secured Standard Paths without .html)
function normalizeCurrentUrl() {
  if (window.location.pathname.endsWith('.html')) {
    let cleanPath = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (!cleanPath) cleanPath = '/';
    window.history.replaceState({}, '', cleanPath + window.location.search + window.location.hash);
  }
}

// Privacy & Data Notice Banner
function initPrivacyConsentBanner() {
  if (localStorage.getItem('vpsa_privacy_consent') === 'accepted') {
    return;
  }
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

// Banana Variety Popup Modal (Live Gallery Lightbox Design Pattern)
function openVarietyModal(varietyKey) {
  const variety = BANANA_VARIETIES[varietyKey] || Object.values(BANANA_VARIETIES).find(v => v.name.toLowerCase().includes((varietyKey || '').toLowerCase()));
  if (!variety) return;

  let modal = document.getElementById('varietyLightboxModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'varietyLightboxModal';
    modal.className = 'lightbox-modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="variety-modal-dialog">
      <button type="button" class="variety-modal-close" onclick="closeVarietyModal()" aria-label="Close modal">&times;</button>
      
      <div class="variety-modal-img-col">
        <img src="${variety.image}" alt="${variety.name}" class="variety-modal-img" onerror="this.src='/images/logo/vpsa-yoga-logo.png'">
      </div>

      <div class="variety-modal-content">
        <span class="variety-modal-badge">${variety.badge}</span>
        <h3 class="variety-modal-title">${variety.name}</h3>
        <div class="variety-modal-tagline">${variety.tagline}</div>
        <p class="variety-modal-desc">${variety.description}</p>

        <div class="variety-modal-specs-grid">
          <div class="variety-spec-card">
            <span class="variety-spec-k">Ideal Storage Temp</span>
            <span class="variety-spec-v">❄️ ${variety.ideal_temp}</span>
          </div>
          <div class="variety-spec-card">
            <span class="variety-spec-k">Shelf Life</span>
            <span class="variety-spec-v">⏱️ ${variety.shelf_life}</span>
          </div>
          <div class="variety-spec-card">
            <span class="variety-spec-k">Taste Profile</span>
            <span class="variety-spec-v">🍌 ${variety.taste_profile}</span>
          </div>
          <div class="variety-spec-card">
            <span class="variety-spec-k">Standard Packaging</span>
            <span class="variety-spec-v">📦 ${variety.packing}</span>
          </div>
        </div>

        <div class="variety-modal-actions">
          <button type="button" class="btn btn-primary btn-sm" style="flex: 1; justify-content: center;" onclick="triggerVarietyEnquiry('${variety.name}')">
            Enquire This Variety →
          </button>
          <a href="https://whatsapp.com/channel/0029Vb7kw5cLNSZzMtTqSy0N" target="_blank" rel="noopener noreferrer" class="btn btn-accent btn-sm" style="justify-content: center; gap: 0.4rem;">
            WhatsApp Channel
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeVarietyModal();
    }
  };
}

function closeVarietyModal() {
  const modal = document.getElementById('varietyLightboxModal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
}

function triggerVarietyEnquiry(varietyName) {
  closeVarietyModal();
  if (typeof openQuoteModal === 'function') {
    openQuoteModal(varietyName);
  } else {
    window.location.href = `/contact?variety=${encodeURIComponent(varietyName)}`;
  }
}

// Setup Product Card Click Listeners
function initVarietyCardClicks() {
  document.querySelectorAll('.product-card').forEach(card => {
    // Determine variety key
    let key = card.getAttribute('data-variety');
    if (!key) {
      const title = card.querySelector('.product-title');
      if (title) {
        const text = title.textContent.toLowerCase();
        if (text.includes('red') || text.includes('செவ்')) key = 'red-banana';
        else if (text.includes('poovan') || text.includes('பூவன்')) key = 'poovan-banana';
        else if (text.includes('nendran') || text.includes('நேந்')) key = 'nendran-banana';
        else if (text.includes('robusta') || text.includes('cavendish') || text.includes('ரோப')) key = 'robusta-banana';
        else if (text.includes('yelakki') || text.includes('ஏல')) key = 'yelakki-banana';
        else if (text.includes('karpuravalli') || text.includes('கற்பூர')) key = 'karpuravalli-banana';
        else if (text.includes('rasthali') || text.includes('ரஸ்தா')) key = 'rasthali-banana';
        else if (text.includes('monthan') || text.includes('மொந்')) key = 'monthan-banana';
      }
    }
    if (key) {
      card.setAttribute('data-variety', key);
      card.addEventListener('click', (e) => {
        // If clicking directly on a button inside, let button handler execute
        if (e.target.closest('button, a')) return;
        openVarietyModal(key);
      });
    }
  });
}

// Google Translate Engine with Lazy-Loading, Zero-Referrer Policy, & Multi-Device Sync (B5 Mitigation)
let googleTranslateScriptLoading = false;
let googleTranslateScriptLoaded = false;
const googleTranslateCallbacks = [];

function flushGoogleTranslateCallbacks() {
  while (googleTranslateCallbacks.length > 0) {
    const cb = googleTranslateCallbacks.shift();
    try {
      if (typeof cb === 'function') cb();
    } catch (e) {}
  }
}

function clearAllGoogleTranslateCookies() {
  const hostname = window.location.hostname;
  const domains = ['', hostname];
  if (hostname.includes('.') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    domains.push('.' + hostname);
    const parts = hostname.split('.');
    if (parts.length > 1) {
      domains.push('.' + parts.slice(-2).join('.'));
    }
  }
  const paths = ['/', window.location.pathname];
  domains.forEach(d => {
    paths.forEach(p => {
      const domStr = d ? `; domain=${d}` : '';
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${p}${domStr}`;
    });
  });
}

function loadGoogleTranslateScript(cb) {
  // Hard supply-chain isolation: Translate must NEVER run on administrative portals or RFQ data views
  if (window.location.pathname.includes('admin') || window.location.pathname.includes('/admin')) {
    return;
  }

  if (cb) {
    googleTranslateCallbacks.push(cb);
  }

  if (googleTranslateScriptLoaded) {
    flushGoogleTranslateCallbacks();
    return;
  }

  if (googleTranslateScriptLoading || document.getElementById('googleTranslateScript')) {
    return;
  }

  googleTranslateScriptLoading = true;

  // Global callback required by Google Translate element.js
  window.googleTranslateElementInit = function() {
    try {
      let container = document.getElementById('google_translate_element');
      if (!container) {
        container = document.createElement('div');
        container.id = 'google_translate_element';
        container.style.display = 'none';
        document.body.appendChild(container);
      }

      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'ar,bn,de,en,es,fr,gu,hi,id,it,ja,kn,ml,mr,ms,pa,pt,ru,ta,te,th,ur,vi,zh-CN',
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      }
    } catch (e) {
      console.warn('Google Translate initialization notice:', e);
    }
    googleTranslateScriptLoaded = true;
    googleTranslateScriptLoading = false;
    flushGoogleTranslateCallbacks();
  };

  const script = document.createElement('script');
  script.id = 'googleTranslateScript';
  script.type = 'text/javascript';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  // Enforce zero-referrer policy (B5) without setting crossorigin (which causes CORS termination on element.js)
  script.setAttribute('referrerpolicy', 'no-referrer');
  script.onerror = function() {
    googleTranslateScriptLoading = false;
    console.warn('Unable to load Google Translate service');
  };
  document.body.appendChild(script);
}

function setGoogleLanguage(langCode, langName, flagCode = 'in') {
  if (window.location.pathname.includes('admin') || window.location.pathname.includes('/admin')) {
    return;
  }

  const hostname = window.location.hostname;
  
  // Clear any existing cookies to avoid domain conflicts
  clearAllGoogleTranslateCookies();

  // Set translation cookies
  if (langCode === 'en') {
    document.cookie = 'googtrans=/en/en; path=/;';
    if (hostname.includes('.') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      const root = '.' + hostname.split('.').slice(-2).join('.');
      document.cookie = `googtrans=/en/en; domain=${root}; path=/;`;
    }
  } else {
    document.cookie = `googtrans=/en/${langCode}; path=/;`;
    if (hostname.includes('.') && !hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      const root = '.' + hostname.split('.').slice(-2).join('.');
      document.cookie = `googtrans=/en/${langCode}; domain=${root}; path=/;`;
    }
  }

  localStorage.setItem('vpsa_lang_code', langCode);
  if (langName) localStorage.setItem('vpsa_lang_name', langName);
  if (flagCode) localStorage.setItem('vpsa_lang_flag', flagCode);

  updateLanguageTriggerUI(langCode, langName, flagCode);

  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === langCode);
  });

  const picker = document.getElementById('customLangPicker');
  if (picker) picker.classList.remove('open');

  // Adjust RTL for Arabic / Urdu
  if (langCode === 'ar' || langCode === 'ur') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-layout');
  } else {
    document.documentElement.dir = 'ltr';
    document.body.classList.remove('rtl-layout');
  }

  // Ensure Google Translate Script is loaded & trigger combo
  loadGoogleTranslateScript(() => {
    let attempts = 0;
    const maxAttempts = 25;
    const triggerTranslate = () => {
      const googleCombo = document.querySelector('.goog-te-combo');
      if (googleCombo) {
        const targetVal = (langCode === 'en') ? '' : langCode;
        googleCombo.value = targetVal;
        googleCombo.dispatchEvent(new Event('change', { bubbles: true }));
        googleCombo.dispatchEvent(new Event('input', { bubbles: true }));

        // If reverting to English, reload if DOM has translated markers to restore clean layout
        if (langCode === 'en' && document.documentElement.classList.contains('translated-ltr')) {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(triggerTranslate, 200);
      } else {
        // Fallback: reload with the cookie set
        if (langCode === 'en' || !googleCombo) {
          window.location.reload();
        }
      }
    };
    triggerTranslate();
  });
}

function updateLanguageTriggerUI(langCode, langName, flagCode) {
  const labelEl = document.getElementById('currentLangLabel');
  const flagEl = document.getElementById('currentLangFlag');
  
  if (labelEl && langName) {
    labelEl.textContent = langName;
  }
  
  const flagSvg = FLAG_SVGS[flagCode || 'in'] || (langCode === 'en' ? FLAG_SVGS.gb : FLAG_SVGS.in);
  if (flagEl && flagSvg) {
    flagEl.innerHTML = flagSvg;
  }
}

function initCustomLanguagePicker() {
  if (window.location.pathname.includes('admin') || window.location.pathname.includes('/admin')) {
    return;
  }

  const picker = document.getElementById('customLangPicker');
  const trigger = document.getElementById('langPickerTrigger');
  if (!picker || !trigger) return;

  const savedName = localStorage.getItem('vpsa_lang_name') || 'English';
  const savedCode = localStorage.getItem('vpsa_lang_code') || 'en';
  const savedFlag = localStorage.getItem('vpsa_lang_flag') || (savedCode === 'en' ? 'gb' : 'in');

  updateLanguageTriggerUI(savedCode, savedName, savedFlag);

  if (savedCode === 'ar' || savedCode === 'ur') {
    document.documentElement.dir = 'rtl';
    document.body.classList.add('rtl-layout');
  }

  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === savedCode);
  });

  // If user previously selected non-English language, load translator on startup
  if (savedCode && savedCode !== 'en') {
    loadGoogleTranslateScript(() => {
      let attempts = 0;
      const syncGoogleCombo = () => {
        const googleCombo = document.querySelector('.goog-te-combo');
        if (googleCombo) {
          if (googleCombo.value !== savedCode) {
            googleCombo.value = savedCode;
            googleCombo.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else if (attempts < 20) {
          attempts++;
          setTimeout(syncGoogleCombo, 200);
        }
      };
      syncGoogleCombo();
    });
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    loadGoogleTranslateScript();
    picker.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!picker.contains(e.target)) {
      picker.classList.remove('open');
    }
  });

  document.querySelectorAll('.lang-btn-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const langCode = btn.getAttribute('data-lang');
      const langName = btn.getAttribute('data-name') || btn.textContent.trim();
      const flagCode = btn.getAttribute('data-flag') || (langCode === 'en' ? 'gb' : 'in');
      setGoogleLanguage(langCode, langName, flagCode);
    });
  });
}

// Google Translate Cleaner
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
    if (frame) frame.style.display = 'none';
  };

  cleanHighlights();

  if (window.MutationObserver && document.body) {
    const observer = new MutationObserver(() => cleanHighlights());
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

// Dynamic Header System
function initDynamicHeaderLayout() {
  const header = document.querySelector('.site-header');
  const navbar = document.querySelector('.navbar');
  const brandLogo = document.querySelector('.brand-logo');
  const navMenu = document.getElementById('navMenu');
  const navActions = document.querySelector('.nav-actions');

  if (!header || !navbar || !navMenu || !navActions) return;

  function evaluateHeaderLayout() {
    const windowWidth = window.innerWidth;
    if (windowWidth <= 1024) {
      header.classList.add('navbar-dynamic-collapse');
      return;
    }

    const wasActive = navMenu.classList.contains('active');
    header.classList.remove('navbar-dynamic-collapse');

    const containerWidth = navbar.clientWidth;
    const logoWidth = brandLogo ? brandLogo.getBoundingClientRect().width : 0;
    const actionsWidth = navActions ? navActions.getBoundingClientRect().width : 0;

    let navItemsWidth = 0;
    const navItems = navMenu.querySelectorAll('li:not(.mobile-nav-cta-item)');
    navItems.forEach(item => {
      navItemsWidth += item.getBoundingClientRect().width;
    });

    const gapBuffer = (navItems.length + 2) * 18 + 40;
    const totalRequiredWidth = logoWidth + navItemsWidth + actionsWidth + gapBuffer;

    if (totalRequiredWidth > containerWidth || windowWidth <= 1180) {
      header.classList.add('navbar-dynamic-collapse');
      if (wasActive) navMenu.classList.add('active');
    } else {
      header.classList.remove('navbar-dynamic-collapse');
      navMenu.classList.remove('active');
    }
  }

  evaluateHeaderLayout();

  let resizeTimer;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeTimer);
    resizeTimer = requestAnimationFrame(evaluateHeaderLayout);
  }, { passive: true });

  if (document.fonts) {
    document.fonts.ready.then(evaluateHeaderLayout);
  }
}

// Global DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  normalizeCurrentUrl();
  initPrivacyConsentBanner();
  initCustomLanguagePicker();
  initGoogleTranslateCleaners();
  initDynamicHeaderLayout();
  initVarietyCardClicks();

  // Mobile Nav Menu Toggle
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        navMenu.classList.remove('active');
      }
    });

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

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVarietyModal();
    }
  });
});
