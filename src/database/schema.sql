-- VPSA YOGA Database Schema
-- Designed for High Security, Relational Integrity & Performance

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'editor')),
    two_factor_secret TEXT,
    two_factor_enabled INTEGER DEFAULT 0,
    two_factor_temp_secret TEXT,
    two_factor_backup_codes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_ta TEXT NOT NULL,
    name_hi TEXT NOT NULL,
    name_ml TEXT NOT NULL,
    name_te TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    tagline TEXT NOT NULL,
    health_benefits TEXT NOT NULL,
    taste_profile TEXT NOT NULL,
    shelf_life TEXT NOT NULL,
    packing_specs TEXT NOT NULL,
    ideal_temperature TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_featured INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'farms' CHECK(category IN ('farms', 'harvest', 'logistics', 'products', 'packaging')),
    image_url TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    country_code TEXT DEFAULT '+91',
    mobile_number TEXT NOT NULL,
    company_name TEXT,
    product_variety TEXT,
    quantity TEXT,
    destination TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'in_review', 'completed')),
    ip_address TEXT,
    dpdp_consent INTEGER DEFAULT 1 NOT NULL,
    dpdp_consent_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    user_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    severity TEXT DEFAULT 'INFO' CHECK(severity IN ('INFO', 'WARN', 'CRITICAL')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
