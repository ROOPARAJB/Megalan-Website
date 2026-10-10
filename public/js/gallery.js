/**
 * VPSA YOGA - Dynamic Public Gallery Script
 * Cloud Connected with Supabase REST API & Seamless Offline/Mobile Fallbacks
 */

const SUPABASE_CONFIG = {
  url: 'https://sammfailpehmtxlbqmmh.supabase.co',
  key: 'sb_publishable_fW8EO__Y0fyRVkflrZ4Vlw_LFH-nVN0'
};

const defaultStaticPhotos = [
  { id: 1, title: 'South India High-Yield Farm Sourcing', description: 'Lush green banana plantation, direct harvest from certified partner growers all over South India.', category: 'farms', image_url: 'images/products/rasthali-banana.jpg' },
  { id: 2, title: 'Quality Inspection & Grading Hub', description: 'Hand-inspected bunches meeting international grading parameters for export.', category: 'harvest', image_url: 'images/products/poovan-banana.jpg' },
  { id: 3, title: 'Cold-Chain Fleet Loading (13-14°C)', description: 'Reefer containerized fleet coordination ensuring zero damage & optimal shelf-life.', category: 'logistics', image_url: 'images/products/robusta-banana.jpg' },
  { id: 4, title: 'Super-Sweet Yelakki Bunches', description: 'Golden, freshly harvested Yelakki bananas ready for South India retail chains.', category: 'products', image_url: 'images/products/yelakki-banana.jpg' },
  { id: 5, title: 'Nutrient-Dense Red Banana Batches', description: 'Premium organic Sevvazhai bunches undergoing hygienic sorting.', category: 'products', image_url: 'images/products/red-banana.jpg' },
  { id: 6, title: 'Export Packaging & Palletizing', description: 'Telescopic ventilated carton packaging with ethylene management.', category: 'packaging', image_url: 'images/products/nendran-banana.jpg' }
];

let allGalleryItems = [];

// Helper to normalize image paths for both Local Node server and GitHub Pages subpath
function resolveImageUrl(url) {
  if (!url) return 'images/logo/vpsa-yoga-logo.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Strip leading slash for relative asset resolution on GitHub Pages
  return url.replace(/^\/+/, '');
}

async function loadGalleryItems(category = 'all') {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  // 1. Try local Express backend if active
  try {
    const url = category && category !== 'all' ? `/api/gallery?category=${encodeURIComponent(category)}` : '/api/gallery';
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        allGalleryItems = data.data;
        renderGallery(allGalleryItems);
        return;
      }
    }
  } catch (err) {
    // Local API unreachable (e.g. static GitHub Pages hosting on mobile/desktop)
  }

  // 2. Fetch directly from Live Supabase Cloud Database (Instant Mobile & Desktop Sync)
  try {
    let sbUrl = `${SUPABASE_CONFIG.url}/rest/v1/gallery?select=*&order=created_at.desc`;
    if (category && category !== 'all') {
      sbUrl += `&category=eq.${encodeURIComponent(category)}`;
    }

    const sbRes = await fetch(sbUrl, {
      cache: 'no-cache',
      headers: {
        'apikey': SUPABASE_CONFIG.key,
        'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
      }
    });

    if (sbRes.ok) {
      const sbData = await sbRes.json();
      if (Array.isArray(sbData) && sbData.length > 0) {
        allGalleryItems = sbData;
        const filtered = category && category !== 'all' ? sbData.filter(p => p.category === category) : sbData;
        renderGallery(filtered);
        return;
      }
    }
  } catch (sbErr) {
    console.warn('Supabase cloud fetch failed, falling back to local storage:', sbErr);
  }

  // 3. Fallback to localStorage or default seed photos
  try {
    const localItems = JSON.parse(localStorage.getItem('vpsa_static_gallery') || '[]');
    const source = localItems.length > 0 ? localItems : defaultStaticPhotos;
    allGalleryItems = source;
    const filtered = category && category !== 'all' ? source.filter(p => p.category === category) : source;
    renderGallery(filtered);
  } catch (e) {
    allGalleryItems = defaultStaticPhotos;
    renderGallery(defaultStaticPhotos);
  }
}

function renderGallery(items) {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="admin-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff; border-radius: 12px;">
        <p style="color: var(--text-muted); font-size: 1.05rem;">No photos available in this category currently.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const imgSrc = resolveImageUrl(item.image_url);
    return `
      <div class="gallery-card" data-gallery-index="${index}" style="cursor: pointer;">
        <img src="${imgSrc}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='images/logo/vpsa-yoga-logo.png'" />
        <div class="gallery-overlay">
          <span class="product-badge" style="align-self: flex-start; margin-bottom: 0.5rem; text-transform: uppercase;">${escapeHtml(item.category)}</span>
          <h4 class="gallery-title">${escapeHtml(item.title)}</h4>
          <p class="gallery-desc">${escapeHtml(item.description || '')}</p>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openLightbox(url, title, desc) {
  let modal = document.getElementById('lightboxModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lightboxModal';
    modal.className = 'lightbox-modal';
    modal.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close" type="button">&times;</button>
        <img id="lightboxImg" class="lightbox-img" src="" alt="Fullscreen view" />
        <div id="lightboxCaption" class="lightbox-caption"></div>
      </div>
    `;
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('lightbox-close')) {
        closeLightbox();
      }
    });
    document.body.appendChild(modal);
  }

  const imgEl = document.getElementById('lightboxImg');
  const captionEl = document.getElementById('lightboxCaption');
  if (imgEl) imgEl.src = resolveImageUrl(url);
  if (captionEl) {
    captionEl.innerHTML = `<strong>${escapeHtml(title)}</strong>${desc ? `<br><span style="color:#cbd5e1; font-size:0.9rem;">${escapeHtml(desc)}</span>` : ''}`;
  }
  modal.classList.add('active');
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (modal) modal.classList.remove('active');
}

function initPublicGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (galleryGrid) {
    loadGalleryItems('all');

    // Event delegation for opening lightbox on photo card click
    galleryGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.gallery-card');
      if (card) {
        const index = Number(card.getAttribute('data-gallery-index'));
        const item = allGalleryItems[index];
        if (item) {
          openLightbox(item.image_url, item.title, item.description);
        }
      }
    });

    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-category');
        loadGalleryItems(category);
      });
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

// Self-executing initialization (works in all lifecycle phases)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPublicGallery);
} else {
  initPublicGallery();
}

window.initPublicGallery = initPublicGallery;
