import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, Users, UserCircle, Menu, X, ChevronRight, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/import', label: 'Business Builder', icon: Upload },
  { to: '/dashboard/leads', label: 'All Leads', icon: Users },
  { to: '/dashboard/settings', label: 'Profile', icon: UserCircle },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/import': 'Business Builder',
  '/dashboard/leads': 'All Leads',
  '/dashboard/settings': 'Profile',
};

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTitle = pageTitles[location.pathname] || 'Gen X';
  const isBatch = location.pathname.startsWith('/dashboard/batches/');
  const isLead = location.pathname.startsWith('/dashboard/leads/') && location.pathname !== '/dashboard/leads';

  return (
    <div className="min-h-screen flex bg-[var(--color-surface)]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[260px] bg-[var(--color-surface-raised)] border-r border-[var(--color-border)] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-5 pb-4">
          <Link to="/dashboard" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <Logo size="md" />
            <div>
              <span className="text-[15px] font-bold text-white tracking-tight">Gen X</span>
              <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">Business Builder</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5">
          <p className="px-3 pt-4 pb-2 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Menu</p>
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[var(--color-primary-muted)] text-indigo-400 shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  active ? 'bg-indigo-500/20' : 'bg-transparent group-hover:bg-[var(--color-surface-overlay)]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 px-2">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{user?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4 px-4 lg:px-6 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              {(isBatch || isLead) && (
                <>
                  <Link to={isLead ? '/dashboard/leads' : '/dashboard'} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                    {isLead ? 'All Leads' : 'Dashboard'}
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </>
              )}
              <span className="font-medium text-[var(--color-text-primary)]">{isBatch ? 'Batch Details' : isLead ? 'Lead Preview' : currentTitle}</span>
            </div>

            {/* Theme toggle */}
            <div className="ml-auto flex items-center gap-1 bg-[var(--color-surface-overlay)] rounded-xl p-1 border border-[var(--color-border)]">
              {([
                { key: 'light' as const, icon: Sun, label: 'Light' },
                { key: 'dark' as const, icon: Moon, label: 'Dark' },
                { key: 'system' as const, icon: Monitor, label: 'System' },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  title={label}
                  className={`p-1.5 rounded-lg transition-all duration-200 ${
                    theme === key
                      ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
