import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => { loadVideos(); }, []);

  async function loadVideos() {
    try {
      setLoading(true);
      setVideos(await api.getVideos());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openPreview(video) {
    if (video.file_path && video.file_path.endsWith('.html')) {
      const filename = video.file_path.split(/[/\\]/).pop();
      setPreviewUrl(`http://localhost:3001/output/html/${filename}`);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Video Gallery</h1>
          <p>All AI-generated videos from your production pipeline</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadVideos}>Refresh</button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><span>Loading videos...</span></div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="15" height="15" rx="2"/><path d="M17 8l4-2v10l-4-2"/>
              </svg>
            </div>
            <h3>No videos yet</h3>
            <p>Go to Content, find a scripted item, and click "Make Video" — or use the pipeline trigger in Schedule.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {videos.map((v, i) => (
              <div key={v.id} className="card animate-in" style={{ padding: 16, animationDelay: `${i * 0.04}s` }}>
                {/* Thumbnail placeholder */}
                <div style={{
                  background: 'var(--bg-page)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  aspectRatio: '9/16',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                  cursor: v.file_path?.endsWith('.html') ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => openPreview(v)}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border-strong)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="15" height="15" rx="2"/><path d="M17 8l4-2v10l-4-2"/>
                  </svg>
                  {v.file_path?.endsWith('.html') && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
                      <div style={{ width: 44, height: 44, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', opacity: 0.9 }}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><polygon points="6,4 18,10 6,16"/></svg>
                      </div>
                    </div>
                  )}
                  {v.duration_seconds > 0 && (
                    <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(15,14,23,0.65)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--radius-xs)', backdropFilter: 'blur(4px)' }}>
                      {v.duration_seconds}s
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {v.content_title || 'Untitled'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                  <span>{v.niche_name || '—'}</span>
                  <span>{new Date(v.created_at).toLocaleDateString('en')}</span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {v.file_path?.endsWith('.html') && (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => openPreview(v)}>Preview</button>
                  )}
                  <a
                    href={`http://localhost:3001/api/videos/${v.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewUrl && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewUrl(null)}>
          <div className="modal" style={{ maxWidth: 460, maxHeight: '93vh', overflow: 'hidden' }}>
            <div className="modal-header" style={{ paddingBottom: 16 }}>
              <h2>Video Preview</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Open Tab</a>
                <button className="btn btn-ghost" onClick={() => setPreviewUrl(null)}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
                </button>
              </div>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              <iframe
                src={previewUrl}
                style={{ width: '100%', height: 580, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: '#000' }}
                title="Video Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
