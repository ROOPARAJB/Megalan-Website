import fs from 'fs';
import path from 'path';

const svgPickerHtml = `        <!-- Custom Language Picker with Crisp SVG Flags -->
        <div class="custom-lang-picker" id="customLangPicker">
          <button class="lang-picker-btn" id="langPickerTrigger" type="button" aria-label="Language Selector">
            <span class="lang-flag-current" id="currentLangFlag">
              <svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk_c_top"><path d="M0 0v30h60V0z"/></clipPath><clipPath id="uk_d_top"><path d="M30 15h30v15zM30 15v15H0zM30 15H0V0zM30 15V0h30z"/></clipPath><g clip-path="url(#uk_c_top)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk_d_top)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>
            </span>
            <span class="lang-current-name" id="currentLangLabel">English</span>
            <span class="lang-arrow">▾</span>
          </button>
          <div class="lang-picker-dropdown" id="langPickerDropdown">
            <div class="lang-category-label">Indian Languages</div>
            <button type="button" class="lang-btn-item active" data-lang="en" data-name="English" data-flag="gb">
              <svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><clipPath id="uk_c_opt"><path d="M0 0v30h60V0z"/></clipPath><clipPath id="uk_d_opt"><path d="M30 15h30v15zM30 15v15H0zM30 15H0V0zM30 15V0h30z"/></clipPath><g clip-path="url(#uk_c_opt)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk_d_opt)" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>
              <span>English</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ta" data-name="தமிழ்" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>தமிழ் (Tamil)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="hi" data-name="हिंदी" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>हिंदी (Hindi)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ml" data-name="മലയാളം" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>മലയാളം (Malayalam)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="te" data-name="తెలుగు" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>తెలుగు (Telugu)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="kn" data-name="ಕನ್ನಡ" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>ಕನ್ನಡ (Kannada)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="mr" data-name="मराठी" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>मराठी (Marathi)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="bn" data-name="বাংলা" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>বাংলা (Bengali)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="gu" data-name="ગુજરાતી" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>ગુજરાતી (Gujarati)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="pa" data-name="ਪੰਜਾਬੀ" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>ਪੰਜਾਬੀ (Punjabi)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ur" data-name="اردو" data-flag="in">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FF9933"/><rect y="13.33" width="60" height="13.34" fill="#FFFFFF"/><rect y="26.67" width="60" height="13.33" fill="#138808"/><circle cx="30" cy="20" r="4.8" fill="none" stroke="#000088" stroke-width="0.9"/><circle cx="30" cy="20" r="1.1" fill="#000088"/></svg>
              <span>اردو (Urdu)</span>
            </button>
            
            <div class="lang-category-label" style="margin-top: 0.5rem;">International</div>
            <button type="button" class="lang-btn-item" data-lang="ar" data-name="العربية" data-flag="ae">
              <svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="10" fill="#00732f"/><rect y="10" width="60" height="10" fill="#ffffff"/><rect y="20" width="60" height="10" fill="#000000"/><rect width="18" height="30" fill="#ff0000"/></svg>
              <span>العربية (Arabic)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="es" data-name="Español" data-flag="es">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="10" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/><rect y="30" width="60" height="10" fill="#AA151B"/></svg>
              <span>Español (Spanish)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="fr" data-name="Français" data-flag="fr">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#002654"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE1126"/></svg>
              <span>Français (French)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="de" data-name="Deutsch" data-flag="de">
              <svg class="lang-flag-svg" viewBox="0 0 60 36" aria-hidden="true"><rect width="60" height="12" fill="#000000"/><rect y="12" width="60" height="12" fill="#DD0000"/><rect y="24" width="60" height="12" fill="#FFCC00"/></svg>
              <span>Deutsch (German)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="zh-CN" data-name="简体中文" data-flag="cn">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#DE2910"/><polygon points="10,6 12,12 8,8 12,8 8,12" fill="#FFDE00"/></svg>
              <span>简体中文 (Chinese)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ja" data-name="日本語" data-flag="jp">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#FFFFFF"/><circle cx="30" cy="20" r="11" fill="#BC002D"/></svg>
              <span>日本語 (Japanese)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ru" data-name="Русский" data-flag="ru">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="13.33" fill="#FFFFFF"/><rect y="13.33" width="60" height="13.34" fill="#0039A6"/><rect y="26.67" width="60" height="13.33" fill="#D52B1E"/></svg>
              <span>Русский (Russian)</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="pt" data-name="Português" data-flag="pt">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="24" height="40" fill="#006600"/><rect x="24" width="36" height="40" fill="#FF0000"/><circle cx="24" cy="20" r="7" fill="#FFFF00"/></svg>
              <span>Português</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="it" data-name="Italiano" data-flag="it">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="20" height="40" fill="#009246"/><rect x="20" width="20" height="40" fill="#FFFFFF"/><rect x="40" width="20" height="40" fill="#CE2B37"/></svg>
              <span>Italiano</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="ms" data-name="Bahasa Melayu" data-flag="my">
              <svg class="lang-flag-svg" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="30" fill="#CC0000"/><rect y="4.28" width="60" height="4.28" fill="#FFFFFF"/><rect y="12.84" width="60" height="4.28" fill="#FFFFFF"/><rect y="21.4" width="60" height="4.28" fill="#FFFFFF"/><rect width="30" height="16" fill="#000066"/><circle cx="15" cy="8" r="5" fill="#FFCC00"/></svg>
              <span>Bahasa Melayu</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="id" data-name="Bahasa Indonesia" data-flag="id">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="20" fill="#FF0000"/><rect y="20" width="60" height="20" fill="#FFFFFF"/></svg>
              <span>Bahasa Indonesia</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="vi" data-name="Tiếng Việt" data-flag="vn">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="40" fill="#DA251D"/><polygon points="30,10 33,21 21,14 39,14 27,21" fill="#FFFF00"/></svg>
              <span>Tiếng Việt</span>
            </button>
            <button type="button" class="lang-btn-item" data-lang="th" data-name="ไทย" data-flag="th">
              <svg class="lang-flag-svg" viewBox="0 0 60 40" aria-hidden="true"><rect width="60" height="6.67" fill="#A51931"/><rect y="6.67" width="60" height="6.67" fill="#F4F5F8"/><rect y="13.34" width="60" height="13.32" fill="#2D2A4A"/><rect y="26.66" width="60" height="6.67" fill="#F4F5F8"/><rect y="33.33" width="60" height="6.67" fill="#A51931"/></svg>
              <span>ไทย (Thai)</span>
            </button>
          </div>
        </div>`;

