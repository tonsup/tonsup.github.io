import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { loadSession } from './lib/auth';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import Settings from './pages/Settings';

export default function App() {
  const { session, setSession, initAfterLogin } = useStore();

  useEffect(() => {
    const s = loadSession();
    if (s) {
      setSession(s);
    }
  }, [setSession]);

  useEffect(() => {
    if (session) {
      void initAfterLogin();
    }
  }, [session, initAfterLogin]);

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id/*" element={<ProjectDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
