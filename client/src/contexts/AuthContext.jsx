import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Simple credential check — replace with real API call if needed
const VALID_USERS = [
  { username: 'admin', password: 'nyarai2024', role: 'admin', name: 'Admin' },
  { username: 'editor', password: 'NyarJago123!', role: 'editor', name: 'Editor' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('nyarai_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  function login(username, password) {
    const found = VALID_USERS.find(
      u => u.username === username.trim() && u.password === password
    );
    if (!found) throw new Error('Username atau password salah.');
    const session = { username: found.username, name: found.name, role: found.role, loginAt: new Date().toISOString() };
    localStorage.setItem('nyarai_user', JSON.stringify(session));
    setUser(session);
  }

  function logout() {
    localStorage.removeItem('nyarai_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
