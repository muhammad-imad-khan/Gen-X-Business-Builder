import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/Logo';
import RocketScene from '../components/RocketScene';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleLaunchComplete = () => {
    sessionStorage.setItem('genx_just_registered', '1');
    navigate('/welcome', { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        company: form.company || undefined,
      });
      // Trigger launch animation, then navigate on completion
      setLaunching(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* Rocket Background with launch support */}
      <RocketScene fullPage mode="ambient" launching={launching} onLaunchComplete={handleLaunchComplete} />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--color-surface)]/60 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">Gen X</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex items-center justify-center min-h-screen pt-16 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Start generating leads in minutes</p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-white text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-white text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-white text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all pr-10"
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Company <span className="text-[var(--color-text-muted)]">(optional)</span></label>
            <input
              type="text"
              value={form.company}
              onChange={set('company')}
              className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-white text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
              placeholder="ElysianSoft"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 gradient-primary text-white font-medium text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
