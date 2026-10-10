# VAPT Report — vpsayoga.in (Live) + Megalan Website (Local Node Backend)
Target: https://vpsayoga.in/ | Date: 2026-10-11 (full retest, inline-JS build)
Method: BlackBox 1 + GreyBox guides | Mode: passive (no writes, no brute force)
Host: static GitHub Pages (Server: GitHub.com + HSTS only). No Node backend:
  api/health|enquiries|auth/login all 404. External js/admin|contact|gallery|main.js 404.

## Summary
Open on vpsayoga.in: 6 (High 2, Medium 2, Low 2).

| # | Title | Sev | Status |
|---|-------|-----|--------|
| O1 | Contact Supabase direct insert bypasses server validation | High | OPEN |
| O2 | Admin pages public + Supabase direct admin REST | High | OPEN |
| O3 | Translate element.js dynamic inject (supply chain) | Medium | OPEN (lazy, mitigated) |
| O4 | Consent forced-true residual (gate + timestamp added) | Medium | OPEN (partial fix) |
| O5 | Missing HTTP headers + Clickjacking | Low | OPEN (platform limits) |
| O6 | Business PII public by design + no robots/sitemap | Info | OPEN (accepted/document) |

## Live evidence (2026-10-11)
- Pages: / index about products gallery contact privacy → 200;
  admin-login, admin-login.html, admin-dashboard.html, admin-dashboard → 200;
  js/admin|contact|gallery|main.js → 404; robots.txt sitemap.xml → 404.
- Contact inline: bot_honey honeyEl gate + 6s rate gate + maxlengths
  (100/100/20/100/50/100/2000) present client-only; hasConsent gate + block present;
  payload branch still hardcodes dpdp_consent:true; cloud fallback
  cloudPath /rest/v1/inquiries + cloudKey sb_publishable_... (always runs, /api 404).
- Admin inline: SUPABASE_ADMIN_CONFIG anonKey sb_publishable_...;
  getSupabaseKey/Headers (anon fallback); rest/v1 gallery direct; sessionStorage-only
  tokens (no localStorage auth tokens this round; no DEMO_SECRET/demo-session in
  sampled lines — verify full bundle before closing the demo-bypass item).
- Translate: dynamic script.src element.js (zero-referrer); privacy §6 documented.
- Errors: clean GitHub 404/405, no stacks. No .env/.git leak.

## Fixes (flow intact)
- O1: harden cloud branch only (guards already present — keep); remove forced
  dpdp_consent:true → real state; Supabase CHECK constraints + RLS deny anon insert;
  rotate key. Verify anon insert → 401/403, valid UX unchanged.
- O2: remove admin HTML from static deploy (preferred) or delete Supabase fallback
  (Backend-unavailable after /api/* fails). RLS deny anon all on
  inquiries/audit_logs/users; gallery anon select-only. Rotate key.
  Verify admin paths → 404, anon REST → 401/403.
- O3: keep lazy opt-in only; off admin; prune CSP hosts if dropped.
- O4: checkbox unchecked default + required; send real state + consent_at/version.
- O5: CDN fronting for real headers or accept + framebust (admin removal = main control).
- O6: awareness; add robots/sitemap if wanted.
