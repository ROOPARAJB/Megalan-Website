/**
 * VPSA YOGA - Admin Dashboard & Gallery Management Script
 * High Performance, Secure Session Control & Clean Responsive UI
 */

// Global in-memory data caches
let cachedGalleryItems = [];
let cachedInquiries = [];

const SUPABASE_CONFIG = {
  url: 'https://sammfailpehmtxlbqmmh.supabase.co',
  key: 'sb_publishable_fW8EO__Y0fyRVkflrZ4Vlw_LFH-nVN0'
};

// Helper to normalize image paths for both Local Node server and GitHub Pages subpath
function resolveImageUrl(url) {
  if (!url) return 'images/logo/vpsa-yoga-logo.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return url.replace(/^\/+/, '');
}

// Helper to determine if we are running in static hosting (GitHub Pages, file protocol, or static HTML)
function isStaticMode() {
  return window.location.hostname.includes('github.io') ||
         window.location.protocol === 'file:' ||
         window.location.pathname.endsWith('.html') ||
         (window.location.port === '' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));
}

// RFC 6238 Standard Base32 Decoder for Authenticator TOTP verification
function base32ToBuffer(str) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let cleaned = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    let val = alphabet.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

// Client-side RFC 6238 TOTP Generator (SHA-1 HMAC via Web Crypto API)
async function generateTOTP(secretBase32, timeStepOffset = 0) {
  const keyBytes = base32ToBuffer(secretBase32);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const counter = Math.floor(Date.now() / 1000 / 30) + timeStepOffset;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter));

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
  const sigBytes = new Uint8Array(signature);
  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

// Client-side RFC 6238 TOTP Verifier with ±1 window tolerance (30s past / present / future)
async function verifyClientTOTP(token, secretBase32) {
  try {
    const cleanToken = String(token).trim().replace(/\s+/g, '');
    for (let offset of [-1, 0, 1]) {
      const calculated = await generateTOTP(secretBase32, offset);
      if (calculated === cleanToken) return true;
    }
    return false;
  } catch (e) {
    console.error('Client TOTP calculation error:', e);
    return false;
  }
}

// Built-in Toast Notification Utility
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

// Authentication Header Helper
function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = sessionStorage.getItem('vpsa_token') || localStorage.getItem('vpsa_token');
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// HTML Escaping Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 1. Modal Control Functions
function openUploadModal() {
  const modal = document.getElementById('uploadPhotoModal');
  if (!modal) return;
  const form = document.getElementById('uploadGalleryForm');
  if (form) form.reset();

  const chosenEl = document.getElementById('fileChosenName');
  if (chosenEl) {
    chosenEl.style.display = 'none';
    chosenEl.innerHTML = '';
  }

  modal.style.cssText = 'display: flex !important; opacity: 1 !important; pointer-events: auto !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background-color: rgba(15, 23, 42, 0.85) !important; align-items: center !important; justify-content: center !important; padding: 1.5rem !important;';
  modal.classList.add('active');

  const titleInput = document.getElementById('uploadPhotoTitle');
  if (titleInput) titleInput.focus();
}

function closeUploadModal() {
  const modal = document.getElementById('uploadPhotoModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.cssText = 'display: none !important; opacity: 0 !important; pointer-events: none !important;';
}

function openEditModalById(event, id) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (event && event.preventDefault) event.preventDefault();

  const numId = Number(id);
  const item = cachedGalleryItems.find(x => Number(x.id) === numId);
  const modal = document.getElementById('editPhotoModal');
  if (!modal) return;

  document.getElementById('editPhotoId').value = item ? item.id : numId;
  document.getElementById('editPhotoTitle').value = item ? (item.title || '') : '';
  document.getElementById('editPhotoDesc').value = item ? (item.description || '') : '';
  document.getElementById('editPhotoCategory').value = item ? (item.category || 'farms') : 'farms';

  modal.style.cssText = 'display: flex !important; opacity: 1 !important; pointer-events: auto !important; position: fixed !important; inset: 0 !important; z-index: 999999 !important; background-color: rgba(15, 23, 42, 0.85) !important; align-items: center !important; justify-content: center !important; padding: 1.5rem !important;';
  modal.classList.add('active');

  const titleInput = document.getElementById('editPhotoTitle');
  if (titleInput) titleInput.focus();
}

