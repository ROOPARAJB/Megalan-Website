# Black-Box Security Testing Guide

## Purpose & Scope

This document describes **black-box security testing** (a.k.a. external or zero-knowledge
testing). In a black-box test, the tester has **no prior knowledge** of the target's internal
architecture, source code, or credentials. All information is discovered externally through
observation and interaction with the target's exposed interfaces.

Black-box testing is a **legitimate, authorized security assessment methodology** used to
identify vulnerabilities before attackers do.

> **Authorization is mandatory.** Only test systems you own or have explicit written
> permission to test. Unauthorized testing is illegal in most jurisdictions.

---

## 1. Rules of Engagement (ROE)

Before performing any testing:

- Obtain written authorization (scope, target IPs/domains, permitted techniques, and dates).
- Define boundaries: what is in scope / out of scope.
- Confirm emergency contacts and legal guardian details.
- Agree on data handling and evidence retention.
- Stop immediately if unexpected systems/servers are discovered.
- Keep CVEs/disclosures private until the vendor releases a fix.

---

## 2. Testing Methodology (Phases)

Black-box testing follows a standard lifecycle:

### Phase A — Reconnaissance (Passive)
Gather information **without touching the target**.
- WHOIS / DNS records
- Search engines, public code repos, leaked config files
- Social engineering research on public profiles
- Certificate transparency logs
- Metasearch of leaked data (HIBP-style)
- Gather: domains, subdomains, technologies, mail servers, DNS records

### Phase B — Active Reconnaissance
Interact with the target to map its exposed surface.
- Ping sweeps, port scans (nmap, masscan)
- Service enumeration (banner grabbing, version detection, `nmap -sV`)
- HTTP fingerprinting and directory brute forcing
- Subdomain enumeration (`amass`, `subfinder`)
- Detect WAF/firewall and technology stack (headers, cookies, favicon, error pages)

### Phase C — Vulnerability Discovery / Analysis
- Targeted fuzzing of parameters, inputs, file uploads
- Automated vulnerability scanners (e.g., OWASP ZAP, Nikto, Nessus)
- Manual review of endpoints, API documentation, and responses
- Look for the OWASP Top 10 and CWE families

### Phase D — Exploitation (demonstration only)
- Prove impact with proof-of-concept without causing damage or data loss.
- Escalate privileges only if granted authority.
- Capture minimal evidence to confirm the finding.

### Phase E — Reporting
- Reproduce and document each finding.
- Rank by severity (CVSS) and business impact.
- Provide remediation recommendations.

---

## 3. Standard Tooling

| Phase            | Tools                                                        |
|------------------|--------------------------------------------------------------|
| Passive recon    | `whois`, `dnsrecon`, `theHarvester`, `certspotter`, `subfinder` |
| Active recon     | `nmap`, `masscan`, `amass`, `httpx`, `feroxbuster`, `gobuster` |
| Web app testing  | Burp Suite, OWASP ZAP, `sqlmap`, `nikto`, `ffuf`              |
| Exploitation     | Metasploit, `searchsploit`, custom POCs                       |
| Networking       | Wireshark, `tcpdump`, `tcpflow`, `hping3`                     |

---

## 4. Common Attack Vectors to Check

- **Injection**: SQLi, XSS, Command Injection, LDAP, XXE
- **Authentication/Authorization**: broken access control, IDOR, default creds, weak session handling
- **Sensitive data exposure**: hardcoded secrets, verbose errors, misconfigured buckets
- **Misconfigurations**: default pages, exposed admin panels, open ports, unnecessary services
- **Business logic flaws**: race conditions, price tampering, privilege escalation
- **API security**: excessive data exposure, broken object-level auth, mass assignment
- **Cryptographic failures**: weak TLS, weak hashing, insecure randomness

---

## 5. Reporting Template

For each finding:

```
Title:       <short descriptive name>
Severity:    <Critical / High / Medium / Low>
CVSS:        <score>
Affected:    <URL / endpoint / asset>
Description: <what the bug is and how it was found>
Impact:      <what an attacker could do>
Reproduction:
  1. <step>
  2. <step>
Remediation: <how to fix>
```

---

## 6. Responsible Disclosure & Ethics

- Report privately to the owner before public disclosure.
- Never exfiltrate, modify, or destroy data beyond what is needed for a POC.
- Do not retain copies of sensitive data.
- Respect rate limits to avoid denial of service.
- Follow the vendor's disclosure policy (e.g., bug bounty program rules).

---

## 7. Legal & Compliance Notes

- Black-box testing without authorization can violate the **CFAA** (US), **Computer Misuse
  Act** (UK), and similar laws worldwide.
- Always work under a signed penetration testing agreement or bug bounty scope.
- Verify the tester's insurance/credentials when hiring an external firm.
- Keep evidence logs (timestamps, tool outputs) to prove authorized activity.

> This document is for **educational and authorized testing purposes only**.