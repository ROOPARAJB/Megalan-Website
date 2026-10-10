/**
 * VPSA YOGA - Admin Dashboard & Gallery Management Script
 * Dual-Mode Authenticated Admin Client: Works seamlessly on Node.js Backend & Live Supabase Cloud
 */

// Supabase Cloud Configuration for Direct Live Administration
const SUPABASE_ADMIN_CONFIG = {
  url: 'https://sammfailpehmtxlbqmmh.supabase.co',
  anonKey: 'sb_publishable_fW8EO__Y0fyRVkflrZ4Vlw_LFH-nVN0'
};

// Global in-memory data caches
let cachedGalleryItems = [];
let cachedInquiries = [];

// Helper to normalize image paths
function resolveImageUrl(url) {
  if (!url) return '/images/logo/vpsa-yoga-logo.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return url.startsWith('/') ? url : '/' + url;
}

// Session Inactivity Timeout Configuration (5 Minutes = 300,000 ms)
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

function initSessionTimeout() {
  function updateActivity() {
    sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
  }

  async function checkSessionExpiry() {
    const lastActiveStr = sessionStorage.getItem('vpsa_last_activity');
    if (!lastActiveStr) {
      updateActivity();
      return;
    }

    const elapsed = Date.now() - Number(lastActiveStr);
    if (elapsed > INACTIVITY_TIMEOUT_MS) {
      sessionStorage.removeItem('vpsa_token');
      sessionStorage.removeItem('vpsa_cloud_key');
      sessionStorage.removeItem('vpsa_last_activity');
      sessionStorage.removeItem('vpsa_admin_user');

      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) {}

      alert('🔒 Session Expired: You have been automatically logged out due to 5 minutes of inactivity for your security.');
      window.location.href = '/admin-login.html?reason=timeout';
    }
  }

  updateActivity();

  const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  let throttleTimer = null;
  activityEvents.forEach(evt => {
    window.addEventListener(evt, () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          updateActivity();
          throttleTimer = null;
        }, 2000);
      }
    }, { passive: true });
  });

  setInterval(checkSessionExpiry, 5000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSessionExpiry();
    }
  });
  window.addEventListener('focus', checkSessionExpiry);
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
    <div>${escapeHtml(message)}</div>
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
  const token = sessionStorage.getItem('vpsa_token');
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper to construct Supabase REST Headers
function getSupabaseKey() {
  return SUPABASE_ADMIN_CONFIG.anonKey;
}

async function ensureSupabaseAuthSession() {
  const existingToken = sessionStorage.getItem('vpsa_supabase_token') || sessionStorage.getItem('vpsa_token');
  if (existingToken && existingToken.startsWith('eyJ')) {
    return existingToken;
  }
  return null;
}

function getSupabaseHeaders(isJson = true) {
  const key = getSupabaseKey();
  const token = sessionStorage.getItem('vpsa_supabase_token');
  const authHeader = (token && token.startsWith('eyJ')) ? `Bearer ${token}` : `Bearer ${key}`;
  const headers = {
    'apikey': key,
    'Authorization': authHeader
  };
  if (isJson) {
    headers['Content-Type'] = 'application/json';
    headers['Prefer'] = 'return=representation';
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

  let updateSuccess = false;

  // 1. Try Node Express API
  try {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ title, description, category })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        updateSuccess = true;
      }
    }
  } catch (err) {}

  // 2. Direct Supabase Cloud Fallback (Live static host)
  if (!updateSuccess) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/gallery?id=eq.${id}`, {
        method: 'PATCH',
        headers: getSupabaseHeaders(true),
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          updated_at: new Date().toISOString()
        })
      });
      if (sbRes.ok) {
        updateSuccess = true;
      }
    } catch (e) {
      console.error('Supabase edit error:', e);
    }
  }

  if (updateSuccess) {
    showToast('Gallery item updated successfully!', 'success');
    closeEditModal();
    await loadAdminGallery();
  } else {
    showToast('Failed to update photo details.', 'error');
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Save Changes';
  }
}

async function deleteGalleryItem(event, id) {
  if (event && event.stopPropagation) event.stopPropagation();
  if (event && event.preventDefault) event.preventDefault();
  
  if (!confirm('Are you sure you want to delete this photo from the gallery?')) {
    return;
  }

  let deleteSuccess = false;

  // 1. Try Node API
  try {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(false)
    });
    if (res.ok) {
      deleteSuccess = true;
    }
  } catch (err) {}

  // 2. Direct Supabase Cloud Fallback
  if (!deleteSuccess) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/gallery?id=eq.${id}`, {
        method: 'DELETE',
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        deleteSuccess = true;
      }
    } catch (e) {}
  }

  if (deleteSuccess) {
    showToast('Photo removed successfully.', 'success');
    await loadAdminGallery();
  } else {
    showToast('Failed to delete photo.', 'error');
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

  // Automatically refresh active tab data
  if (tabId === 'gallery') loadAdminGallery();
  if (tabId === 'inquiries') loadAdminInquiries();
  if (tabId === 'audit') loadAdminAuditLogs();
}

