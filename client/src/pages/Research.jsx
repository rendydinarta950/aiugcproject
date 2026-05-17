import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Research() {
  const [niches, setNiches] = useState([]);
  const [selectedNiche, setSelectedNiche] = useState('');
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingNiches, setLoadingNiches] = useState(true);

  useEffect(() => {
    api.getNiches()
      .then(data => { setNiches(data); if (data.length) setSelectedNiche(data[0].id); })
      .catch(console.error)
      .finally(() => setLoadingNiches(false));
  }, []);

  async function handleResearch() {
    if (!selectedNiche) return;
    setLoading(true);
    setIdeas([]);
    try {
      const result = await api.researchContent(selectedNiche, 10);
      setIdeas(result.ideas || []);
    } catch (err) { alert('Research failed: ' + err.message); }
    finally { setLoading(false); }
  }

  const niche = niches.find(n => String(n.id) === String(selectedNiche));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Content Research</h1>
          <p>AI-powered viral content discovery for your niches</p>
        </div>
      </div>

      <div className="page-body">
        {/* Research Panel */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">AI Research Engine</span>
            {niche && <span className="badge badge-idea">{niche.platform}</span>}
          </div>

          {/* Source transparency */}
          <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4 }}>Bagaimana ide dihasilkan</div>
            AI menganalisis pola konten yang cenderung viral di <strong>{niche?.platform || 'platform target'}</strong> berdasarkan niche dan keyword yang kamu tentukan.
            Setiap ide dilengkapi dengan hook, outline, durasi, dan estimasi viral score.
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Select Niche</label>
              <select
                className="form-select"
                value={selectedNiche}
                onChange={e => setSelectedNiche(e.target.value)}
                disabled={loadingNiches}
              >
                {loadingNiches && <option>Loading...</option>}
                {niches.map(n => <option key={n.id} value={n.id}>{n.name} ({n.platform})</option>)}
              </select>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleResearch}
              disabled={loading || !selectedNiche}
              style={{ flexShrink: 0 }}
            >
              {loading ? <><div className="spinner"></div> Researching...</> : 'Research Viral Content'}
            </button>
          </div>
        </div>

        {/* Results */}
        {ideas.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>{ideas.length} Ideas Found</h2>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Auto-saved to database</span>
            </div>
            <div className="content-grid">
              {ideas.map((idea, i) => (
                <div key={i} className="card animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="card-header" style={{ alignItems: 'flex-start', gap: 12 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-heading)', lineHeight: 1.4, flex: 1 }}>{idea.title}</h3>
                    <div style={{
                      background: idea.viral_score >= 80 ? 'var(--accent-green-bg)' : idea.viral_score >= 60 ? 'var(--accent-amber-bg)' : '#FEF2F2',
                      color: idea.viral_score >= 80 ? 'var(--accent-green)' : idea.viral_score >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
                      border: `1px solid ${idea.viral_score >= 80 ? 'rgba(16,185,129,0.2)' : idea.viral_score >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                      borderRadius: 'var(--radius-pill)',
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>{idea.viral_score}</div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--brand)', marginBottom: 4 }}>Hook</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>"{idea.hook}"</p>
                  </div>

                  {idea.outline?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 6 }}>Outline</div>
                      <ul style={{ paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                        {idea.outline.map((o, j) => <li key={j}>{o}</li>)}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>{idea.duration_target}s</span>
                    {idea.reasoning && <span style={{ fontSize: 11, maxWidth: 180, textAlign: 'right', lineHeight: 1.3 }}>{idea.reasoning}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && ideas.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <h3>Ready to research</h3>
            <p>Select a niche and click Research to discover viral content ideas powered by AI.</p>
          </div>
        )}
      </div>
    </>
  );
}
