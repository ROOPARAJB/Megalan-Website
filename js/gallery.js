/**
 * VPSA YOGA FRISH PVT LTD - Dynamic Public Gallery Script
 */

const defaultStaticPhotos = [
  { title: 'Theni High-Yield Farm Sourcing', description: 'Lush green banana plantation in Theni, direct harvest from certified partner growers.', category: 'farms', image_url: 'images/products/rasthali-banana.jpg' },
  { title: 'Oddanchatram Grading Hub', description: 'Hand-inspected bunches meeting international grading parameters for export.', category: 'harvest', image_url: 'images/products/poovan-banana.jpg' },
  { title: 'Cold-Chain Fleet Loading (13-14°C)', description: 'Reefer containerized fleet coordination ensuring zero damage & optimal shelf-life.', category: 'logistics', image_url: 'images/products/robusta-banana.jpg' },
  { title: 'Super-Sweet Yelakki Bunches', description: 'Golden, freshly harvested Yelakki bananas ready for South India retail chains.', category: 'products', image_url: 'images/products/yelakki-banana.jpg' },
  { title: 'Nutrient-Dense Red Banana Batches', description: 'Premium organic Sevvazhai bunches undergoing hygienic sorting.', category: 'products', image_url: 'images/products/red-banana.jpg' },
  { title: 'Export Packaging & Palletizing', description: 'Telescopic ventilated carton packaging with ethylene management.', category: 'packaging', image_url: 'images/products/nendran-banana.jpg' }
];

let allGalleryItems = [];

async function loadGalleryItems(category = 'all') {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  try {
    const url = category && category !== 'all' ? `/api/gallery?category=${encodeURIComponent(category)}` : '/api/gallery';
    const response = await fetch(url);
    if (!response.ok) throw new Error('API offline');
    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      allGalleryItems = data.data;
      renderGallery(allGalleryItems);
      return;
    }
  } catch (err) {
    // Graceful fallback for static GitHub Pages hosting
    const filtered = category && category !== 'all' 
      ? defaultStaticPhotos.filter(p => p.category === category)
      : defaultStaticPhotos;
    allGalleryItems = defaultStaticPhotos;
    renderGallery(filtered);
    return;
  }

  container.innerHTML = `
    <div class="admin-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: #fff; border-radius: 12px;">
      <p style="color: var(--text-muted); font-size: 1.05rem;">No photos available in this category currently.</p>
    </div>
  `;
}

function renderGallery(items) {
  const container = document.getElementById('galleryGrid');
  if (!container) return;

  container.innerHTML = items.map((item, index) => `
    <div class="gallery-card" data-gallery-index="${index}" style="cursor: pointer;">
      <img src="${item.image_url}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.src='/images/logo/vpsa-logo.svg'" />
      <div class="gallery-overlay">
        <span class="product-badge" style="align-self: flex-start; margin-bottom: 0.5rem; text-transform: uppercase;">${escapeHtml(item.category)}</span>
        <h4 class="gallery-title">${escapeHtml(item.title)}</h4>
        <p class="gallery-desc">${escapeHtml(item.description || '')}</p>
      </div>
    </div>
  `).join('');
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
  if (imgEl) imgEl.src = url;
  if (captionEl) {
    captionEl.innerHTML = `<strong>${escapeHtml(title)}</strong>${desc ? `<br><span style="color:#cbd5e1; font-size:0.9rem;">${escapeHtml(desc)}</span>` : ''}`;
  }
  modal.classList.add('active');
}

function closeLightbox() {
  const modal = document.getElementById('lightboxModal');
  if (modal) modal.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
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
});
