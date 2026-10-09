# VAPT Report — vpsayoga.in (Live) + Megalan Website (Local Node Backend & Supabase Sync)
Target: https://vpsayoga.in/ (incl. contact.html, admin-login.html, admin-dashboard.html)
Date: 2026-10-09 (Full Audit & Verification) | Method: BlackBox + GreyBox | Mode: Active Remediation

## Summary
Vulnerabilities Remediated & Verified: 6/6 FIXED (Critical 1, Medium 2, Low 3).
Backend Local & Supabase Cloud: 26/26 automated tests passing.

| # | Title | Sev | Status | Resolution |
|---|-------|-----|--------|------------|
| W1 | Live admin demo bypass (DEMO_SECRET_KEY + demo-session-token) | Critical | FIXED & VERIFIED | Excluded all admin HTML/JS & demo secrets from `docs/` & `dist/`. Admin routes strictly require Node backend + server TOTP. |
| W2 | Contact PII via wa.me fallback + honeypot-only spam | Medium | FIXED & VERIFIED | Removed auto `wa.me` URL generation with PII. Privacy-preserving fallback notice; canonical submissions strictly validated & sanitized via Node backend. |
| W3 | Persistent JWT in localStorage | Medium | FIXED & VERIFIED | Removed `localStorage` token storage; enforced short-lived `sessionStorage` + `HttpOnly Secure SameSite=Strict` cookies with 5-min inactivity timeout. |
| W4 | Missing headers + Clickjacking on Pages | Low | FIXED & VERIFIED | Enforced Helmet headers (`X-Frame-Options: DENY`, CSP `frame-ancestors 'none'`) on server + inline framebusting defenses across all public views. |
| W5 | Unsigned translate.google.com script, no SRI | Low | FIXED & VERIFIED | Implemented opt-in lazy-loading for Google Translate with `referrerpolicy="no-referrer"`; documented in `privacy.html` §6; excluded from admin. |
| W6 | Static admin sample-data theater + CSV export | Low | FIXED & VERIFIED | Purged all sample admin data, mock leads, and CSV export logic from static build targets. |

## Remediation Details

### W1 — Live admin demo bypass (Critical, CVSS 9.1) — FIXED
- `build-static.js` strictly purges `admin-login.html`, `admin-dashboard.html`, and `js/admin.js` from `docs/` and `dist/`.
- All admin authentication and authorization is strictly enforced on the Node backend (`requireAuthPage`, `requireAuthApi`, `requireAdmin`, server TOTP verification via `otplib`).
- Automated tests verify zero admin files or demo secrets exist in static build output.

### W2 — Contact PII via wa.me fallback + honeypot-only (Medium, CVSS 5.3) — FIXED
- Client script `js/contact.js` no longer constructs or redirects to `wa.me` URLs containing customer PII.
- If backend service is unavailable on a static mirror, a clear privacy-respecting message is displayed directing the user to official Trade Desk channels.
- Canonical path routes through `POST /api/enquiries` with DPDP consent verification, honeypot drop, rate-limiting, and deep XSS sanitization.

### W3 — Persistent JWT in localStorage (Medium, CVSS 5.4) — FIXED
- Admin tokens are never persisted in `localStorage`.
- Authentication uses `HttpOnly Secure SameSite=Strict` session cookies combined with short-lived `sessionStorage` and automatic 5-minute inactivity session expiry.

### W4 — Missing headers + Clickjacking (Low, CVSS 3.7) — FIXED
- Express backend enforces Helmet security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP `frame-ancestors 'none'`).
- Public HTML views include inline framebusting script (`if (window.top !== window.self) window.top.location = window.self.location;`) as defense-in-depth on static hosts.

### W5 — Unsigned translate script (Low, CVSS 2.7) — FIXED
- Removed static auto-fetching `<script>` tags from all HTML views.
- Implemented lazy-loading in `js/main.js` that loads Google Translate only when the user explicitly interacts with the language selector or has a stored language preference.
- All requests use `referrerpolicy="no-referrer"`.
- Third-party processors (Google Translate, Google Fonts, Supabase) are fully disclosed in `privacy.html` §6.

### W6 — Static admin sample theater (Low, CVSS 3.5) — FIXED
- Removed sample data and admin interfaces from static builds.
- Verified `docs/` and `dist/` contain zero mock lead columns or sample records.

## Database Synchronization Status — FIXED & VERIFIED
- **Universal Dual-Sync Engine (`src/database/db-service.js`)**: All CRUD operations for products, gallery items, inquiries, audit logs, and users dual-write to both Supabase (Cloud PostgreSQL) and SQLite (Local) with bidirectional fallback.
- **Seeding Engine (`src/database/seed.js`)**: Automatically syncs default admin credentials, 8 product varieties, and gallery items to both databases on startup.
- **Automated Verification**: `node --test tests/*.test.js` passes 26/26 tests across all security and database synchronization assertions.

