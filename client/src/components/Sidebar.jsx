import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Icon = ({ name, size = 18 }) => {
  const s = { width: size, height: size };
  const icons = {
    dashboard: <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>,
    niches:    <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="2" x2="10" y2="7"/><line x1="10" y1="13" x2="10" y2="18"/><line x1="2" y1="10" x2="7" y2="10"/><line x1="13" y1="10" x2="18" y2="10"/></svg>,
    research:  <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="17.5" y2="17.5"/></svg>,
    content:   <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4h12M4 8h8M4 12h10M4 16h6"/></svg>,
    images:    <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="16" height="14" rx="2"/><circle cx="7.5" cy="8.5" r="1.5"/><path d="M2 14l4-4 3 3 3-3.5 6 4.5"/></svg>,
    videos:    <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="12" rx="2"/><path d="M14 8l4-2v8l-4-2"/></svg>,
    schedule:  <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="14" height="13" rx="2"/><line x1="3" y1="8" x2="17" y2="8"/><line x1="7" y1="2" x2="7" y2="5"/><line x1="13" y1="2" x2="13" y2="5"/></svg>,
    logout:    <svg {...s} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 10H3M10 7l-3 3 3 3"/><path d="M7 3h8a2 2 0 012 2v10a2 2 0 01-2 2H7"/></svg>,
  };
  return icons[name] || null;
};

const NAV = [
  { section: 'Overview', items: [
    { to: '/',        icon: 'dashboard', label: 'Dashboard' },
    { to: '/niches',  icon: 'niches',    label: 'Niches' },
  ]},
  { section: 'Content', items: [
    { to: '/research', icon: 'research', label: 'Research' },
    { to: '/content',  icon: 'content',  label: 'Content' },
    { to: '/images',   icon: 'images',   label: 'Images' },
    { to: '/videos',   icon: 'videos',   label: 'Videos' },
  ]},
  { section: 'Automation', items: [
    { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  ]},
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 20 20" fill="white"><path d="M10 2L3 6v8l7 4 7-4V6L10 2zm0 2.18L15 7v6l-5 2.82L5 13V7l5-2.82z"/><circle cx="10" cy="10" r="2.5" fill="white"/></svg>
            </div>
            <span className="logo-text">NyarAI</span>
            <span className="logo-badge">Beta</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <span className="nav-item-icon"><Icon name={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-footer" style={{ flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--brand-lighter)', border: '1px solid rgba(107,131,239,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: 'var(--brand)', flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              style={{
                width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)',
                background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, transition: 'var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-red-bg)'; e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-page)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border)', letterSpacing: '.3px' }}>
            AI Content Platform · v2.0
          </div>
        </div>
      </aside>

      {/* Collapse toggle button on the border */}
      <button
        className={`sidebar-toggle${collapsed ? ' collapsed' : ''}`}
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="13,5 7,10 13,15"/>
        </svg>
      </button>
    </>
  );
}
