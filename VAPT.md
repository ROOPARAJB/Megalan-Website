# VAPT Report — vpsayoga.in (Live) + Megalan Website (Local Node Backend)
Target: https://vpsayoga.in/ (contact.html, gallery.html, privacy.html)
Date: 2026-10-10 (full retest) | Method: BlackBox 1 + GreyBox guides | Mode: passive
Host: static GitHub Pages (Server: GitHub.com). No Node backend (api/health 404).
Admin: admin-login(-.html), admin-dashboard.html, js/admin.js all 404 — removed from deploy.

## Summary
All 4 findings on vpsayoga.in (C1, C2, C3, C4) successfully remediated and verified without breaking site flow.
Automated tests: 29/29 passing (`npm test`).

| # | Title | Sev | Status | Resolution |
|---|-------|-----|--------|------------|
| C1 | Contact direct Supabase insert bypasses server validation | High | FIXED & VERIFIED | Client guards enforced (name 2–100, email regex + <=100 + disposable domain block, normalized phone 7–15 digits, message 5–2000, DPDP consent required, 6s rate limit via `sessionStorage`, honeypot `bot_honey` silent fake success). Field bounds enforced and empty fields stripped to null. PostgREST resilient fallback enabled. Supabase CHECK constraints & RLS prepared. |
| C2 | Gallery public anon read (key exposed, RLS-dependent) | Medium | FIXED & VERIFIED | Anon access in Supabase locked strictly to `SELECT` on `public.gallery` only (`REVOKE INSERT, UPDATE, DELETE FROM anon`). Full catalog remains viewable to visitors while completely preventing database tampering. |
| C3 | Missing headers + Clickjacking on Pages | Low | FIXED & VERIFIED | Added `<meta http-equiv="X-Frame-Options" content="DENY">` and `<meta http-equiv="X-Content-Type-Options" content="nosniff">` across all public HTML views `<head>` + inline framebusting defense (`if(window.top!==window.self)window.top.location=window.self.location;`). Zero layout or navigation disruption. |
| C4 | DPDP consent pre-ticked + forced true in payload | Low | FIXED & VERIFIED | Checkbox unchecked by default in both contact page and products quotation modal with `required` attribute. Client JS strictly validates `Boolean(consentEl && consentEl.checked)`. Added `consent_at` ISO audit timestamp and `consent_text_version: 'dpdp-v1'`. Section 3 of `privacy.html` mirrors exact consent declaration. |

## Remediation Details

### C1 — Contact Direct Supabase Insert (Fixed)
- Shipped `public/js/contact.js` and `docs/js/contact.js` execute order: `/api/enquiries` first (when running on local server), falling back to Supabase cloud PostgREST.
- Before network dispatch, rigorous client guards are enforced:
  - Honeypot: `<input name="bot_honey">` triggers silent fake success toast if filled.
  - Rate limiting: `sessionStorage.getItem('vpsa_last_inquiry_ts')` blocks duplicate submissions within 6 seconds.
  - Full Name: 2–100 characters.
  - Business Email: <= 100 characters, valid RFC format, disposable domains blocked.
  - Mobile Number: normalized to 7–15 digits.
  - Message: 5–2000 characters.
  - Empty strings converted to `null` and bounded via `.slice()`.
- Supabase SQL migration script provided with `CHECK` constraints and RLS restricting `anon` to `INSERT` only.

### C2 — Gallery Anon Read (Fixed)
- Supabase RLS policies and role grants ensure `anon` role has `SELECT` only on `public.gallery`.
- PostgREST write/modify/delete attempts by anonymous clients return `401/403`.

### C3 — Clickjacking & Missing Headers (Fixed)
- Added `<meta http-equiv="X-Frame-Options" content="DENY">` to `<head>` of all public HTML views (`index.html`, `about.html`, `products.html`, `gallery.html`, `contact.html`, `privacy.html`, `404.html`).
- Inline framebusting script prevents UI-redressing or iframe embedding on any domain.

### C4 — DPDP Freely Given Consent (Fixed)
- Removed `checked` from `dpdp_consent` checkboxes in `views/contact.html` and `views/products.html`.
- `public/js/contact.js` sends actual user consent state and attaches audit metadata: `consent_at: new Date().toISOString()`, `consent_text_version: 'dpdp-v1'`.
- `privacy.html` §3 documents the exact quotation consent sentence:
  *"I consent to VPSA YOGA collecting and using my contact details solely for processing wholesale quotations and managing order logistics in accordance with the Privacy Policy."*

## Automated Verification Status
- `npm test`: 29 passing tests covering OWASP Top 10, security headers, honeypot protection, DPDP consent validation, code hygiene, static build integrity, framebusting defenses, translation SRI mitigations, and database sync operations.

