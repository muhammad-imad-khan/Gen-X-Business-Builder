import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ImportLeads from './pages/ImportLeads';
import LeadsList from './pages/LeadsList';
import LeadPreview from './pages/LeadPreview';
import BatchView from './pages/BatchView';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Welcome from './pages/Welcome';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    // After registration, redirect to /welcome celebration instead of /dashboard
    const justRegistered = sessionStorage.getItem('genx_just_registered');
    if (justRegistered) {
      return <Navigate to="/welcome" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function LandingOrDashboard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingOrDashboard />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="import" element={<ImportLeads />} />
        <Route path="leads" element={<LeadsList />} />
        <Route path="leads/:id" element={<LeadPreview />} />
        <Route path="batches/:id" element={<BatchView />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      {/* Legacy redirects */}
      <Route path="/import" element={<Navigate to="/dashboard/import" replace />} />
      <Route path="/leads" element={<Navigate to="/dashboard/leads" replace />} />
      <Route path="/leads/:id" element={<Navigate to="/dashboard/leads/:id" replace />} />
      <Route path="/batches/:id" element={<Navigate to="/dashboard/batches/:id" replace />} />
      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
    </Routes>
  );
}
