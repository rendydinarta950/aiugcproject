const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'nyar.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS niches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      keywords TEXT,
      platform TEXT DEFAULT 'tiktok',
      language TEXT DEFAULT 'id',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS content_ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      niche_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      hook TEXT,
      script TEXT,
      viral_score INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idea',
      duration_target INTEGER DEFAULT 30,
      scheduled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (niche_id) REFERENCES niches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      filename TEXT,
      duration_seconds INTEGER,
      resolution TEXT DEFAULT '1080x1920',
      status TEXT DEFAULT 'pending',
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (content_id) REFERENCES content_ideas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      niche_id INTEGER NOT NULL,
      videos_per_day INTEGER DEFAULT 3,
      time_slots TEXT DEFAULT '["08:00","12:00","18:00"]',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (niche_id) REFERENCES niches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if not exist
  const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
  insertSetting.run('daily_target', '3');
  insertSetting.run('monthly_target', '90');
  insertSetting.run('default_duration', '30');
  insertSetting.run('default_language', 'id');
}

module.exports = { getDb };
