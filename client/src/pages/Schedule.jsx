import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Schedule() {
  const [schedules, setSchedules] = useState([]);
  const [niches, setNiches] = useState([]);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [triggering, setTriggering] = useState(null);
  const [form, setForm] = useState({ niche_id: '', videos_per_day: 3, time_slots: ['08:00', '12:00', '18:00'] });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, n, st] = await Promise.all([
        api.getSchedules(),
        api.getNiches(),
        api.getSchedulerStatus().catch(() => null),
      ]);
      setSchedules(s);
      setNiches(n);
      setSchedulerStatus(st);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try { await api.createSchedule(form); setShowModal(false); loadAll(); }
    catch (err) { alert(err.message); }
  }

  async function handleToggle(id, current) {
    try { await api.toggleSchedule(id, !current); loadAll(); }
    catch (err) { alert(err.message); }
  }

  async function handleStartScheduler() {
    try { const s = await api.startScheduler(); setSchedulerStatus(s); }
    catch (err) { alert(err.message); }
  }

  async function handleStopScheduler() {
    try { const s = await api.stopScheduler(); setSchedulerStatus(s); }
    catch (err) { alert(err.message); }
  }

  async function handleTriggerPipeline(nicheId, nicheName) {
    if (!confirm(`Run full pipeline for "${nicheName}"?\n\nThis will Research → Script → Generate Video automatically.`)) return;
    setTriggering(nicheId);
    try {
      const result = await api.triggerPipeline(nicheId);
      alert(`Pipeline complete (${result?.elapsed || '?'}s). Check Content & Videos.`);
      loadAll();
    } catch (err) { alert('Pipeline error: ' + err.message); }
    finally { setTriggering(null); }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Schedule & Automation</h1>
          <p>Automate 3 videos per day — 90 videos per month</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>New Schedule</button>
      </div>

      <div className="page-body">
        {/* Scheduler Engine */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className={`status-dot ${schedulerStatus?.isRunning ? 'active' : 'inactive'}`}></div>
              <span className="card-title">Scheduler Engine</span>
              <span style={{ fontSize: 12, color: schedulerStatus?.isRunning ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {schedulerStatus?.isRunning ? (
                <button className="btn btn-danger btn-sm" onClick={handleStopScheduler}>Stop Engine</button>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={handleStartScheduler}>Start Engine</button>
              )}
            </div>
          </div>

          {schedulerStatus?.recentLogs?.length > 0 && (
            <div className="log-viewer">
              {schedulerStatus.recentLogs.slice(0, 20).map((log, i) => (
                <div key={i} className={`log-entry ${log.level === 'error' ? 'error' : log.level === 'success' ? 'success' : ''}`}>
                  <span className="log-time">{new Date(log.timestamp).toLocaleTimeString('en')}</span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><polyline points="10,5 10,10 13,13"/></svg>
            </div>
            <div className="stat-value">3</div>
            <div className="stat-label">Videos / Day</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/></svg>
            </div>
            <div className="stat-value">90</div>
            <div className="stat-label">Videos / Month</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 10l4 4 6-7"/></svg>
            </div>
            <div className="stat-value">{schedules.filter(s => s.is_active).length}</div>
            <div className="stat-label">Active Schedules</div>
          </div>
        </div>

        {/* Manual Trigger */}
        {niches.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <span className="card-title">Manual Pipeline Trigger</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Research → Script → Video</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {niches.map(n => (
                <button
                  key={n.id}
                  className="btn btn-secondary"
                  onClick={() => handleTriggerPipeline(n.id, n.name)}
                  disabled={triggering === n.id}
                  style={{ minWidth: 140 }}
                >
                  {triggering === n.id ? (
                    <><div className="spinner"></div> Running...</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5,3 19,10 5,17 5,3"/></svg>
                      {n.name}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule List */}
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><span>Loading schedules...</span></div>
        ) : schedules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
            </div>
            <h3>No schedules yet</h3>
            <p>Create a schedule to automate daily content production for a niche.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>Create Schedule</button>
          </div>
        ) : (
          <div className="content-grid">
            {schedules.map((s, i) => (
              <div key={s.id} className="card animate-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="card-header">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-heading)' }}>{s.niche_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.videos_per_day} videos/day · {s.videos_per_day * 30}/month</div>
                  </div>
                  <button
                    className={`btn btn-sm ${s.is_active ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleToggle(s.id, s.is_active)}
                  >
                    {s.is_active ? 'Active' : 'Paused'}
                  </button>
                </div>
                <div>
                  <div className="form-label" style={{ marginBottom: 8 }}>Time Slots</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(JSON.parse(s.time_slots || '[]')).map((t, j) => (
                      <span key={j} style={{ fontSize: 12, padding: '4px 12px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>New Schedule</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Niche</label>
                  <select className="form-select" value={form.niche_id} onChange={e => setForm({ ...form, niche_id: e.target.value })} required>
                    <option value="">Select a niche...</option>
                    {niches.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Videos Per Day</label>
                  <input type="number" className="form-input" min="1" max="10" value={form.videos_per_day} onChange={e => setForm({ ...form, videos_per_day: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
