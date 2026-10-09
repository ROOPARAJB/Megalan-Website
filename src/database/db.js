import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const isTest = process.env.NODE_ENV === 'test' || process.argv.some(a => typeof a === 'string' && (a.includes('test') || a.includes('--test')));
const dbFilename = isTest ? `vpsa_database.test_${process.pid}.sqlite` : 'vpsa_database.sqlite';
const dbPath = path.join(dataDir, dbFilename);
const db = new Database(dbPath, {
  verbose: null
});

// Enable WAL mode & foreign keys for enterprise performance & integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// Migration: Add 2FA columns if they do not exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = new Set(tableInfo.map(c => c.name));

  if (!columnNames.has('two_factor_secret')) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_secret TEXT");
  }
  if (!columnNames.has('two_factor_enabled')) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0");
  }
  if (!columnNames.has('two_factor_temp_secret')) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_temp_secret TEXT");
  }
  if (!columnNames.has('two_factor_backup_codes')) {
    db.exec("ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT");
  }

  // Migration: Add DPDP consent persistence columns if they do not exist
  const inqInfo = db.prepare("PRAGMA table_info(inquiries)").all();
  const inqCols = new Set(inqInfo.map(c => c.name));
  if (!inqCols.has('dpdp_consent')) {
    db.exec("ALTER TABLE inquiries ADD COLUMN dpdp_consent INTEGER DEFAULT 1");
  }
  if (!inqCols.has('dpdp_consent_timestamp')) {
    db.exec("ALTER TABLE inquiries ADD COLUMN dpdp_consent_timestamp DATETIME");
  }
} catch (e) {
  console.error('[DB MIGRATION ERROR]', e);
}

export default db;
