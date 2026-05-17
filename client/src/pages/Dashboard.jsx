import { useState, useEffect } from 'react';
import { api } from '../services/api';

const StatCard = ({ label, value, sub, color }) => (
  <div className="stat-card">
    <div className={`stat-icon ${color}`}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <rect x="2" y="10" width="3" height="8" rx="1"/>
        <rect x="7" y="6" width="3" height="12" rx="1"/>
        <rect x="12" y="2" width="3" height="16" rx="1"/>
        <rect x="17" y="8" width="1" height="10" rx="0.5"/>
      </svg>
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="loading-state">
      <div className="spinner"></div>
      <span>Loading dashboard...</span>
    </div>
  );

  const dailyProgress = stats ? Math.min(100, Math.round(((stats.today_count || 0) / 3) * 100)) : 0;
  const monthlyProgress = stats ? Math.min(100, Math.round(((stats.month_count || 0) / 90) * 100)) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your content production pipeline</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="10" r="8"/>
                <circle cx="10" cy="10" r="3"/>
              </svg>
            </div>
            <div className="stat-value">{stats?.total_niches || 0}</div>
            <div className="stat-label">Active Niches</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 4h12M4 8h8M4 12h10M4 16h6"/>
              </svg>
            </div>
            <div className="stat-value">{stats?.total_content || 0}</div>
            <div className="stat-label">Content Ideas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="12" height="12" rx="2"/>
                <path d="M14 8l4-2v8l-4-2"/>
              </svg>
            </div>
            <div className="stat-value">{stats?.total_videos || 0}</div>
            <div className="stat-label">Videos Produced</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M10 2l2.5 5 5.5.8-4 3.9.9 5.5L10 14.5l-4.9 2.7.9-5.5-4-3.9 5.5-.8z"/>
              </svg>
            </div>
            <div className="stat-value">{Math.round(stats?.avg_viral_score || 0)}</div>
            <div className="stat-label">Avg. Viral Score</div>
          </div>
        </div>

        {/* Progress */}
        <div className="two-col" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Daily Target</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stats?.today_count || 0} / 3 videos</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${dailyProgress}%` }}></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              {dailyProgress}% complete today
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Monthly Target</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stats?.month_count || 0} / 90 videos</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${monthlyProgress}%` }}></div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              {monthlyProgress}% of monthly goal
            </div>
          </div>
        </div>

        {/* Recent Content */}
        {stats?.recent_content?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Content</span>
            </div>
            <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Niche</th>
                    <th>Viral Score</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_content.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-heading)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.niche_name || '—'}</td>
                      <td>
                        <span className={`viral-score ${c.viral_score >= 80 ? 'high' : c.viral_score >= 50 ? 'medium' : 'low'}`}>
                          {c.viral_score}
                        </span>
                      </td>
                      <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{c.duration_target}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