const files = ['views/index.html', 'views/about.html', 'views/products.html', 'views/gallery.html', 'views/contact.html', 'views/privacy.html'];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let content = fs.readFileSync(f, 'utf8');

  // Replace email
  content = content.replace(/info@vpsayoga\.com/g, 'info@vpsayoga.in');

  // Replace WhatsApp channel link
  content = content.replace(/https:\/\/whatsapp\.com\/channel\/[a-zA-Z0-9_-]+/g, 'https://whatsapp.com/channel/0029Vb7kw5cLNSZzMtTqSy0N');

  // Replace language picker
  const pickerRegex = /<!-- Custom Language Picker[\s\S]*?<\/div>\s*<\/div>/;
  if (pickerRegex.test(content)) {
    content = content.replace(pickerRegex, svgPickerHtml);
  }

  // Update styles version
  content = content.replace(/styles\.css(\?v=[\d\.]+)?/g, 'styles.css?v=11.0');

  // Ensure contact.js and main.js are present at bottom
  if (!content.includes('contact.js')) {
    content = content.replace(/<script src="\/js\/main\.js[^"]*"><\/script>/, '<script src="/js/main.js?v=11.0"></script>\n  <script src="/js/contact.js?v=11.0"></script>');
  } else {
    content = content.replace(/main\.js(\?v=[\d\.]+)?/g, 'main.js?v=11.0');
    content = content.replace(/contact\.js(\?v=[\d\.]+)?/g, 'contact.js?v=11.0');
  }

  fs.writeFileSync(f, content, 'utf8');
  console.log(`Updated ${f}`);
}
