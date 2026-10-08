# Grey-Box Security Testing Instruction
## Purpose & Scope

**Grey-box testing** (a.k.a. hybrid or partial-knowledge testing) sits between black-box
(no knowledge) and white-box (full source/architecture knowledge). The tester has **partial**
knowledge of the target — typically valid credentials, user-level accounts, API documentation,
or limited access to internals — but must still discover vulnerabilities through active testing.

Grey-box models the real-world situation of an **authenticated attacker** or an external tester
who has obtained some insider information. It is the most realistic representation of a genuine
threat, and is the standard approach for application security assessments and API security tests.

> **Authorization is mandatory.** Only test systems you own or have explicit written permission
> to test.

---

## 1. Rules of Engagement (ROE)

- Obtain written authorization with clearly scoped credentials, roles, and test windows.
- Document exactly **which accounts/roles** the tester is permitted to use.
- Confirm whether password cracking, privilege escalation, and data access are in scope.
- Establish an emergency contact and legal guardian.
- Agree data-handling, evidence-retention, and disclosure terms.
- Stop immediately on discovering out-of-scope assets or unexpected production data.
- Never use recovered stolen credentials against third-party accounts.

---

## 2. What "Grey-Box" Means in Practice

The tester commonly receives one or more of the following:

- **Authenticated access** — one or more user accounts (low, high, admin privileges)
- **API documentation / OpenAPI (Swagger) specs**
- **Session or token samples**
- **Sample datasets / fixtures**
- **Partial source maps, deployment diagrams, or config examples**
- **Knowledge of the tech stack or third-party components**

Grey-box drastically widens the attack surface compared to black-box: you can now exercise
authorized functionality, test privilege boundaries, and chase business-logic flaws that are
invisible from the outside.

---

## 3. Methodology (Phases)

### Phase A — Understand the Surface You Can See
- Enumerate the full feature set available to your authenticated role(s).
- Map each endpoint to the permissions/roles that can call it.
- Read the API spec; note undocumented params, mass-assignment fields, and weak auth.

### Phase B — Horizontal Privilege Testing
- **IDOR / object-level authorization**: swap object IDs and test if you can read/modify
  resources you should not own (other users' profiles, orders, documents).
- **Mass assignment**: submit extra fields to create/update records with elevated properties.

### Phase C — Vertical Privilege Testing
- Try to reach **admin-only functions** using a low-privilege session (broken function-level auth).
- Test role escalation, forced browsing of admin routes, and hidden admin API calls.
- Attempt session/token privilege escalation via tampering (JWT alg confusion, role claims).

### Phase D — Functional & Business Logic Flaws
- Workflow bypass (skip payment, approval, or verification steps).
- Price/quantity tampering, negative values, race conditions.
- Replay, double-spend, and token/coupon validation bugs.
- State-machine errors and inconsistent validation between UI and API.

### Phase E — Common Vulnerability Classes (Authn-heavy)
- Weak credential policies, default creds, credential stuffing resiliency.
- Session fixation, weak session IDs, improper logout, session not invalidated.
- Verbose error messages leaking internals.
- Race conditions and TOCTOU.

### Phase F — Exploitation & Demonstration
- Prove impact with minimal, non-destructive PoCs (e.g., showing you can read another user's
  record without exfiltrating bulk data).
- Escalate only within granted authority.

### Phase G — Reporting
- Reproduce each finding, rank by severity and exploiting realistic risk (not theoretical).
- Since credentials were granted, clearly separate *"flaws possible despite valid auth"* from
  *"caused by credential misuse."*

---

## 4. Grey-Box-Specific Test Focus Areas

| Focus                        | Typical Checks                                                    |
|------------------------------|-------------------------------------------------------------------|
| Authorization                | IDOR, broken object/function-level access, mass assignment        |
| Authentication               | token/session tampering, JWT alg confusion, role claims, expiry   |
| Business logic               | workflow bypass, price tampering, races, state-machine flaws      |
| Input validation (auth'd)    | injection on authorized inputs, file uploads, XXE, SSRF           |
| Sensitive data               | over-exposure via API responses, verbose errors, debug endpoints  |
| Audit / logging              | missing audit trails, sensitive data in logs                      |

---

## 5. Recommended Tooling

- **Interception**: Burp Suite, OWASP ZAP, mitmproxy
- **API testing**: Postman, `curl`, Bruno, OpenAPI/Swagger import
- **Auth JWT**: `jwt_tool`, `jwt.io`, tampering scripts
- **Fuzzing**: `ffuf`, `wfuzz`, `sqlmap` (auth'd via session/cookies)
- **Privilege enumeration**: manual role-matrix mapping, forced browsing
- **Race conditions**: `rrc` (race-the-web), custom parallel request scripts

---

## 6. Reporting Template

```
Title:       <short descriptive name>
Severity:    <Critical / High / Medium / Low>
CVSS:        <score>
Access Used: <role/credentials level that exposed the bug>
Affected:    <URL / endpoint / asset>
Description: <what the bug is and how it was found>
Impact:      <what an attacker could realistically do with it>
Reproduction:
  1. <step>
  2. <step>
Remediation: <how to fix>
```

---

## 7. Ethics, Legal & Disclosure

- Grey-box gives you real data access — handle all data with the highest confidentiality.
- **Do not** recover, crack, or reuse credentials outside the granted scope.
- Respect rate limits; avoid denial-of-service and data destruction.
- Report findings privately to the owner before any public disclosure.
- Follow the vendor/bug-bounty disclosure policy.
- Grey-box testing without authorization still violates the **CFAA** (US), **Computer Misuse
  Act** (UK), and equivalent laws.
- Always test under a signed agreement or in-scope bug bounty program.

---

## 8. Grey-Box vs Black-Box Quick Comparison

| Aspect            | Black-Box                     | Grey-Box                          |
|-------------------|-------------------------------|-----------------------------------|
| Initial knowledge | None                          | Partial (creds, docs, access)     |
| Auth test depth   | External only                 | Internal roles & privileges       |
| Best for finding  | Perimeter, exposure, recon    | AuthZ/AuthN, business logic, APIs |
| Realism           | External attacker             | Authenticated insider/leaked creds|
| Testing cost/time | Longer, more recon            | Faster, deeper on app logic       |

> This document is for **educational and authorized testing purposes only**.
