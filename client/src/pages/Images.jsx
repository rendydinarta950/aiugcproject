import { useState, useEffect } from 'react';
import { api } from '../services/api';

const STYLES = [
  { id: 'ugc',       label: 'UGC',       desc: 'Candid, phone-camera, authentic feel' },
  { id: 'lifestyle', label: 'Lifestyle', desc: 'Natural environment, warm tones' },
  { id: 'tutorial',  label: 'Tutorial',  desc: 'Flat lay, organized, educational' },
  { id: 'product',   label: 'Product',   desc: 'Clean background, commercial focus' },
];

const SIZES = [
  { id: '9:16', label: '9:16', desc: 'Portrait (TikTok / Reels)', tag: 'photorealistic, 9:16 vertical portrait' },
  { id: '1:1',  label: '1:1',  desc: 'Square (Instagram feed)',   tag: 'photorealistic, 1:1 square format' },
  { id: '16:9', label: '16:9', desc: 'Landscape (YouTube thumb)', tag: 'photorealistic, 16:9 landscape horizontal' },
];

export default function Images() {
  const [images, setImages] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('ugc');
  const [selectedSize, setSelectedSize] = useState('9:16');
  const [customPrompt, setCustomPrompt] = useState('');
  const [ideaInput, setIdeaInput] = useState('');
  const [mode, setMode] = useState('content');
  const [generating, setGenerating] = useState(false);
  const [generatingMultiple, setGeneratingMultiple] = useState(false);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [previewImg, setPreviewImg] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [imgs, cnt] = await Promise.all([api.getImages(), api.getContent({ status: 'scripted' })]);
      setImages(imgs);
      setContent(cnt);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true);
    setLastGenerated(null);
    try {
      const sizeTag = SIZES.find(s => s.id === selectedSize)?.tag || '';
      let result;
      if (mode === 'prompt') {
        if (!customPrompt.trim()) { alert('Enter a prompt first.'); return; }
        const finalPrompt = `${customPrompt.trim()}, ${sizeTag}`;
        result = await api.generateImageFromPrompt(finalPrompt);
      } else {
        if (!selectedContent) { alert('Select content first.'); return; }
        result = await api.generateImage(selectedContent, selectedStyle);
      }
      setLastGenerated(result);
      await loadAll();
    } catch (err) { alert('Generation failed: ' + err.message); }
    finally { setGenerating(false); }
  }

  async function handleGenerateMultiple() {
    if (!selectedContent) { alert('Select content first.'); return; }
    setGeneratingMultiple(true);
    try { await api.generateMultipleImages(selectedContent, 3); await loadAll(); }
    catch (err) { alert('Failed: ' + err.message); }
    finally { setGeneratingMultiple(false); }
  }

  // AI-generated prompt from user's rough idea
  async function handleGeneratePrompt() {
    if (!ideaInput.trim()) { alert('Describe your idea first.'); return; }
    setGeneratingPrompt(true);
    try {
      const sizeTag = SIZES.find(s => s.id === selectedSize)?.tag || '9:16 vertical';
      const res = await fetch('http://localhost:3001/api/images/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideaInput, size: sizeTag }),
      });
      const data = await res.json();
      if (data.success) setCustomPrompt(data.prompt);
      else throw new Error(data.error);
    } catch (err) { alert('Prompt generation failed: ' + err.message); }
    finally { setGeneratingPrompt(false); }
  }

  async function handleDelete(filename) {
    if (!confirm('Delete this image?')) return;
    try { await api.deleteImage(filename); setImages(prev => prev.filter(i => i.filename !== filename)); }
    catch (err) { alert(err.message); }
  }

  const selectedContentData = content.find(c => String(c.id) === String(selectedContent));

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Image Generator</h1>
          <p>AI-generated visuals for your content production</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAll}>Refresh</button>
      </div>

      <div className="page-body">
        {/* Generator Panel */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Generate Image</span>
            {/* Mode tabs */}
            <div className="pill-tabs">
              <button className={`pill-tab${mode === 'content' ? ' active' : ''}`} onClick={() => setMode('content')}>From Content</button>
              <button className={`pill-tab${mode === 'prompt' ? ' active' : ''}`} onClick={() => setMode('prompt')}>Custom Prompt</button>
            </div>
          </div>

          {/* Size selector — always visible */}
          <div style={{ marginBottom: 18 }}>
            <label className="form-label">Output Size</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setSelectedSize(s.id)} style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'var(--ease)',
                  border: selectedSize === s.id ? 'none' : '1px solid var(--border)',
                  background: selectedSize === s.id ? 'var(--brand)' : 'var(--bg-page)',
                  color: selectedSize === s.id ? 'white' : 'var(--text-secondary)',
                  boxShadow: selectedSize === s.id ? 'var(--shadow-brand)' : 'none',
                  flex: 1, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13 }}>{s.label}</div>
                  <div style={{ fontSize: 10, marginTop: 2, opacity: .75, fontWeight: 400 }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {mode === 'content' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Content</label>
                <select className="form-select" value={selectedContent} onChange={e => setSelectedContent(e.target.value)}>
                  <option value="">Select scripted content...</option>
                  {content.map(c => <option key={c.id} value={c.id}>{c.title} · Score {c.viral_score}</option>)}
                </select>
                {selectedContentData && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{selectedContentData.hook}"
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Visual Style</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setSelectedStyle(s.id)} style={{
                      padding: '6px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'var(--ease)',
                      background: selectedStyle === s.id ? 'var(--brand)' : 'var(--bg-page)',
                      color: selectedStyle === s.id ? 'white' : 'var(--text-secondary)',
                      border: selectedStyle === s.id ? 'none' : '1px solid var(--border)',
                      boxShadow: selectedStyle === s.id ? 'var(--shadow-brand)' : 'none',
                    }}>{s.label}</button>
                  ))}
                </div>
                <div className="form-hint">{STYLES.find(s => s.id === selectedStyle)?.desc}</div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !selectedContent} style={{ flex: 1 }}>
                  {generating ? <><div className="spinner" style={{ borderTopColor: 'white' }}></div> Generating...</> : 'Generate Image'}
                </button>
                <button className="btn btn-secondary" onClick={handleGenerateMultiple} disabled={generatingMultiple || !selectedContent} style={{ flex: 1 }}>
                  {generatingMultiple ? <><div className="spinner"></div> Generating...</> : 'Generate 3 Styles'}
                </button>
              </div>
            </div>
          ) : (
            /* Custom Prompt Mode */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Idea helper */}
              <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
                  Prompt Generator — describe your idea, AI will build the full prompt
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    style={{ flex: 1, margin: 0 }}
                    placeholder="e.g. perempuan pakai skincare di kamar mandi, nuansa bersih"
                    value={ideaInput}
                    onChange={e => setIdeaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGeneratePrompt()}
                  />
                  <button className="btn btn-secondary" onClick={handleGeneratePrompt} disabled={generatingPrompt || !ideaInput.trim()} style={{ flexShrink: 0 }}>
                    {generatingPrompt ? <><div className="spinner"></div> Building...</> : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>
                        Build Prompt
                      </>
                    )}
                  </button>
                </div>
                <div className="form-hint">Type in any language — AI will create a detailed, optimized prompt for Imagen</div>
              </div>

              {/* Prompt textarea */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Image Prompt (English)</label>
                  {customPrompt && (
                    <button
                      onClick={() => setCustomPrompt('')}
                      style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >Clear</button>
                  )}
                </div>
                <textarea
                  className="form-input"
                  rows={5}
                  style={{ resize: 'vertical', fontSize: 13 }}
                  placeholder="A young Indonesian woman applying moisturizer in a clean bathroom, soft natural light, candid phone-camera aesthetic, photorealistic, 9:16 vertical..."
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                />
                <div className="form-hint">Tip: include visual setting, lighting, subject detail, and mood for best results</div>
              </div>

              <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !customPrompt.trim()}>
                {generating ? <><div className="spinner" style={{ borderTopColor: 'white' }}></div> Generating...</> : 'Generate from Prompt'}
              </button>
            </div>
          )}
        </div>

        {/* Last Generated */}
        {lastGenerated && !lastGenerated.error && (
          <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(16,185,129,.25)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="status-dot active"></div>
                <span className="card-title">Just Generated</span>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{(lastGenerated.fileSize / 1024).toFixed(0)} KB</span>
                <span>{lastGenerated.model}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <img
                src={`http://localhost:3001/output/images/${lastGenerated.filename}`}
                alt="Generated"
                style={{ width: 130, aspectRatio: selectedSize === '9:16' ? '9/16' : selectedSize === '1:1' ? '1/1' : '16/9', objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border)' }}
                onClick={() => setPreviewImg(lastGenerated)}
              />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="form-label" style={{ marginBottom: 8 }}>Prompt Used</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, fontStyle: 'italic' }}>{lastGenerated.prompt}</p>
              </div>
            </div>
          </div>
        )}

        {/* Gallery */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-heading)' }}>Gallery</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{images.length} images</span>
        </div>

        {loading ? (
          <div className="loading-state"><div className="spinner"></div><span>Loading gallery...</span></div>
        ) : images.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M3 16l5-5 4 4 3-3.5 6 4.5"/></svg>
            </div>
            <h3>No images yet</h3>
            <p>Generate your first image above to see it appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {images.map((img, i) => (
              <div key={img.filename} className="card animate-in" style={{ padding: 10, animationDelay: `${i * 0.02}s` }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`http://localhost:3001/output/images/${img.filename}`}
                    alt={img.filename}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border)', display: 'block' }}
                    onClick={() => setPreviewImg(img)}
                    loading="lazy"
                  />
                  <button
                    onClick={() => handleDelete(img.filename)}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,.9)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="var(--accent-red)" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h14M8 6V4h4v2M16 6l-1 12H5L4 6"/></svg>
                  </button>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{(img.fileSize / 1024).toFixed(0)} KB</span>
                  <span>{new Date(img.created_at).toLocaleDateString('en')}</span>
                </div>
                <a href={`http://localhost:3001/output/images/${img.filename}`} download={img.filename}
                  className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewImg && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewImg(null)}>
          <div className="modal" style={{ maxWidth: 680, maxHeight: '92vh' }}>
            <div className="modal-header">
              <h2>Image Preview</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`http://localhost:3001/output/images/${previewImg.filename}`} download={previewImg.filename} className="btn btn-secondary btn-sm">Download</a>
                <button className="btn btn-ghost" onClick={() => setPreviewImg(null)}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
                </button>
              </div>
            </div>
            <div style={{ padding: '16px 24px 24px', overflowY: 'auto' }}>
              <img src={`http://localhost:3001/output/images/${previewImg.filename}`} alt="Preview"
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'block' }} />
              {/* Image metadata */}
              <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  previewImg.fileSize && `${(previewImg.fileSize / 1024).toFixed(0)} KB`,
                  previewImg.model,
                  previewImg.style && `Style: ${previewImg.style}`,
                ].filter(Boolean).map((m, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '3px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', color: 'var(--text-muted)' }}>{m}</span>
                ))}
              </div>
              {previewImg.prompt && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div className="form-label" style={{ marginBottom: 6 }}>Prompt Used</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{previewImg.prompt}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
