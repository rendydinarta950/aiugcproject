import { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';

const STATUS_TABS = ['all', 'idea', 'scripted', 'done'];
const PAGE_SIZE = 20;

export default function Content() {
  const [content, setContent]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [scriptModal, setScriptModal] = useState(null);
  const [generating, setGenerating] = useState(null);
  const [composing, setComposing]   = useState(null);

  // Reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [filter, search]);
  useEffect(() => { loadContent(); }, [filter]);

  async function loadContent() {
    try {
      setLoading(true);
      const filters = {};
      if (filter !== 'all') filters.status = filter;
      setContent(await api.getContent(filters));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleGenerateScript(id) {
    setGenerating(id);
    try {
      const result = await api.generateScript(id);
      setScriptModal(result.script);
      loadContent();
    } catch (err) { alert('Script generation failed: ' + err.message); }
    finally { setGenerating(null); }
  }

  async function handleComposeVideo(id) {
    setComposing(id);
    try { await api.composeVideo(id); loadContent(); }
    catch (err) { alert('Video composition failed: ' + err.message); }
    finally { setComposing(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this content item?')) return;
    try { await api.deleteContent(id); loadContent(); }
    catch (err) { alert(err.message); }
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return content;
    return content.filter(c =>
      c.title?.toLowerCase().includes(q) ||
      c.hook?.toLowerCase().includes(q) ||
      c.niche_name?.toLowerCase().includes(q)
    );
  }, [content, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Content Library</h1>
          <p>Manage ideas, scripts, and production pipeline</p>
        </div>
        {/* Status tab filter */}
        <div className="pill-tabs">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              className={`pill-tab${filter === s ? ' active' : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {/* Search bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative', maxWidth: 420 }}>
            <svg
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            >
              <circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="17.5" y2="17.5"/>
            </svg>
            <input
              className="form-input"
              style={{ paddingLeft: 38, paddingRight: search ? 38 : 14 }}
              placeholder="Search by title, hook, or niche..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            )}
          </div>
          {/* Result count */}
          {!loading && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              {search
                ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${search}"`
                : `${filtered.length} item${filtered.length !== 1 ? 's' : ''} total`
              }
              {filtered.length > 0 && ` · Page ${page} of ${totalPages}`}
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner"></div><span>Loading content...</span></div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                {search
                  ? <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>
                  : <path d="M12 5v14M5 12h14"/>
                }
              </svg>
            </div>
            <h3>{search ? 'No results found' : 'No content found'}</h3>
            <p>{search ? `Try a different search term.` : 'Research viral content ideas first, then they will appear here.'}</p>
            {search && <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={() => setSearch('')}>Clear search</button>}
          </div>
        ) : (
          <div className="content-grid">
            {paginated.map((c, i) => (
              <div key={c.id} className="card animate-in" style={{ animationDelay: `${i * 0.02}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className={`badge badge-${c.status}`}>{c.status}</span>
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px 4px' }}>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h14M8 6V4h4v2M16 6l-1 12H5L4 6"/></svg>
                  </button>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 8, lineHeight: 1.45 }}>{c.title}</h3>

                {c.hook && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 14, lineHeight: 1.5 }}>"{c.hook}"</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 600, color: c.viral_score >= 80 ? 'var(--accent-green)' : c.viral_score >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                      {c.viral_score}
                    </span>
                    <span style={{ margin: '0 6px' }}>·</span>
                    <span>{c.duration_target}s</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.status === 'idea' && (
                      <button className="btn btn-primary btn-sm" onClick={() => handleGenerateScript(c.id)} disabled={generating === c.id}>
                        {generating === c.id ? <div className="spinner"></div> : 'Generate Script'}
                      </button>
                    )}
                    {c.status === 'scripted' && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          try { setScriptModal(JSON.parse(c.script)); } catch { setScriptModal({ script_full: c.script }); }
                        }}>View Script</button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleComposeVideo(c.id)} disabled={composing === c.id}>
                          {composing === c.id ? <div className="spinner"></div> : 'Make Video'}
                        </button>
                      </>
                    )}
                    {c.status === 'done' && (
                      <span style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>Completed</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="13,5 7,10 13,15"/></svg>
              Prev
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: 13 }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 34, height: 34, borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'var(--ease)',
                    background: page === p ? 'var(--brand)' : 'var(--bg-white)',
                    color: page === p ? 'white' : 'var(--text-secondary)',
                    boxShadow: page === p ? 'var(--shadow-brand)' : 'var(--shadow-xs)',
                    border: page === p ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {p}
                </button>
              ))
            }

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="7,5 13,10 7,15"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Script Modal */}
      {scriptModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setScriptModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>Script Preview</h2>
              <button className="btn btn-ghost" onClick={() => setScriptModal(null)}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            </div>
            <div className="modal-body">
              {scriptModal.sections ? scriptModal.sections.map((sec, i) => (
                <div key={i} className="script-section">
                  <div className="script-section-label">{sec.label}</div>
                  <div className="script-section-time">{sec.time}</div>
                  <div className="script-section-text">{sec.text}</div>
                  {sec.visual_note && <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 8 }}>Visual: {sec.visual_note}</div>}
                </div>
              )) : (
                <div className="script-section">
                  <div className="script-section-text" style={{ whiteSpace: 'pre-wrap' }}>{scriptModal.script_full}</div>
                </div>
              )}
              {scriptModal.hashtags?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>Hashtags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {scriptModal.hashtags.map((tag, i) => <span key={i} className="badge badge-scripted">{tag}</span>)}
                  </div>
                </div>
              )}
              {scriptModal.caption && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: 4 }}>Caption</div>
                  <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>{scriptModal.caption}</div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(scriptModal.script_full || '')}>Copy Script</button>
              <button className="btn btn-primary" onClick={() => setScriptModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
