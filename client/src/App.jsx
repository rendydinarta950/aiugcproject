import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Niches from './pages/Niches';
import Research from './pages/Research';
import Content from './pages/Content';
import Images from './pages/Images';
import Videos from './pages/Videos';
import Schedule from './pages/Schedule';
import './styles/index.css';

function AppShell() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return <Login />;

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main className={`main-content${collapsed ? ' expanded' : ''}`}>
        <Routes>
          <Route path="/"         element={<Dashboard />} />
          <Route path="/niches"   element={<Niches />} />
          <Route path="/research" element={<Research />} />
          <Route path="/content"  element={<Content />} />
          <Route path="/images"   element={<Images />} />
          <Route path="/videos"   element={<Videos />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
