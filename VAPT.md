# VAPT Report — vpsayoga.in (Live) + Megalan Website (Local Node Backend)
Target: https://vpsayoga.in/ | Date: 2026-10-10 (complete retest, inline-JS build)
Method: BlackBox 1 + GreyBox guides | Mode: passive (no writes, no brute force)
Host: static GitHub Pages (Server: GitHub.com + HSTS only). No Node backend:
  api/health|enquiries|gallery|products|auth/*|audit-logs all 404.
  External js/admin|contact|gallery|main.js all 404 (inline build; dead refs).

## Summary
Open on vpsayoga.in: 6 (High 2, Medium 2, Low 2). No .env/.git/robots/sitemap leak.
Backend local previously 22/22 (not serving live; not re-run).

| # | Title | Sev | Status |
|---|-------|-----|--------|
| O1 | Contact Supabase direct insert bypasses server validation | High | OPEN |
| O2 | Admin pages public + Supabase direct admin REST | High | OPEN |
| O3 | Translate element.js dynamic inject (supply chain) | Medium | OPEN (lazy, mitigated) |
| O4 | Consent forced-true residual (hasConsent gate added, timestamp added) | Medium | OPEN (partial fix) |
| O5 | Missing HTTP headers + Clickjacking | Low | OPEN (platform limits) |
| O6 | Business PII public by design + no robots/sitemap | Info | OPEN (accepted/document) |

## Live evidence
- Pages: / index.html about products gallery contact privacy 404.html → 200;
  admin-login, admin-login.html, admin-dashboard.html, admin-dashboard → 200;
  administrator wp-admin .env .git/HEAD → 404; robots.txt sitemap.xml → 404.
- Contact inline: bot_honey honeyEl gate + 6s rate gate present (client-only);
  maxlength 100/100/20/100/50/100/2000 present; consent read (hasConsent) with block,
  consent_at timestamp now sent; BUT dpdp_consent:true still forced in one payload branch;
  cloud fallback cloudHost sammfailpehmtxlbqmmh + cloudPath /rest/v1/inquiries +
  cloudKey sb_publishable_... (apikey/Bearer) runs always here (/api 404).
- Admin inline: SUPABASE_ADMIN_CONFIG anonKey sb_publishable_...; getSupabaseKey/Headers
  (anon fallback); rest/v1 gallery|inquiries|audit_logs read+write incl. PATCH/DELETE/POST;
  auth/v1 token fallback; dashboard guard sessionStorage-only (no localStorage tokens);
  exportInquiriesCSV present; no DEMO_SECRET/demo-session strings observed this round.
- Translate: window.googleTranslateElementInit + dynamic script.src element.js
  (zero-referrer, no crossorigin); no static <script> tag; privacy §6 documented.
- Errors: nonexistent path → GitHub 404 page (no stack); POST /api/enquiries → 405.

## O1 — Contact direct insert (High, CVSS 7.5)
- Impact: all RFQs insert via anon PostgREST; rate-limit/honeypot-server/DPDP-server/
  regex/sanitize never run on this host. Spam/oversize/junk + stored-XSS rests on
  render-escape + RLS only.
- Fix (flow intact): keep order, harden cloud branch only — enforce pre-send guards
  (already mostly present: honeypot, 6s, maxlengths, email/phone checks, hasConsent block);
  remove forced dpdp_consent:true → send real state; add Supabase CHECK constraints +
  RLS deny anon insert (or insert-with-checks policy); rotate key post-lockdown.
  Verify: live bundle keeps success UX; anon curl insert w/o consent → 4xx.

## O2 — Admin public + direct REST (High, CVSS 8.6)
- Impact: login/dashboard fetchable by anyone; CRUD (gallery PATCH/DELETE/POST,
  inquiries PATCH/DELETE, audit select) via anon key; backend requireAdmin bypassed.
  Security = RLS only. Lead PII/gallery/audit enumerable if RLS permissive.
- Fix (flow intact for real backend): remove admin HTML from static deploy (preferred —
  they 404'd before, regressed now), OR delete SUPABASE fallback branch and show
  Backend-unavailable after /api/* fails. RLS: deny anon all on inquiries/audit_logs/users;
  gallery anon select-only. Rotate key. Verify admin paths → 404 (or zero rest/v1).

## O3 — Translate inject (Medium, CVSS 4.3)
- Impact: dynamic Google script runs with page privilege; RFQ keylogging if compromised.
- Fix: keep lazy opt-in only (current qualifies); keep zero-referrer; exclude from admin;
  keep §6 disclosure; prune CSP translate hosts if feature dropped.

## O4 — Consent forced-true (Medium, CVSS 5.4)
- Impact: hasConsent gate + consent_at added (improvement), but a payload branch still
  hardcodes dpdp_consent:true → misrepresented consent record, DPDP gap.
- Fix: send real hasConsent everywhere; checkbox unchecked default + required (exists);
  keep consent_at + add text version; mirror wording in privacy. Verify unticked → blocked.

## O5 — Headers (Low, CVSS 3.7)
- Impact: Server+HSTS only; CSP/frame-ancestors only as <meta>; pages embeddable.
- Fix: CDN fronting for real X-Frame-Options/CSP/nosniff, else accept residual +
  keep frame-ancestors meta + framebust (admin removal is the main control).

## O6 — Info
- Phones +91 9003755701/7530045701 + info@vpsayoga.com + Tamil Nadu region + social
  handles public (expected for trade; fuels phishing — staff awareness only).
- No robots.txt/sitemap.xml (SEO/discovery minor). ?v=21.0 is cache-buster, not a leak.
- Closed: .env/.git exposure, backend stack leak (static 404/405, no traces),
  wa.me PII prefill, external stale bundles, localStorage auth tokens.
