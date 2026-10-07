# Secure Software Development Life Cycle (SSDLC) Framework
**Project:** VPSA YOGA FRISH PVT LTD Web Platform & Cold-Chain Logistics Portal  
**Managing Director & Security Lead:** Megalan A (B.E. in Cyber Security & Freight Forwarding)  
**Standard:** OWASP Top 10 • ISO/IEC 27034 • NIST SP 800-64  

---

## 1. Executive Summary & Philosophy
The VPSA YOGA FRISH web platform combines over two decades of agricultural wholesale trading expertise with enterprise-grade cybersecurity. Security is not an afterthought; it is integrated across every phase of the development life cycle (Shift-Left Security).

```
   ┌──────────────────────────────────────────────────────────────┐
   │                     SSDLC PHASES                             │
   ├──────────────┬──────────────┬──────────────┬─────────────────┤
   │ Requirements │ Architecture │ Secure Dev   │ Verification    │
   │ & Compliance │ & STRIDE     │ & Defenses   │ & Auditing      │
   └──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

## 2. SSDLC Phase Breakdown

### Phase 1: Security Requirements & Compliance Definition
- **Data Classification:**
  - *Public Data:* Banana catalog specs, pricing models, company overview, farm gallery.
  - *Confidential Data:* Customer quote inquiries, contact numbers, email addresses, order volumes.
  - *Restricted Data:* Admin credentials, JWT signing secrets, security audit logs.
- **Regulatory & Security Standards:**
  - Compliance with OWASP Top 10 Application Security standards.
  - GDPR/DPDP compliant input minimization and secure data retention.
  - Subresource integrity & zero vulnerable dependencies (`npm audit` 0 findings).

### Phase 2: Secure Architecture & Threat Modeling (STRIDE)
- **Trust Boundaries:**
  - Public Internet $\leftrightarrow$ Reverse Proxy / Application Server
  - Application Layer $\leftrightarrow$ SQLite Parameterized Database Layer
  - User Input $\leftrightarrow$ Sanitization & Validation Engines
  - Admin Role $\leftrightarrow$ HttpOnly SameSite Session Layer
- **Defense-in-Depth:**
  - Multi-tier defense including Helmet CSP headers, brute-force rate limiters, anti-bot honeypots, and magic byte file signature inspection.

### Phase 3: Secure Implementation & Coding Standards
- **Zero Raw SQL String Concatenation:** Strict use of prepared statements via `better-sqlite3`.
- **Sanitized Request Processing:** Global middleware stripping malicious tags and polyglot XSS attacks.
- **Cryptographic Standards:** Bcrypt with 12 salt rounds, HMAC-SHA256 signed JSON Web Tokens.
- **Safe File Upload Pipeline:** Size verification (5MB), extension whitelisting, randomized UUID filename hashing, and binary magic bytes validation.

### Phase 4: Verification, Automated Testing & Code Audit
- **Unit & Integration Security Test Suite:** Automated testing suite (`tests/security.test.js` & `tests/api.test.js`) executed via Node's native test runner.
- **Vulnerability Scanning:** Continuous dependency vulnerability checking.
- **Negative Testing:** Injection attempts, XSS payloads, honeypot triggering, and unauthenticated route traversal tests.

### Phase 5: Secure Deployment & Continuous Monitoring
- **Immutable Security Logging:** All authentication events, file uploads, inquiry submissions, and authorization failures are written to `audit_logs` in SQLite.
- **Generic Error Handling:** Production error handlers mask internal error stack traces and database schema details from end users.
