import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import Logo from '../components/Logo';

const API_BASE = '/api';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Get email from state (manual flow) or query params (link from email)
  const emailFromState = (location.state as any)?.email || '';
  const emailFromQuery = searchParams.get('email') || '';
  const codeFromQuery = searchParams.get('code') || '';
  const email = emailFromState || emailFromQuery;

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-verify if email + code come from URL (clicked link in email)
  useEffect(() => {
    if (emailFromQuery && codeFromQuery && codeFromQuery.length === 6) {
      setAutoVerifying(true);
      fetch(`${API_BASE}/auth/verify-email?email=${encodeURIComponent(emailFromQuery)}&code=${encodeURIComponent(codeFromQuery)}`)
        .then(res => res.json())
        .then(body => {
          if (body.verified || body.alreadyVerified) {
            setSuccess('Email verified! Redirecting to sign in...');
            sessionStorage.setItem('genx_just_registered', 'true');
            setTimeout(() => navigate('/login', { replace: true }), 2000);
          } else {
            setError(body.error || 'Verification failed. Please enter the code manually.');
            setAutoVerifying(false);
          }
        })
        .catch(() => {
          setError('Verification failed. Please enter the code manually.');
          setAutoVerifying(false);
        });
    }
  }, [emailFromQuery, codeFromQuery, navigate]);

  useEffect(() => {
    if (!email) navigate('/register', { replace: true });
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Verification failed');

      setSuccess('Email verified! Redirecting to sign in...');
      // Set flag so first login shows the Welcome celebration
      sessionStorage.setItem('genx_just_registered', 'true');
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/resend-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'EMAIL_VERIFICATION' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to resend');
      setSuccess('A new code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <nav className="fixed top-0 w-full z-50 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size="md" />
            <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">Gen X</span>
          </Link>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen pt-16 px-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verify your email</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              We sent a 6-digit code to <span className="text-indigo-400">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                {success}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-3 text-center">
                Enter verification code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 py-2.5 gradient-primary text-white font-medium text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-indigo-500/20"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </form>

          <p className="text-center text-sm text-[var(--color-text-muted)] mt-5">
            Wrong email?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Register again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
