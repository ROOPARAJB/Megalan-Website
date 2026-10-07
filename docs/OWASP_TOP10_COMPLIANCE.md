# OWASP Top 10 Compliance & Mitigation Matrix
**Application:** VPSA YOGA FRISH PVT LTD  
**Auditor / Security Architect:** Megalan A (B.E. in Cyber Security)  
**Status:** FULLY COMPLIANT  

---

| OWASP Vulnerability | Risk Scenario | Implementation & Defense Mechanism in Codebase |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Unauthorized user accessing admin gallery or quotes | • JWT verification via `requireAuthApi` and `requireAuthPage` middleware.<br>• HttpOnly, SameSite=Strict cookies.<br>• Secure redirect loops for unauthenticated dashboard requests.<br>• Scoped object ID lookups with parameterized queries. |
| **A02: Cryptographic Failures** | Credential theft, plaintext transport | • Passwords hashed with `bcryptjs` using 12 salt rounds.<br>• HSTS (`Strict-Transport-Security`) enforced with `maxAge: 31536000`.<br>• JWT signed with high-entropy cryptographic secrets.<br>• Timing-safe credential comparisons. |
| **A03: Injection (SQLi & XSS)** | Malicious SQL inputs or stored XSS scripts | • Parameterized SQL prepared statements exclusively used (`better-sqlite3`).<br>• Zero dynamic SQL string concatenation.<br>• Global HTML sanitization middleware via `sanitize-html` and `validator`.<br>• Contextual output encoding on frontend templates. |
| **A04: Insecure Design** | Bot spam, image upload polyglots | • Anti-bot honeypot field (`bot_honey`) silently dropping automated scrapers.<br>• File upload pipeline enforces 5MB limit, extension whitelist, and **Magic Byte header signature verification**.<br>• Strict payload size bounds (1MB JSON limit). |
| **A05: Security Misconfiguration** | Clickjacking, MIME sniffing, error leaks | • `helmet` configured with strict Content Security Policy (CSP).<br>• `X-Frame-Options: DENY` preventing clickjacking.<br>• `X-Content-Type-Options: nosniff` preventing MIME confusion.<br>• Centralized error handler masking internal stack traces in production. |
| **A06: Vulnerable & Outdated Components** | Known CVEs in dependencies | • Zero vulnerabilities verified via `npm audit`.<br>• Minimal, lean dependency tree without bloated packages.<br>• Built-in Node 24 native test runner used. |
| **A07: Identification & Auth Failures** | Brute force password guessing, credential stuffing | • IP-based auth rate limiting via `authRateLimiter` (10 requests / 15 min window).<br>• Strong password requirements.<br>• Complete session invalidation upon logout.<br>• Logging of failed authentication attempts in audit trail. |
| **A08: Software & Data Integrity Failures** | Deserialization attacks, corrupted uploads | • Strict JSON schema validation on incoming request bodies.<br>• Binary header verification on uploaded images prior to database persistence.<br>• Cryptographic randomized filenames preventing file collisions or tampering. |
| **A09: Security Logging & Monitoring Failures** | Undetected intrusion attempts | • Dedicated `audit_logs` database table storing IP address, user agent, event type, severity, and timestamps.<br>• Administrative real-time security event viewer embedded in Admin Dashboard. |
| **A10: Server-Side Request Forgery (SSRF)** | Malicious internal network probing | • Zero server-side unvalidated URL fetching.<br>• Outbound social media links and external URLs are client-side only with `rel="noopener noreferrer"`. |

---

## Verification Test Results
The automated security test suite located at `tests/security.test.js` exercises these controls on every build:
- `[OWASP A05]` HTTP Security Headers Verification
- `[OWASP A01]` Broken Access Control Guard
- `[OWASP A03]` Input XSS & Payload Sanitization
- `[OWASP A04]` Honeypot & File Integrity Enforcement
- `[OWASP A07]` Brute-Force Rate Limiting & Auth Validation
