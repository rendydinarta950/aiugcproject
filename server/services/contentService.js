const { getDb } = require('../database/init');

class ContentService {
  getAllNiches() {
    const db = getDb();
    return db.prepare('SELECT * FROM niches ORDER BY created_at DESC').all();
  }

  getNicheById(id) {
    const db = getDb();
    return db.prepare('SELECT * FROM niches WHERE id = ?').get(id);
  }

  createNiche(data) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO niches (name, description, keywords, platform, language) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(data.name, data.description || '', data.keywords || '', data.platform || 'tiktok', data.language || 'id');
    return this.getNicheById(result.lastInsertRowid);
  }

  deleteNiche(id) {
    const db = getDb();
    db.prepare('DELETE FROM niches WHERE id = ?').run(id);
  }

  getAllContent(filters = {}) {
    const db = getDb();
    let query = 'SELECT ci.*, n.name as niche_name, n.platform FROM content_ideas ci LEFT JOIN niches n ON ci.niche_id = n.id';
    const conditions = [];
    const params = [];
    if (filters.niche_id) { conditions.push('ci.niche_id = ?'); params.push(filters.niche_id); }
    if (filters.status) { conditions.push('ci.status = ?'); params.push(filters.status); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY ci.created_at DESC';
    if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit); }
    return db.prepare(query).all(...params);
  }

  getContentById(id) {
    const db = getDb();
    return db.prepare('SELECT ci.*, n.name as niche_name, n.platform FROM content_ideas ci LEFT JOIN niches n ON ci.niche_id = n.id WHERE ci.id = ?').get(id);
  }

  createContent(data) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO content_ideas (niche_id, title, hook, script, viral_score, status, duration_target, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(data.niche_id, data.title, data.hook || '', data.script || '', data.viral_score || 0, data.status || 'idea', data.duration_target || 30, data.scheduled_at || null);
    return this.getContentById(result.lastInsertRowid);
  }

  createMultipleContent(items) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO content_ideas (niche_id, title, hook, script, viral_score, status, duration_target) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertMany = db.transaction((items) => {
      const results = [];
      for (const item of items) {
        const r = stmt.run(item.niche_id, item.title, item.hook || '', item.script || '', item.viral_score || 0, 'idea', item.duration_target || 30);
        results.push(r.lastInsertRowid);
      }
      return results;
    });
    return insertMany(items);
  }

  updateContent(id, data) {
    const db = getDb();
    const fields = [];
    const values = [];
    for (const key of ['title','hook','script','viral_score','status','duration_target','scheduled_at']) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return this.getContentById(id);
    values.push(id);
    db.prepare(`UPDATE content_ideas SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getContentById(id);
  }

  deleteContent(id) {
    const db = getDb();
    db.prepare('DELETE FROM content_ideas WHERE id = ?').run(id);
  }

  getAllVideos(filters = {}) {
    const db = getDb();
    let query = 'SELECT v.*, ci.title as content_title, n.name as niche_name FROM videos v LEFT JOIN content_ideas ci ON v.content_id = ci.id LEFT JOIN niches n ON ci.niche_id = n.id';
    if (filters.status) query += ' WHERE v.status = ?';
    query += ' ORDER BY v.created_at DESC';
    return filters.status ? db.prepare(query).all(filters.status) : db.prepare(query).all();
  }

  createVideo(data) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO videos (content_id, filename, duration_seconds, resolution, status, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(data.content_id, data.filename || '', data.duration_seconds || 0, data.resolution || '1080x1920', data.status || 'pending', data.file_path || '', data.file_size || 0);
    return db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
  }

  getSchedules() {
    const db = getDb();
    return db.prepare('SELECT s.*, n.name as niche_name FROM schedules s LEFT JOIN niches n ON s.niche_id = n.id ORDER BY s.created_at DESC').all();
  }

  createSchedule(data) {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO schedules (niche_id, videos_per_day, time_slots, is_active) VALUES (?, ?, ?, ?)');
    const result = stmt.run(data.niche_id, data.videos_per_day || 3, JSON.stringify(data.time_slots || ['08:00','12:00','18:00']), data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1);
    return db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid);
  }

  toggleSchedule(id, is_active) {
    const db = getDb();
    db.prepare('UPDATE schedules SET is_active = ? WHERE id = ?').run(is_active ? 1 : 0, id);
  }

  getDashboardStats() {
    const db = getDb();
    const totalNiches = db.prepare('SELECT COUNT(*) as count FROM niches').get().count;
    const totalContent = db.prepare('SELECT COUNT(*) as count FROM content_ideas').get().count;
    const totalVideos = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
    const contentByStatus = db.prepare('SELECT status, COUNT(*) as count FROM content_ideas GROUP BY status').all();
    const videosByStatus = db.prepare('SELECT status, COUNT(*) as count FROM videos GROUP BY status').all();
    const todayContent = db.prepare("SELECT COUNT(*) as count FROM content_ideas WHERE DATE(created_at) = DATE('now')").get().count;
    const thisMonthContent = db.prepare("SELECT COUNT(*) as count FROM content_ideas WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get().count;
    const todayVideos = db.prepare("SELECT COUNT(*) as count FROM videos WHERE DATE(created_at) = DATE('now')").get().count;
    const thisMonthVideos = db.prepare("SELECT COUNT(*) as count FROM videos WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get().count;
    const recentContent = db.prepare('SELECT ci.*, n.name as niche_name FROM content_ideas ci LEFT JOIN niches n ON ci.niche_id = n.id ORDER BY ci.created_at DESC LIMIT 5').all();
    const avgViralScore = db.prepare('SELECT ROUND(AVG(viral_score), 1) as avg_score FROM content_ideas WHERE viral_score > 0').get().avg_score || 0;
    return { totalNiches, totalContent, totalVideos, contentByStatus, videosByStatus, todayContent, thisMonthContent, todayVideos, thisMonthVideos, recentContent, avgViralScore, dailyTarget: 3, monthlyTarget: 90 };
  }
}

module.exports = new ContentService();