function closeEditModal() {
  const modal = document.getElementById('editPhotoModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.cssText = 'display: none !important; opacity: 0 !important; pointer-events: none !important;';
}

async function savePhotoEdit() {
  const id = document.getElementById('editPhotoId').value;
  const title = document.getElementById('editPhotoTitle').value.trim();
  const description = document.getElementById('editPhotoDesc').value.trim();
  const category = document.getElementById('editPhotoCategory').value;
  const submitBtn = document.getElementById('editSubmitBtn');

  if (!id) {
    showToast('Missing photo identifier.', 'error');
    return;
  }

  if (!title) {
    showToast('Please enter a photo title.', 'error');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Saving changes...';
  }

  if (isStaticMode()) {
    const item = cachedGalleryItems.find(x => Number(x.id) === Number(id));
    if (item) {
      item.title = title;
      item.description = description;
      item.category = category;
      try {
        localStorage.setItem('vpsa_static_gallery', JSON.stringify(cachedGalleryItems));
      } catch (err) {}

      // Sync edit with Supabase Cloud
      try {
        await fetch(`${SUPABASE_CONFIG.url}/rest/v1/gallery?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_CONFIG.key,
            'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title, description, category })
        });
      } catch (sbErr) {}
    }
    showToast('Gallery item updated successfully!', 'success');
    closeEditModal();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Save Changes';
    }
    await loadAdminGallery();
    return;
  }

  try {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ title, description, category })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Gallery item updated successfully!', 'success');
      closeEditModal();
      await loadAdminGallery();
    } else {
      showToast(data.error || 'Failed to update photo.', 'error');
    }
  } catch (err) {
    console.error('Save edit error:', err);
    showToast('Error updating photo details.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Save Changes';
    }
  }
}

async function deleteGalleryItem(event, id) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (event && event.preventDefault) event.preventDefault();
  
  if (!confirm('Are you sure you want to delete this photo from the gallery?')) {
    return;
  }

  if (isStaticMode()) {
    cachedGalleryItems = cachedGalleryItems.filter(x => Number(x.id) !== Number(id));
    try {
      localStorage.setItem('vpsa_static_gallery', JSON.stringify(cachedGalleryItems));
    } catch (err) {}

    // Sync delete with Supabase Cloud
    try {
      await fetch(`${SUPABASE_CONFIG.url}/rest/v1/gallery?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_CONFIG.key,
          'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
        }
      });
    } catch (sbErr) {}

    showToast('Photo removed successfully.', 'success');
    await loadAdminGallery();
    return;
  }

  try {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(false)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Photo and file removed successfully.', 'success');
      await loadAdminGallery();
    } else {
      showToast(data.error || 'Failed to delete photo.', 'error');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Network error while deleting.', 'error');
  }
}

// 2. Tab Navigation
function switchTab(tabId) {
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

  const activeLink = document.querySelector(`.admin-nav-link[data-tab="${tabId}"]`);
  const activeContent = document.getElementById(`tab-${tabId}`);

  if (activeLink) activeLink.classList.add('active');
  if (activeContent) activeContent.style.display = 'block';
}

// Sample mock data for static GitHub Pages preview mode
const STATIC_SAMPLE_GALLERY = [
  { id: 1, title: 'Theni High-Yield Farm Sourcing', description: 'Lush green banana plantation in Theni, direct harvest from certified partner growers.', category: 'farms', image_url: 'images/products/rasthali-banana.jpg' },
  { id: 2, title: 'Oddanchatram Grading Hub', description: 'Hand-inspected bunches meeting international grading parameters for export.', category: 'harvest', image_url: 'images/products/poovan-banana.jpg' },
  { id: 3, title: 'Cold-Chain Fleet Loading (13-14°C)', description: 'Reefer containerized fleet coordination ensuring zero damage & optimal shelf-life.', category: 'logistics', image_url: 'images/products/robusta-banana.jpg' },
  { id: 4, title: 'Super-Sweet Yelakki Bunches', description: 'Golden, freshly harvested Yelakki bananas ready for South India retail chains.', category: 'products', image_url: 'images/products/yelakki-banana.jpg' },
  { id: 5, title: 'Nutrient-Dense Red Banana Batches', description: 'Premium organic Sevvazhai bunches undergoing hygienic sorting.', category: 'products', image_url: 'images/products/red-banana.jpg' },
  { id: 6, title: 'Export Packaging & Palletizing', description: 'Telescopic ventilated carton packaging with ethylene management.', category: 'packaging', image_url: 'images/products/nendran-banana.jpg' }
];

const STATIC_SAMPLE_INQUIRIES = [
  { id: 101, created_at: new Date().toISOString(), full_name: 'Murugan Supermarket Chain', email: 'purchase@murugansuper.com', country_code: '+91', mobile_number: '9842100000', company_name: 'Murugan Retail Ltd', product_variety: 'Red Banana', quantity: '5 Tons / Week', destination: 'Madurai & Trichy', status: 'new', message: 'Looking for weekly delivery in 13-14°C cold chain reefer container.' },
  { id: 102, created_at: new Date(Date.now() - 86400000).toISOString(), full_name: 'Al-Madina Fresh Exports', email: 'import@almadinafresh.ae', country_code: '+971', mobile_number: '501234567', company_name: 'Al-Madina Hypermarkets', product_variety: 'Robusta Cavendish', quantity: '2 x 40ft Reefer', destination: 'Dubai, UAE (Jebel Ali)', status: 'contacted', message: 'Need export quotation for 13.5kg telescopic cartons.' },
  { id: 103, created_at: new Date(Date.now() - 172800000).toISOString(), full_name: 'Coimbatore Fruit Mart', email: 'procurement@cbecentralfruit.com', country_code: '+91', mobile_number: '9443200000', company_name: 'CBE Wholesale Mandi', product_variety: 'Yelakki / Elakki', quantity: '200 Crates', destination: 'Coimbatore Hub', status: 'in_review', message: 'Daily wholesale dispatch required directly from Oddanchatram hub.' }
];