// 3. Gallery Loader
async function loadAdminGallery() {
  const container = document.getElementById('adminGalleryGrid');
  if (!container) return;

  const isLocalNodeHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let loaded = false;

  // 1. Direct Supabase Cloud Fetch (Fastest & Authoritative Live Source)
  if (!isLocalNodeHost) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/gallery?select=*&order=created_at.desc`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData)) {
          cachedGalleryItems = sbData;
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Supabase gallery load error:', e);
    }
  }

  // 2. Try Node Express API (For localhost development)
  if (!loaded) {
    try {
      const res = await fetch('/api/gallery', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          cachedGalleryItems = data.data;
          loaded = true;
        }
      }
    } catch (err) {}
  }

  // 3. Direct Supabase fallback
  if (!loaded) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/gallery?select=*&order=created_at.desc`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData)) {
          cachedGalleryItems = sbData;
          loaded = true;
        }
      }
    } catch (e) {}
  }

  // 4. ONLY if network completely failed (offline), use embedded snapshot
  if (!loaded && cachedGalleryItems.length === 0 && Array.isArray(window.__EMBEDDED_GALLERY__)) {
    cachedGalleryItems = [...window.__EMBEDDED_GALLERY__];
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
        <img src="${resolveImageUrl(item.image_url)}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/images/logo/vpsa-yoga-logo.png'" />
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

  const isLocalNodeHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let loaded = false;

  // Ensure authenticated Supabase session
  if (!isLocalNodeHost) {
    await ensureSupabaseAuthSession();
  }

  // 1. Direct Supabase Cloud Fetch (Fastest & Authoritative Live Source)
  if (!isLocalNodeHost) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/inquiries?select=*&order=created_at.desc`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData)) {
          cachedInquiries = sbData;
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Supabase inquiries load error:', e);
    }
  }

  // 2. Try Node Express API (For localhost development)
  if (!loaded) {
    try {
      const res = await fetch('/api/enquiries', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          cachedInquiries = data.data;
          loaded = true;
        }
      }
    } catch (err) {}
  }

  // 3. Direct Supabase Fallback
  if (!loaded) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/inquiries?select=*&order=created_at.desc`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData)) {
          cachedInquiries = sbData;
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Supabase inquiries fallback error:', e);
    }
  }

  // 4. ONLY if network completely failed (offline), use embedded fallback
  if (!loaded && cachedInquiries.length === 0 && Array.isArray(window.__EMBEDDED_INQUIRIES__)) {
    cachedInquiries = [...window.__EMBEDDED_INQUIRIES__];
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
  // Update local in-memory cache immediately for instantaneous responsiveness
  const item = cachedInquiries.find(x => Number(x.id) === Number(id));
  if (item) {
    item.status = status;
  }

  let updateSuccess = false;

  // 1. Try Node API (on localhost)
  try {
    const res = await fetch(`/api/enquiries/${id}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      updateSuccess = true;
    }
  } catch (err) {}

  // 2. Direct Supabase Cloud Sync
  try {
    const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/inquiries?id=eq.${id}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({ status })
    });
    if (sbRes.ok) {
      updateSuccess = true;
    }
  } catch (e) {}

  showToast(`Inquiry #${id} status set to ${status}.`, 'success');
  await loadAdminInquiries();
}

async function deleteInquiry(id) {
  if (!confirm('Are you sure you want to delete this inquiry record?')) return;

  // Remove from local memory cache immediately
  cachedInquiries = cachedInquiries.filter(x => Number(x.id) !== Number(id));

  // 1. Try Node API (on localhost)
  try {
    await fetch(`/api/enquiries/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getAuthHeaders(false)
    });
  } catch (err) {}

  // 2. Direct Supabase Cloud Sync
  try {
    await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/inquiries?id=eq.${id}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders(false)
    });
  } catch (e) {}

  showToast('Inquiry deleted successfully.', 'success');
  await loadAdminInquiries();
}

// 5. Operations Audit Logs
async function loadAdminAuditLogs() {
  const tbody = document.getElementById('auditLogsTableBody');
  if (!tbody) return;

  const isLocalNodeHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  let logs = [];
  let loaded = false;

  // Ensure authenticated Supabase session
  if (!isLocalNodeHost) {
    await ensureSupabaseAuthSession();
  }

  // Initialize from embedded data if available
  if (Array.isArray(window.__EMBEDDED_AUDIT_LOGS__) && window.__EMBEDDED_AUDIT_LOGS__.length > 0) {
    logs = [...window.__EMBEDDED_AUDIT_LOGS__];
  }

  // 1. Direct Supabase Cloud Fetch (Fastest & Guaranteed on Live Host)
  if (!isLocalNodeHost) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=100`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData) && sbData.length > 0) {
          logs = sbData;
          loaded = true;
        }
      }
    } catch (e) {
      console.warn('Supabase audit logs load error:', e);
    }
  }

  // 2. Try Node API (for localhost development)
  if (!loaded) {
    try {
      const res = await fetch('/api/audit-logs', {
        credentials: 'include',
        headers: getAuthHeaders(false)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          logs = data.data;
          loaded = true;
        }
      }
    } catch (err) {}
  }

  // 3. Direct Supabase Fallback
  if (!loaded) {
    try {
      const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/audit_logs?select=*&order=created_at.desc&limit=100`, {
        headers: getSupabaseHeaders(false)
      });
      if (sbRes.ok) {
        const sbData = await sbRes.json();
        if (Array.isArray(sbData)) {
          logs = sbData;
          loaded = true;
        }
      }
    } catch (e) {}
  }

  // 4. Fallback to embedded logs only if offline / network failed
  if (!loaded && logs.length === 0 && Array.isArray(window.__EMBEDDED_AUDIT_LOGS__)) {
    logs = [...window.__EMBEDDED_AUDIT_LOGS__];
  }

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding: 2rem;">No activity log records found.</td></tr>`;
    return;
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

// 6. Universal Two-Way Synchronizer for Admin Panel
async function syncAllAdminData(showToastNotification = false) {
  await Promise.all([
    loadAdminGallery(),
    loadAdminInquiries(),
    loadAdminAuditLogs()
  ]);
  if (showToastNotification) {
    showToast(`✓ Live DB Synchronized: ${cachedInquiries.length} Quotes, ${cachedGalleryItems.length} Photos!`, 'success');
  }
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

// Global exposure
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
window.syncAllAdminData = syncAllAdminData;
window.switchTab = switchTab;

// Multi-step 2FA login state
let currentTempToken = null;
let currentBackupCodes = [];
let isCloudAuthMode = false;

function resetToStep1() {
  currentTempToken = null;
  isCloudAuthMode = false;
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

// RFC 6238 Standard Base32 Decoder & TOTP Generator (Works offline in all modern browsers)
function base32ToBytes(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const clean = base32.replace(/=+$/, '').toUpperCase();
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  return new Uint8Array(bytes);
}

async function computeTotp(secret, epochSeconds = Math.floor(Date.now() / 1000)) {
  const secretBytes = base32ToBytes(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const timeStep = Math.floor(epochSeconds / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setBigUint64(0, BigInt(timeStep));

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return code.toString().padStart(6, '0');
}

async function verifyClientTotp(secret, inputCode) {
  const cleanInput = String(inputCode).trim().replace(/\s+/g, '');
  const now = Math.floor(Date.now() / 1000);
  // Check current, previous (-30s), and next (+30s) time windows
  for (const offset of [0, -30, 30]) {
    const code = await computeTotp(secret, now + offset);
    if (code === cleanInput) {
      return true;
    }
  }
  return false;
}

// 6. DOM Initialization
function initAdmin() {
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

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reason') === 'timeout') {
      showError('🔒 Session expired due to 5 minutes of inactivity. Please log in again.');
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

      let serverResponded = false;

      // 1. Try Node Backend API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        if (res.status === 200) {
          const data = await res.json();
          if (data && data.success) {
            serverResponded = true;
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
              sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
              window.location.href = '/admin/dashboard';
              return;
            }
          }
        } else if (res.status === 401 || res.status === 400) {
          const data = await res.json();
          showError(data.error || 'Invalid admin username or password.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Next: Verify Identity →';
          }
          return;
        }
      } catch (err) {}

      // 2. Cloud Fallback via Supabase Auth (when Node server is not active)
      if (!serverResponded) {
        try {
          const supaEmail = username.includes('@') 
            ? username 
            : (username.toLowerCase() === 'admin' ? 'megalan@vpsayogafresh.com' : username + '@vpsayogafresh.com');

          const res = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ADMIN_CONFIG.anonKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: supaEmail,
              password: password
            })
          });

          const data = await res.json();
          if (res.ok && data.access_token) {
            currentTempToken = data.access_token;

            // Advance to Step 2: 2FA Verification
            if (step1) step1.style.display = 'none';
            if (step2Verify) step2Verify.style.display = 'block';

            const verifyInput = document.getElementById('verifyTotpCode');
            if (verifyInput) {
              verifyInput.value = '';
              verifyInput.focus();
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Next: Verify Identity →';
            }
            return;
          } else {
            showError(data.error_description || data.msg || 'Invalid admin username or password.');
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerText = 'Next: Verify Identity →';
            }
            return;
          }
        } catch (cloudErr) {
          showError('Authentication service unreachable. Please try again.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Next: Verify Identity →';
          }
          return;
        }
      }
    });

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

        let verified = false;

        // 1. Try Node Backend API
        try {
          const res = await fetch('/api/auth/2fa/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: currentTempToken, code })
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              if (data.token) {
                sessionStorage.setItem('vpsa_token', data.token);
                sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
              }
              verified = true;
            }
          }
        } catch (err) {}

        // 2. Supabase Cloud MFA Verification (when live on GitHub Pages)
        if (!verified && currentTempToken) {
          try {
            const res = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/rpc/verify_admin_mfa`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ADMIN_CONFIG.anonKey,
                'Authorization': `Bearer ${currentTempToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ p_code: code })
            });

            if (res.ok) {
              const isValid = await res.json();
              if (isValid === true || (isValid && isValid.valid === true)) {
                sessionStorage.setItem('vpsa_supabase_token', currentTempToken);
                sessionStorage.setItem('vpsa_token', currentTempToken);
                sessionStorage.setItem('vpsa_admin_user', 'admin');
                sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
                verified = true;
              }
            }
          } catch (cloudErr) {}
        }

        if (verified) {
          showSuccess('Two-factor verification successful! Entering dashboard...');
          setTimeout(() => {
            window.location.href = '/admin-dashboard.html';
          }, 350);
          return;
        } else {
          showError('Invalid 6-digit authenticator code or emergency backup code.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Confirm & Enter Dashboard';
          }
          return;
        }
      });
    }

    // Toggle Manual Secret Key Box
    const toggleSecretBtn = document.getElementById('toggleSecretKeyBtn');
    const manualSecretBox = document.getElementById('manualSecretBox');
    // Copy Manual Secret Key button
    const copySecretBtn = document.getElementById('copySecretKeyBtn');
    if (copySecretBtn) {
      copySecretBtn.addEventListener('click', async () => {
        const secretText = document.getElementById('manualSecretText')?.innerText?.trim() || 'BM6P52QVLSCQU63M5ZQ6SMGXRQV5LCUD';
        try {
          await navigator.clipboard.writeText(secretText);
          copySecretBtn.innerText = 'Copied!';
          setTimeout(() => { copySecretBtn.innerText = 'Copy Key'; }, 2500);
          showSuccess('Authenticator secret key copied to clipboard.');
        } catch (e) {
          showSuccess('Key: ' + secretText);
        }
      });
    }

    // Switch between QR setup and 6-digit verify screens
    const switchToVerifyBtn = document.getElementById('switchToVerifyBtn');
    if (switchToVerifyBtn) {
      switchToVerifyBtn.addEventListener('click', () => {
        if (step2Setup) step2Setup.style.display = 'none';
        if (step2Verify) step2Verify.style.display = 'block';
        const verifyInput = document.getElementById('verifyTotpCode');
        if (verifyInput) verifyInput.focus();
      });
    }

    // Re-scan QR code / Pair New Device button
    const showQrSetupBtn = document.getElementById('showQrSetupBtn');
    if (showQrSetupBtn) {
      showQrSetupBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (step2Verify) step2Verify.style.display = 'none';
        if (step2Setup) step2Setup.style.display = 'block';

        const codeInput = document.getElementById('setupTotpCode');
        if (codeInput) {
          codeInput.value = '';
          codeInput.focus();
        }

        // Ensure QR code image src is populated
        const qrImg = document.getElementById('qrCodeImg');
        const secret = 'BM6P52QVLSCQU63M5ZQ6SMGXRQV5LCUD';
        const otpauthUrl = `otpauth://totp/VPSA%20YOGA:admin?secret=${secret}&issuer=VPSA%20YOGA`;
        if (qrImg) {
          qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
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

        let verified = false;

        // 1. Try Node Backend API
        try {
          const res = await fetch('/api/auth/2fa/confirm-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ temp_token: currentTempToken, code })
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              if (data.token) {
                sessionStorage.setItem('vpsa_token', data.token);
                sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
              }
              currentBackupCodes = data.backup_codes || [];
              verified = true;
            }
          }
        } catch (err) {}

        // 2. Supabase Cloud Fallback (Live GitHub Pages)
        if (!verified && currentTempToken) {
          try {
            const res = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/rpc/verify_admin_mfa`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_ADMIN_CONFIG.anonKey,
                'Authorization': `Bearer ${currentTempToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ p_code: code })
            });

            if (res.ok) {
              const isValid = await res.json();
              if (isValid === true || (isValid && isValid.valid === true)) {
                sessionStorage.setItem('vpsa_supabase_token', currentTempToken);
                sessionStorage.setItem('vpsa_token', currentTempToken);
                sessionStorage.setItem('vpsa_admin_user', 'admin');
                sessionStorage.setItem('vpsa_last_activity', String(Date.now()));
                verified = true;
              }
            }
          } catch (cloudErr) {}
        }

        if (verified) {
          if (step2Setup) step2Setup.style.display = 'none';
          showSuccess('Authenticator connected successfully! Entering dashboard...');
          setTimeout(() => {
            window.location.href = '/admin-dashboard.html';
          }, 350);
          return;
        } else {
          showError('Invalid code. Please enter the current 6-digit code from Microsoft Authenticator.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Verify & Activate Authenticator';
          }
        }
      });
    }

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

    const proceedBtn = document.getElementById('proceedToDashboardBtn');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        window.location.href = '/admin-dashboard.html';
      });
    }

    return;
  }

  // Dashboard Page logic
  if (document.getElementById('adminDashboard')) {
    initSessionTimeout();

    // Verify session
    const token = sessionStorage.getItem('vpsa_token');
    if (!token) {
      // Check if active on server
      fetch('/api/auth/me', { credentials: 'include', headers: getAuthHeaders(false) })
        .then(res => {
          if (!res.ok) {
            window.location.href = '/admin-login.html';
          }
        })
        .catch(() => {
          window.location.href = '/admin-login.html';
        });
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
        try {
          await fetch('/api/auth/logout', { 
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(false)
          });
        } catch (e) {}
        sessionStorage.removeItem('vpsa_token');
        sessionStorage.removeItem('vpsa_cloud_key');
        sessionStorage.removeItem('vpsa_last_activity');
        sessionStorage.removeItem('vpsa_admin_user');
        window.location.href = '/admin-login.html';
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

        const title = (document.getElementById('uploadPhotoTitle').value || '').trim() || 'Harvest & Logistics Highlight';
        const category = document.getElementById('uploadPhotoCategory').value || 'farms';
        const description = (document.getElementById('uploadPhotoDesc').value || '').trim();

        const submitBtn = document.getElementById('uploadSubmitBtn') || uploadForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerText = 'Optimizing & uploading photo...';
        }

        let uploadSuccess = false;

        // 1. Try Node backend API
        try {
          const formData = new FormData(uploadForm);
          const res = await fetch('/api/gallery', {
            method: 'POST',
            credentials: 'include',
            headers: getAuthHeaders(false),
            body: formData
          });

          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              uploadSuccess = true;
            }
          }
        } catch (err) {}

        // 2. Direct Supabase Cloud Upload Fallback
        if (!uploadSuccess) {
          try {
            const file = fileInput.files[0];
            const reader = new FileReader();
            await new Promise((resolve, reject) => {
              reader.onload = resolve;
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            const base64Data = reader.result;
            const sbRes = await fetch(`${SUPABASE_ADMIN_CONFIG.url}/rest/v1/gallery`, {
              method: 'POST',
              headers: getSupabaseHeaders(true),
              body: JSON.stringify({
                title,
                category,
                description: description || null,
                image_url: base64Data,
                file_size: file.size
              })
            });

            if (sbRes.ok) {
              uploadSuccess = true;
            }
          } catch (e) {
            console.error('Supabase direct upload error:', e);
          }
        }

        if (uploadSuccess) {
          showToast('Image uploaded and published successfully!', 'success');
          uploadForm.reset();
          if (chosenNameEl) {
            chosenNameEl.style.display = 'none';
            chosenNameEl.innerHTML = '';
          }
          closeUploadModal();
          await loadAdminGallery();
        } else {
          showToast('Failed to upload image.', 'error');
        }

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Upload & Publish Photo';
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeUploadModal();
        closeEditModal();
      }
    });

    // Initial data loads & start automatic background sync (every 25 seconds)
    syncAllAdminData(false);
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncAllAdminData(false);
      }
    }, 25000);
  }
}

// Self-executing initialization (works in all lifecycle phases)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

window.initAdmin = initAdmin;
