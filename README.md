# VPSA YOGA FRISH PVT LTD — Web Platform

> **Official Website & Cold-Chain Logistics Management Portal** for **VPSA YOGA FRISH PVT LTD** (also known as *VPSA YOGA Banana Traders / VPSA YOGA Trades*).
> Sourcing from **Theni, Oddanchatram, and Kerala** with end-to-end temperature-controlled logistics (**13–14°C**).

---

## 🌟 Features Overview

### 1. Multi-Language Engine (Instant Switching)
- **6 Supported Languages:**
  - 🇬🇧 **English (en)**
  - 🇮🇳 **தமிழ் (Tamil - ta)**
  - 🇮🇳 **हिंदी (Hindi - hi)**
  - 🇮🇳 **മലയാളം (Malayalam - ml)**
  - 🇮🇳 **తెలుగు (Telugu - te)**
  - 🇦🇪 **العربية (Arabic - ar)** *(with automatic RTL layout support)*
- Instant client-side DOM translation switcher without page reload.

### 2. Multi-Page Architecture
- **Home Page (`/`):**
  - Hero banner with banana farming background.
  - Slogan: *"FRESH BANANA, DELIVERED RELIABLE AND ON TIME"*.
  - Quick *"Connect With Us"* quotation form.
  - Core Pillars of Excellence (*20+ Years Family Expertise, Farm-Fresh Guarantee, 13-14°C Cold Chain, Wholesale Transparency, Export-Ready Quality & Grading*).
- **Banana Varieties Catalog (`/products`):**
  - 8 banana varieties with descriptions, health benefits, taste profiles, shelf life, and packaging specs:
    1. **Red Banana (செவ்வாழை)**
    2. **Poovan Banana (பூவன்)**
    3. **Nendran Banana (நேந்திரன்)**
    4. **Yelakki Banana (ஏலக்கி)**
    5. **Karpuravalli Banana (கற்பூரவள்ளி)**
    6. **Rasthali Banana (ரஸ்தாளி)**
    7. **Robusta Cavendish (ரோபஸ்டா)**
    8. **Monthan Banana (மொந்தன்)**
  - Category filter (*All, Dessert, Superfruit, Culinary*).
  - One-click *"Request Wholesale Quote"* modal with pre-selected variety.
- **Live Gallery (`/gallery`):**
  - Live photo gallery of plantations, harvest grading, cold chain fleet, and export packaging.
  - Fullscreen Lightbox viewer with zoom & captions.
- **About Us (`/about`):**
  - Company heritage, 20+ years family trading experience, and cold chain telemetry.
- **Contact & RFQ (`/contact`):**
  - Request For Quotation (RFQ) form.
  - Official Social Media Links.
- **Admin Management Portal (`/admin/login` & `/admin/dashboard`):**
  - Two-Factor Authentication (2FA) via Microsoft Authenticator.
  - **Gallery Manager:** Upload, edit metadata, and delete photos.
  - **Inquiries Inbox:** Review quote requests, update lead status (*New, Contacted, In Review, Completed*), and export leads to CSV.
  - **Activity Log:** Real-time log of administrative logins and updates.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your environment configuration
```

### 3. Database Initialization & Seeding
```bash
npm run seed
```

### 4. Running Automated Tests
```bash
npm test
```

### 5. Start Application Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 📡 Key API Endpoints

- `GET /api/products` — Retrieve all banana varieties
- `GET /api/products/:slug` — Retrieve details for a specific variety
- `GET /api/gallery` — Retrieve live gallery items
- `POST /api/gallery` — Upload new photo *(Admin authentication required)*
- `PUT /api/gallery/:id` — Edit photo metadata *(Admin authentication required)*
- `DELETE /api/gallery/:id` — Delete photo *(Admin authentication required)*
- `POST /api/enquiries` — Submit wholesale quotation inquiry
- `GET /api/enquiries` — View inquiry inbox *(Admin authentication required)*
- `PATCH /api/enquiries/:id/status` — Update inquiry status *(Admin authentication required)*
- `GET /api/audit-logs` — Activity logs *(Admin authentication required)*
- `GET /api/health` — Application health check

