# VAPT Report — vpsayoga.in (Live)
Target: https://vpsayoga.in/ | Date: 2026-10-11 (full retest, byte-level)
Method: BlackBox 1 + GreyBox guides | Mode: passive + 3 read-only anon RLS probes
  (gallery?limit=1, inquiries?limit=0, audit_logs?limit=0 — zero PII returned, no writes)
Host: static GitHub Pages (Server: GitHub.com + HSTS only). No Node backend:
  api/health|enquiries|gallery|auth/* all 404. JS inlined; external js/*.js all 404.

## Summary
Open: 4 (High 1, Medium 2, Low 1). Corrections to prior rounds noted.

| # | Title | Sev | Status |
|---|-------|-----|--------|
| P1 | Contact anon insert (no server validation on static) | High | OPEN |
| P2 | Admin UI public + anon gallery/audit reads; inquiries read denied | Medium | OPEN (downgraded — see RLS) |
| P3 | Translate element.js dynamic inject | Medium | OPEN (lazy, mitigated) |
| P4 | HTTP headers (CSP meta only) | Low | OPEN (platform limits) |

## Measured RLS posture (live, read-only)
- GET rest/v1/gallery?select=id&limit=1 (anon) → 200 [{"id":6}] — anon SELECT allowed.
- GET rest/v1/inquiries?select=id&limit=0 (anon) → 401 permission denied — anon SELECT BLOCKED.
- GET rest/v1/audit_logs?select=id&limit=0 (anon) → 200 [] — anon SELECT permitted
  (empty set: table empty or policy-filtered). Flagged: should be deny-by-default.
- Anon INSERT/UPDATE/DELETE deliberately NOT tested (would write to prod).
  Contact cloud fallback works per code, so anon INSERT on inquiries is presumed allowed.

## P1 — Contact anon insert (High, CVSS 7.5)
- Location: contact.html L1244-1440 inline — honeypot gate, 6s gate, maxlengths
  (100/100/20/100/50/100/2000), email/phone checks, hasConsent gate (L1359), then
  /api/enquiries (404 here) → cloud fallback cloudHost+cloudPath /rest/v1/inquiries +
  cloudKey sb_publishable_... (L1426-1435).
- Impact: no rate-limit/honeypot-server/DPDP-server/regex/sanitize on this host.
  Spam/oversize/junk rows possible; PII dump via anon read is BLOCKED (401 above),
  so confidentiality holds — integrity/availability only.
- Fix (flow intact): keep order; Supabase CHECK constraints + RLS insert-with-checks
  on inquiries; add edge rate-limit/CAPTCHA; rotate key after. No anon writes tested.

## P2 — Admin UI public, data partly locked (Medium, CVSS 5.4, downgraded from Critical)
- Location: admin-login + admin-dashboard.html → 200 (98KB/102KB, full logic inline).
  Guard dash L23-25: any sessionStorage vpsa_token/vpsa_supabase_token opens shell.
- Why not Critical: demo bypass fully CLEAN — zero matches for
  demo-session/DEMO_SECRET/VPSA-2026/JBSWY3DPEHPK3PXP/3SG6BVQA/STATIC_SAMPLE in live
  login+dash. Login tries Node /api/auth/login then Supabase auth/v1 (email mapping
  admin→megalan@vpsayogafresh.com visible in source); MFA via Supabase RPC
  verify_admin_mfa (server-side, sound). Inquiries anon read = 401.
- Residual: UI shell opens on dummy token; anon gallery SELECT + audit SELECT permitted;
  anon write paths exist in code (unverified — RLS may block; not tested to avoid prod writes).
- Fix: remove admin HTML from static deploy (preferred) or fail-closed me-check;
  RLS deny anon all on inquiries/audit_logs/users, gallery select-only; rotate key.

## P3 — Translate inject (Medium, CVSS 4.3)
- Dynamic script.src element.js, zero-referrer; no static tag; §6 documented.
- Fix: keep lazy opt-in only, off admin.

## P4 — Headers (Low, CVSS 3.7)
- HTTP: Server+HSTS only. Mitigation present: CSP <meta> incl. frame-ancestors 'none'
  on admin-login. Fix: CDN fronting or accept.

## Closed/corrected
- Demo/TOTP bypass, wa.me PII prefill, localStorage auth tokens, external stale bundles,
  .env/.git, stack traces: all clean.
- CORRECTION to prior rounds: dpdp_consent:true (contact L1390) is reached ONLY after
  the hasConsent gate (L1359-1376) blocks unticked submits, with consent_at + dpdp-v1
  version — accurate record, not a bypass. Prior "forced consent" finding withdrawn.
- CORRECTION: anon PII dump via inquiries is BLOCKED (401); prior Criticals assumed
  permissive RLS without measuring.
