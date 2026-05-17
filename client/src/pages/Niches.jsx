import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Niches() {
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', keywords: '', platform: 'tiktok', language: 'Indonesia' });

  useEffect(() => { loadNiches(); }, []);

  async function loadNiches() {
    try { setNiches(await api.getNiches()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.createNiche(form);
      setShowModal(false);
      setForm({ name: '', description: '', keywords: '', platform: 'tiktok', language: 'Indonesia' });
      loadNiches();
    } catch (err) { alert(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this niche and all its content?')) return;
    try { await api.deleteNiche(id); loadNiches(); }
    catch (err) { alert(err.message); }
  }

  const platformColors = { tiktok: 'blue', instagram: 'purple', youtube: 'amber' };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Niches</h1>
          <p>Manage your content categories and target platforms</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Add Niche
        </button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><span>Loading niches...</span></div>
        ) : niches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
            <h3>No niches yet</h3>
            <p>Create your first niche to start generating content for a specific topic or category.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create First Niche</button>
          </div>
        ) : (
          <div className="content-grid">
            {niches.map((n, i) => (
              <div key={n.id} className="card animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="card-header" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-heading)' }}>{n.name}</div>
                    <span className={`badge badge-idea`} style={{ marginTop: 4 }}>{n.platform}</span>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(n.id)} style={{ color: 'var(--accent-red)', padding: '6px 10px' }}>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h14M8 6V4h4v2M16 6l-1 12H5L4 6"/></svg>
                  </button>
                </div>
                {n.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>{n.description}</p>
                )}
                {n.keywords && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {n.keywords.split(',').map((k, j) => (
                      <span key={j} style={{ fontSize: 11, padding: '3px 9px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {k.trim()}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                  Language: {n.language} · Created {new Date(n.created_at).toLocaleDateString('en')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Niche</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Niche Name *</label>
                  <input className="form-input" placeholder="e.g. Skincare Tips, Tech Reviews" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" placeholder="Brief description of this niche" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Keywords</label>
                  <input className="form-input" placeholder="keyword1, keyword2, keyword3" value={form.keywords} onChange={e => setForm({ ...form, keywords: e.target.value })} />
                </div>
                <div className="two-col">
                  <div className="form-group">
                    <label className="form-label">Platform</label>
                    <select className="form-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                      <option value="tiktok">TikTok</option>
                      <option value="instagram">Instagram Reels</option>
                      <option value="youtube">YouTube Shorts</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select className="form-select" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                      <option value="Indonesia">Bahasa Indonesia</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Niche</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