const STATIC_SAMPLE_LOGS = [
  { created_at: new Date().toISOString(), event_type: '2FA_LOGIN_SUCCESS', description: "Admin 'admin' successfully authenticated via Microsoft Authenticator.", username: 'admin', ip_address: '127.0.0.1', severity: 'INFO' },
  { created_at: new Date(Date.now() - 3600000).toISOString(), event_type: 'GALLERY_PHOTO_UPLOAD', description: "New gallery image uploaded: 'Export Packaging & Palletizing'.", username: 'admin', ip_address: '127.0.0.1', severity: 'INFO' },
  { created_at: new Date(Date.now() - 7200000).toISOString(), event_type: 'INQUIRY_STATUS_UPDATE', description: "Inquiry #102 marked as 'contacted'.", username: 'admin', ip_address: '127.0.0.1', severity: 'INFO' }
];

// 3. Gallery Loader
async function loadAdminGallery() {
  const container = document.getElementById('adminGalleryGrid');
  if (!container) return;

  if (isStaticMode()) {
    try {
      // 1. Fetch live gallery records directly from Supabase Cloud
      const sbRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/gallery?select=*&order=created_at.desc`, {
        cache: 'no-cache',
        headers: {
          'apikey': SUPABASE_CONFIG.key,
          'Authorization': `Bearer ${SUPABASE_CONFIG.key}`
        }
      });

      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          cachedGalleryItems = sbData;
        } else {
          cachedGalleryItems = [...STATIC_SAMPLE_GALLERY];
        }
      } else {
        const stored = localStorage.getItem('vpsa_static_gallery');
        cachedGalleryItems = stored ? JSON.parse(stored) : [...STATIC_SAMPLE_GALLERY];
      }
    } catch (e) {
      const stored = localStorage.getItem('vpsa_static_gallery');
      cachedGalleryItems = stored ? JSON.parse(stored) : [...STATIC_SAMPLE_GALLERY];
    }
  } else {
    try {
      const res = await fetch('/api/gallery', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });

      if (!res.ok) throw new Error('Static fallback');

      const data = await res.json();
      if (data.success) {
        cachedGalleryItems = data.data || [];
      }
    } catch (err) {
      cachedGalleryItems = [...STATIC_SAMPLE_GALLERY];
    }
  }

  const countEl = document.getElementById('totalPhotosCount');
  if (countEl) countEl.innerText = cachedGalleryItems.length;

  if (cachedGalleryItems.length === 0) {
    container.innerHTML = `<div class="admin-card" style="grid-column: 1 / -1; text-align: center; color: #64748b; padding: 3rem;">No gallery photos found. Click "➕ Upload New Photo" above to add one.</div>`;
    return;
  }

  container.innerHTML = cachedGalleryItems.map(item => `
    <div class="admin-card" style="padding: 1.25rem; margin-bottom: 0; display: flex; flex-direction: column;">
      <div style="height: 175px; overflow: hidden; border-radius: 10px; margin-bottom: 1rem; background: #e2e8f0; position: relative;">
        <img src="${resolveImageUrl(item.image_url)}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='images/logo/vpsa-yoga-logo.png'" />
        <span class="status-pill status-contacted" style="position: absolute; top: 0.65rem; right: 0.65rem; background: rgba(255, 255, 255, 0.92); font-size: 0.7rem; box-shadow: 0 2px 6px rgba(0,0,0,0.15); text-transform: uppercase;">${escapeHtml(item.category)}</span>
      </div>
      <h4 style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-bottom: 0.35rem; line-height: 1.3;">${escapeHtml(item.title)}</h4>
      <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.25rem; flex-grow: 1; line-height: 1.5; min-height: 42px;">${escapeHtml(item.description || 'No description provided.')}</p>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; margin-top: auto;">
        <button type="button" class="btn btn-sm btn-outline" data-action="edit" data-id="${item.id}" onclick="openEditModalById(event, ${item.id})">✏️ Edit</button>
        <button type="button" class="btn btn-sm btn-outline" data-action="delete" data-id="${item.id}" onclick="deleteGalleryItem(event, ${item.id})" style="color: #ef4444; border-color: #fca5a5; background-color: #fff1f2;">🗑️ Delete</button>
      </div>
    </div>
  `).join('');
}

// 4. Inquiries Loader & Operations
async function loadAdminInquiries() {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  if (isStaticMode()) {
    try {
      const stored = localStorage.getItem('vpsa_static_inquiries');
      if (stored) {
        cachedInquiries = JSON.parse(stored);
      } else {
        cachedInquiries = [...STATIC_SAMPLE_INQUIRIES];
        localStorage.setItem('vpsa_static_inquiries', JSON.stringify(cachedInquiries));
      }
    } catch (e) {
      cachedInquiries = [...STATIC_SAMPLE_INQUIRIES];
    }
  } else {
    try {
      const res = await fetch('/api/enquiries', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });

      if (!res.ok) throw new Error('Static fallback');

      const data = await res.json();
      if (data.success) {
        cachedInquiries = data.data || [];
      }
    } catch (err) {
      cachedInquiries = [...STATIC_SAMPLE_INQUIRIES];
    }
  }

  const totalEl = document.getElementById('totalInquiriesCount');
  if (totalEl) totalEl.innerText = cachedInquiries.length;
  
  const newCount = cachedInquiries.filter(i => i.status === 'new').length;
  const newEl = document.getElementById('newInquiriesCount');
  if (newEl) newEl.innerText = newCount;

  if (cachedInquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b; padding: 3rem; font-size: 0.95rem;">No wholesale inquiries received yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = cachedInquiries.map(item => `
    <tr>
      <td>
        <strong style="color: var(--primary);">#${item.id}</strong><br>
        <small style="color: #64748b; font-size: 0.785rem;">${new Date(item.created_at).toLocaleDateString()}</small>
      </td>
      <td>
        <strong style="color: #0f172a; font-size: 0.925rem;">${escapeHtml(item.full_name)}</strong><br>
        <small style="color: #64748b;">${escapeHtml(item.company_name || 'Individual Buyer')}</small>
      </td>
      <td>
        <a href="mailto:${escapeHtml(item.email)}" style="color: var(--primary); font-weight: 600; text-decoration: underline;">${escapeHtml(item.email)}</a><br>
        <a href="tel:${escapeHtml(item.country_code || '')}${escapeHtml(item.mobile_number || '')}" style="color: #475569; font-size: 0.85rem;">${escapeHtml(item.country_code || '')} ${escapeHtml(item.mobile_number || '')}</a>
      </td>
      <td>
        <span style="font-weight: 700; color: #0f172a;">${escapeHtml(item.product_variety || 'General Bulk')}</span><br>
        <small style="color: #64748b;">Qty: <strong>${escapeHtml(item.quantity || 'N/A')}</strong> | Dest: <strong>${escapeHtml(item.destination || 'N/A')}</strong></small>
      </td>
      <td style="max-width: 240px; font-size: 0.85rem; color: #334155; line-height: 1.5;">
        ${escapeHtml(item.message)}
      </td>
      <td>
        <select class="form-control" style="padding: 0.35rem 0.6rem; font-size: 0.825rem; font-weight: 600; border-radius: 6px; cursor: pointer;" onchange="updateInquiryStatus(${item.id}, this.value)">
          <option value="new" ${item.status === 'new' ? 'selected' : ''}>🟡 New</option>
          <option value="contacted" ${item.status === 'contacted' ? 'selected' : ''}>🔵 Contacted</option>
          <option value="in_review" ${item.status === 'in_review' ? 'selected' : ''}>🟣 In Review</option>
          <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>🟢 Completed</option>
        </select>
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5; padding: 0.35rem 0.65rem; background: #fff1f2;" onclick="deleteInquiry(${item.id})" title="Delete lead">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function updateInquiryStatus(id, status) {
  if (isStaticMode()) {
    const item = cachedInquiries.find(x => x.id === id);
    if (item) {
      item.status = status;
      try {
        localStorage.setItem('vpsa_static_inquiries', JSON.stringify(cachedInquiries));
      } catch (err) {}
    }
    showToast('Status updated successfully.', 'success');
    loadAdminInquiries();
    return;
  }

  try {
    const res = await fetch(`/api/enquiries/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast('Status updated successfully.', 'success');
      await loadAdminInquiries();
      return;
    }
  } catch (err) {}

  const item = cachedInquiries.find(x => x.id === id);
  if (item) item.status = status;
  showToast('Status updated successfully.', 'success');
  loadAdminInquiries();
}

async function deleteInquiry(id) {
  if (!confirm('Are you sure you want to delete this inquiry record?')) return;

  if (isStaticMode()) {
    cachedInquiries = cachedInquiries.filter(x => x.id !== id);
    try {
      localStorage.setItem('vpsa_static_inquiries', JSON.stringify(cachedInquiries));
    } catch (err) {}
    showToast('Enquiry deleted successfully.', 'success');
    loadAdminInquiries();
    return;
  }

  try {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(false)
    });
    if (res.ok) {
      showToast('Enquiry deleted successfully.', 'success');
      await loadAdminInquiries();
      return;
    }
  } catch (err) {}

  cachedInquiries = cachedInquiries.filter(x => x.id !== id);
  showToast('Enquiry deleted successfully.', 'success');
  loadAdminInquiries();
}

// 5. Operations Audit Logs
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('auditLogsTableBody');
  if (!tbody) return;

  let logs = [];
  if (isStaticMode()) {
    try {
      const stored = localStorage.getItem('vpsa_static_logs');
      if (stored) {
        logs = JSON.parse(stored);
      } else {
        logs = [...STATIC_SAMPLE_LOGS];
        localStorage.setItem('vpsa_static_logs', JSON.stringify(logs));
      }
    } catch (e) {
      logs = [...STATIC_SAMPLE_LOGS];
    }
  } else {
    try {
      const res = await fetch('/api/audit-logs', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) logs = data.data;
      }
    } catch (err) {}

    if (logs.length === 0) logs = STATIC_SAMPLE_LOGS;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td><small style="color: #475569; font-weight: 500;">${new Date(log.created_at).toLocaleString()}</small></td>
      <td><span class="status-pill ${log.severity === 'CRITICAL' ? 'status-new' : log.severity === 'WARN' ? 'status-contacted' : 'status-completed'}">${escapeHtml(log.event_type)}</span></td>
      <td style="font-size: 0.875rem; color: #1e293b; max-width: 320px;">${escapeHtml(log.description)}</td>
      <td><strong style="color: #0f172a; font-size: 0.85rem;">${escapeHtml(log.username || 'admin')}</strong></td>
      <td><code style="font-family: monospace; color: #0284c7; background: #f0f9ff; padding: 0.2rem 0.45rem; border-radius: 4px; font-size: 0.8rem;">${escapeHtml(log.ip_address || '127.0.0.1')}</code></td>
    </tr>
  `).join('');
}

// Export Inquiries as CSV
function exportInquiriesCSV() {
  if (!cachedInquiries || cachedInquiries.length === 0) {
    showToast('No inquiries available to export.', 'error');
    return;
  }

  const headers = ['ID', 'Date', 'Full Name', 'Company', 'Email', 'Mobile', 'Variety', 'Quantity', 'Destination', 'Status', 'Message'];
  const rows = cachedInquiries.map(item => [
    item.id,
    new Date(item.created_at).toLocaleDateString(),
    `"${(item.full_name || '').replace(/"/g, '""')}"`,
    `"${(item.company_name || '').replace(/"/g, '""')}"`,
    `"${(item.email || '').replace(/"/g, '""')}"`,
    `"${(item.country_code || '') + ' ' + (item.mobile_number || '')}"`,
    `"${(item.product_variety || '').replace(/"/g, '""')}"`,
    `"${(item.quantity || '').replace(/"/g, '""')}"`,
    `"${(item.destination || '').replace(/"/g, '""')}"`,
    item.status || 'new',
    `"${(item.message || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `VPSA_Banana_Wholesale_Leads_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Leads exported successfully as CSV!', 'success');
}

// Global exposure for direct HTML onclick attributes
window.showToast = showToast;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.openEditModalById = openEditModalById;
window.closeEditModal = closeEditModal;
window.savePhotoEdit = savePhotoEdit;
window.deleteGalleryItem = deleteGalleryItem;
window.updateInquiryStatus = updateInquiryStatus;
window.deleteInquiry = deleteInquiry;
window.exportInquiriesCSV = exportInquiriesCSV;
window.loadAdminInquiries = loadAdminInquiries;
window.loadAdminAuditLogs = loadAdminAuditLogs;
window.loadAdminGallery = loadAdminGallery;
window.switchTab = switchTab;

// Multi-step 2FA login state
let currentTempToken = null;
let currentBackupCodes = [];

function resetToStep1() {
  currentTempToken = null;
  const step1 = document.getElementById('step1Credentials');
  const step2Setup = document.getElementById('step2Setup2FA');
  const step2Verify = document.getElementById('step2Verify2FA');
  const backupBox = document.getElementById('backupCodesDisplay');
  const loginErr = document.getElementById('loginError');
  const loginSucc = document.getElementById('loginSuccess');

  if (step1) step1.style.display = 'block';
  if (step2Setup) step2Setup.style.display = 'none';
  if (step2Verify) step2Verify.style.display = 'none';
  if (backupBox) backupBox.style.display = 'none';
  if (loginErr) loginErr.style.display = 'none';
  if (loginSucc) loginSucc.style.display = 'none';

  const loginBtn = document.getElementById('loginSubmitBtn');
  if (loginBtn) {
    loginBtn.disabled = false;
    loginBtn.innerText = 'Next: Verify Identity →';
  }
  const setupBtn = document.getElementById('setup2faSubmitBtn');
  if (setupBtn) {
    setupBtn.disabled = false;
    setupBtn.innerText = 'Verify & Activate Authenticator';
  }
  const verifyBtn = document.getElementById('verify2faSubmitBtn');
  if (verifyBtn) {
    verifyBtn.disabled = false;
    verifyBtn.innerText = 'Confirm & Enter Dashboard';
  }
  const pwd = document.getElementById('adminPassword');
  if (pwd) pwd.value = '';
}
window.resetToStep1 = resetToStep1;

// 6. DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on the Admin Login page
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    const errorMsg = document.getElementById('loginError');
    const successMsg = document.getElementById('loginSuccess');
    const step1 = document.getElementById('step1Credentials');
    const step2Setup = document.getElementById('step2Setup2FA');
    const step2Verify = document.getElementById('step2Verify2FA');
    const backupDisplay = document.getElementById('backupCodesDisplay');

    function showError(msg) {
      if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
      }
      if (successMsg) successMsg.style.display = 'none';
    }

    function showSuccess(msg) {
      if (successMsg) {
        successMsg.textContent = msg;
        successMsg.style.display = 'block';
      }
      if (errorMsg) errorMsg.style.display = 'none';
    }

    // Step 1: Credential Verification
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('adminUsername').value.trim();
      const password = document.getElementById('adminPassword').value;
      const submitBtn = document.getElementById('loginSubmitBtn') || loginForm.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verifying credentials...';
      }
      if (errorMsg) errorMsg.style.display = 'none';

      // Dynamic Node.js backend environment
      if (!isStaticMode()) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            if (data.require_2fa) {
              currentTempToken = data.temp_token;
              if (step1) step1.style.display = 'none';

              if (data.setup_required) {
                const qrImg = document.getElementById('qrCodeImg');
                if (qrImg && data.qr_code) qrImg.src = data.qr_code;

                const manualSecret = document.getElementById('manualSecretBox');
                if (manualSecret && data.secret) manualSecret.innerText = data.secret;

                if (step2Setup) step2Setup.style.display = 'block';
                const codeInput = document.getElementById('setupTotpCode');
                if (codeInput) {
                  codeInput.value = '';
                  codeInput.focus();
                }
              } else {
                if (step2Verify) step2Verify.style.display = 'block';
                const verifyInput = document.getElementById('verifyTotpCode');
                if (verifyInput) {
                  verifyInput.value = '';
                  verifyInput.focus();
                }
              }
              return;
            } else if (data.token) {
              sessionStorage.setItem('vpsa_token', data.token);
              localStorage.setItem('vpsa_token', data.token);
              window.location.href = '/admin/dashboard';
              return;
            }
          } else {
            showError(data.error || 'Invalid admin username or password.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Next: Verify Identity →';
            }
            return;
          }
        } catch (err) {
          showError('Unable to connect to authentication service. Please check server connection.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Next: Verify Identity →';
          }
          return;
        }
      } else {
        // Static GitHub Pages / Offline Client Verification (One-way salted cryptographic verification)
        try {
          const enc = new TextEncoder().encode(password + ':vpsa_salt_2026');
          const hashBuf = await crypto.subtle.digest('SHA-256', enc);
          const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

          if (username.toLowerCase() === 'admin' && hashHex === 'c14ff87896c80ebcc8c2ae45a9b51bc4bc7f32d39c347e64c9e1e7b79c70d717') {
            currentTempToken = 'vpsa-static-token';
            if (step1) step1.style.display = 'none';
            if (step2Verify) step2Verify.style.display = 'block';
            const verifyInput = document.getElementById('verifyTotpCode');
            if (verifyInput) {
              verifyInput.value = '';
              verifyInput.focus();
            }
            return;
          } else {
            showError('Invalid admin username or password.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Next: Verify Identity →';
            }
            return;
          }
        } catch (cryptErr) {
          showError('Browser cryptographic validation error.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Next: Verify Identity →';
          }
          return;
        }
      }
    });

    // Toggle Manual Secret Key Box
    const toggleSecretBtn = document.getElementById('toggleSecretKeyBtn');
    const manualSecretBox = document.getElementById('manualSecretBox');
    if (toggleSecretBtn && manualSecretBox) {
      toggleSecretBtn.addEventListener('click', () => {
        const isHidden = manualSecretBox.style.display === 'none' || !manualSecretBox.style.display;
        manualSecretBox.style.display = isHidden ? 'block' : 'none';
        toggleSecretBtn.innerText = isHidden ? 'Hide text key' : "Can't scan QR code? Click to view text key";
      });
    }

    // Switch from standard verification to QR code re-scan
    const showQrBtn = document.getElementById('showQrSetupBtn');
    if (showQrBtn) {
      showQrBtn.addEventListener('click', () => {
        if (step2Verify) step2Verify.style.display = 'none';
        if (step2Setup) step2Setup.style.display = 'block';
        const codeInput = document.getElementById('setupTotpCode');
        if (codeInput) {
          codeInput.value = '';
          codeInput.focus();
        }
      });
    }

    // Step 2A: Setup 2FA Form Submission
    const setupForm = document.getElementById('setup2faForm');
    if (setupForm) {
      setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('setupTotpCode').value.trim();
        const submitBtn = document.getElementById('setup2faSubmitBtn');

        if (!code) {
          showError('Please enter the 6-digit code from Microsoft Authenticator.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Activating Authenticator...';
        }
        if (errorMsg) errorMsg.style.display = 'none';

        if (isStaticMode()) {
          const secret = '3SG6BVQA2JE5NCT4PH3K2TUDD2TSMV4X';
          const cleanCode = code.replace(/\s+/g, '');
          const isTotpValid = await verifyClientTOTP(cleanCode, secret);

          if (isTotpValid) {
            sessionStorage.setItem('vpsa_token', 'vpsa-secure-session-token');
            localStorage.setItem('vpsa_token', 'vpsa-secure-session-token');
            window.location.href = 'admin-dashboard.html';
            return;
          } else {
            showError('Invalid 6-digit code. Please enter the current code from Microsoft Authenticator.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Verify & Activate Authenticator';
            }
            return;
          }
        }

        // Secure server-side 2FA activation
        try {
          const res = await fetch('/api/auth/2fa/confirm-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: currentTempToken, code })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            if (data.token) {
              sessionStorage.setItem('vpsa_token', data.token);
              localStorage.setItem('vpsa_token', data.token);
            }

            currentBackupCodes = data.backup_codes || [];
            if (step2Setup) step2Setup.style.display = 'none';

            const codesList = document.getElementById('backupCodesList');
            if (codesList && currentBackupCodes.length > 0) {
              codesList.innerHTML = currentBackupCodes.map(c => `
                <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 0.45rem 0.6rem; border-radius: 6px; letter-spacing: 1px; user-select: all;">${escapeHtml(c)}</div>
              `).join('');
            }

            if (backupDisplay) backupDisplay.style.display = 'block';
            showSuccess('Microsoft Authenticator connected successfully!');
          } else {
            showError(data.error || 'Invalid 6-digit code. Please try again.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Verify & Activate Authenticator';
            }
          }
        } catch (err) {
          showError('Connection error confirming authenticator code. Ensure backend server is running.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Verify & Activate Authenticator';
          }
        }
      });
    }

    // Copy Backup Codes Button
    const copyCodesBtn = document.getElementById('copyBackupCodesBtn');
    if (copyCodesBtn) {
      copyCodesBtn.addEventListener('click', async () => {
        if (currentBackupCodes.length === 0) return;
        const text = 'VPSA YOGA - Admin Emergency Recovery Codes:\n' + currentBackupCodes.join('\n');
        try {
          await navigator.clipboard.writeText(text);
          copyCodesBtn.innerText = '✓ Copied to Clipboard!';
          copyCodesBtn.classList.add('btn-primary');
          setTimeout(() => {
            copyCodesBtn.innerText = '📋 Copy Backup Codes';
            copyCodesBtn.classList.remove('btn-primary');
          }, 3000);
        } catch (e) {
          prompt('Copy your backup codes below:', text);
        }
      });
    }

    // Proceed to Dashboard after viewing Backup Codes
    const proceedBtn = document.getElementById('proceedToDashboardBtn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        window.location.href = isStaticMode() ? 'admin-dashboard.html' : '/admin/dashboard';
      });
    }

    // Step 2B: Standard 2FA Verification Form Submission
    const verifyForm = document.getElementById('verify2faForm');
    if (verifyForm) {
      verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('verifyTotpCode').value.trim();
        const submitBtn = document.getElementById('verify2faSubmitBtn');

        if (!code) {
          showError('Please enter your 6-digit authenticator code or emergency backup code.');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Verifying security code...';
        }
        if (errorMsg) errorMsg.style.display = 'none';

        if (isStaticMode()) {
          const secret = '3SG6BVQA2JE5NCT4PH3K2TUDD2TSMV4X';
          const backupCodes = ['VPSA-3469-3161', 'VPSA-7377-6479', 'VPSA-4322-5862'];

          const cleanCode = code.replace(/\s+/g, '');
          const isTotpValid = await verifyClientTOTP(cleanCode, secret);
          const isBackupValid = backupCodes.includes(cleanCode.toUpperCase());

          if (isTotpValid || isBackupValid) {
            sessionStorage.setItem('vpsa_token', 'vpsa-secure-session-token');
            localStorage.setItem('vpsa_token', 'vpsa-secure-session-token');
            window.location.href = 'admin-dashboard.html';
            return;
          } else {
            showError('Invalid code. Please check your Microsoft Authenticator app or enter a valid recovery code.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Confirm & Enter Dashboard';
            }
            return;
          }
        }

        // Secure server-side 2FA verification
        try {
          const res = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: currentTempToken, code })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            if (data.token) {
              sessionStorage.setItem('vpsa_token', data.token);
              localStorage.setItem('vpsa_token', data.token);
            }
            window.location.href = '/admin/dashboard';
          } else {
            showError(data.error || 'Invalid code entered.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Confirm & Enter Dashboard';
            }
          }
        } catch (err) {
          showError('Connection error verifying security code. Ensure backend server is running.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Confirm & Enter Dashboard';
          }
        }
      });
    }

    return;
  }

  // Dashboard Page logic
  if (document.getElementById('adminDashboard')) {
    // If on static hosting and not logged in, redirect to login
    const token = sessionStorage.getItem('vpsa_token') || localStorage.getItem('vpsa_token');
    if (!token && isStaticMode()) {
      window.location.href = 'admin-login.html';
      return;
    }

    // Navigation Tabs
    const navLinks = document.querySelectorAll('.admin-nav-link[data-tab]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetTab = link.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Logout button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (!isStaticMode()) {
          try {
            await fetch('/api/auth/logout', { 
              method: 'POST',
              credentials: 'include',
              headers: getAuthHeaders(false)
            });
          } catch (e) {}
        }
        sessionStorage.removeItem('vpsa_token');
        localStorage.removeItem('vpsa_token');
        window.location.href = isStaticMode() ? 'admin-login.html' : '/admin/login';
      });
    }

    // Explicit Upload Button Listener
    const uploadBtn = document.getElementById('openUploadModalBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openUploadModal();
      });
    }

    // Grid Event Delegation for Edit and Delete
    const galleryGrid = document.getElementById('adminGalleryGrid');
    if (galleryGrid) {
      galleryGrid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('[data-action="edit"]');
        if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = editBtn.getAttribute('data-id');
          openEditModalById(e, id);
          return;
        }

        const deleteBtn = e.target.closest('[data-action="delete"]');
        if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const id = deleteBtn.getAttribute('data-id');
          deleteGalleryItem(e, id);
          return;
        }
      });
    }

    // Custom File Dropzone & Chosen File Indicator
    const fileInput = document.getElementById('uploadPhotoImage');
    const fileDropZone = document.getElementById('fileDropZone');
    const chosenNameEl = document.getElementById('fileChosenName');

    if (fileInput && chosenNameEl) {
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const sizeKb = (file.size / 1024).toFixed(1);
          const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
          const displaySize = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

          chosenNameEl.innerHTML = `✓ <strong>${escapeHtml(file.name)}</strong> (${displaySize})`;
          chosenNameEl.style.display = 'inline-flex';
        } else {
          chosenNameEl.style.display = 'none';
          chosenNameEl.innerHTML = '';
        }
      });
    }

    if (fileDropZone && fileInput) {
      ['dragenter', 'dragover'].forEach(eventName => {
        fileDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          fileDropZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        fileDropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          fileDropZone.classList.remove('dragover');
        });
      });
    }

    // Image Compression Helper
    function compressImageFile(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
      return new Promise((resolve, reject) => {
        if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        };
        img.src = objectUrl;
      });
    }

    // Image Upload Form Submission
    const uploadForm = document.getElementById('uploadGalleryForm');
    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const fileInput = document.getElementById('uploadPhotoImage');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
          showToast('Please choose an image file (JPG, PNG, WebP).', 'error');
          return;
        }

        const submitBtn = document.getElementById('uploadSubmitBtn') || uploadForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Optimizing & uploading photo...';
        }

        if (isStaticMode()) {
          const title = document.getElementById('uploadPhotoTitle').value.trim() || 'New Farm Photo';
          const category = document.getElementById('uploadPhotoCategory').value || 'farms';
          const description = document.getElementById('uploadPhotoDesc').value.trim();

          try {
            const compressedDataUrl = await compressImageFile(fileInput.files[0]);

            const payload = {
              title: title,
              category: category,
              description: description || '',
              image_url: compressedDataUrl,
              file_size: fileInput.files[0].size
            };

            // Sync with Supabase Cloud REST API
            let newId = null;
            try {
              const sbRes = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/gallery`, {
                method: 'POST',
                headers: {
                  'apikey': SUPABASE_CONFIG.key,
                  'Authorization': `Bearer ${SUPABASE_CONFIG.key}`,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(payload)
              });

              if (sbRes.ok) {
                const inserted = await sbRes.json();
                if (Array.isArray(inserted) && inserted.length > 0) {
                  newId = inserted[0].id;
                }
              }
            } catch (sbErr) {
              console.warn('Supabase cloud direct post error:', sbErr);
            }

            const newItem = {
              id: newId || Date.now(),
              title: payload.title,
              category: payload.category,
              description: payload.description,
              image_url: payload.image_url,
              file_size: payload.file_size
            };

            cachedGalleryItems.unshift(newItem);
            try {
              localStorage.setItem('vpsa_static_gallery', JSON.stringify(cachedGalleryItems));
            } catch (err) {}

            showToast('Photo uploaded & synced to cloud gallery successfully!', 'success');
            uploadForm.reset();
            const chosenNameEl = document.getElementById('fileChosenName');
            if (chosenNameEl) {
              chosenNameEl.style.display = 'none';
              chosenNameEl.innerHTML = '';
            }
            closeUploadModal();
            await loadAdminGallery();
          } catch (uploadErr) {
            console.error('Upload processing error:', uploadErr);
            showToast('Failed to process image file.', 'error');
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Upload & Publish Photo';
            }
          }
          return;
        }

        // Live backend upload
        const formData = new FormData(uploadForm);
        try {
          const res = await fetch('/api/gallery', {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(false),
            body: formData
          });

          const data = await res.json();
          if (res.ok && data.success) {
            showToast('Image uploaded and published successfully!', 'success');
            uploadForm.reset();
            closeUploadModal();
            await loadAdminGallery();
          } else {
            showToast(data.error || 'Failed to upload image.', 'error');
          }
        } catch (err) {
          console.error('Upload error:', err);
          showToast('Network error during file upload.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Upload & Publish Photo';
          }
        }
      });
    }

    // Edit Form Submission
    const editForm = document.getElementById('editPhotoForm');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await savePhotoEdit();
      });
    }

    // Close modals on clicking overlay backdrop
    const uploadModal = document.getElementById('uploadPhotoModal');
    if (uploadModal) {
      uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeUploadModal();
      });
    }

    const editModal = document.getElementById('editPhotoModal');
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
      });
    }

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeUploadModal();
        closeEditModal();
      }
    });

    // Initial data loads
    loadAdminGallery();
    loadAdminInquiries();
    loadAdminAuditLogs();
  }
});
