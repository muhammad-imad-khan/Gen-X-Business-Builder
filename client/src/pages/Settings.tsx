import { useEffect, useRef, useState } from 'react';
import { api, SettingsResponse, Category } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Key, Bot, Globe, Github, CheckCircle2, XCircle, Loader2, ExternalLink,
  Rocket, Eye, EyeOff, AlertTriangle, Tags, Plus, Trash2, Pencil, X,
  User as UserIcon, CreditCard, Shield, Camera, Crown, Zap, Star, Check,
  Lock, Building2, Mail,
} from 'lucide-react';

type Tab = 'profile' | 'plans' | 'integrations' | 'categories';

export default function Settings() {
  const [tab, setTab] = useState<Tab>('profile');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'plans', label: 'Plans & Billing', icon: CreditCard },
    { key: 'integrations', label: 'Integrations', icon: Bot },
    { key: 'categories', label: 'Categories', icon: Tags },
  ];

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Profile</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Manage your profile, plan, integrations, and preferences.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)] mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap flex-1 justify-center ${
              tab === key
                ? 'bg-[var(--color-primary-muted)] text-indigo-400 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {tab === 'profile' && <ProfileTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'integrations' && <IntegrationsTab />}
        {tab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Profile Tab ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [company, setCompany] = useState(user?.company || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<FeedbackMsgType>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<FeedbackMsgType>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.updateProfile({ name: name.trim(), company: company.trim() || null });
      await refreshUser();
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    if (file.size > 500000) {
      setProfileMsg({ type: 'error', text: 'Image must be under 500KB.' });
      return;
    }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.updateAvatar(reader.result as string);
        await refreshUser();
        setProfileMsg({ type: 'success', text: 'Avatar updated!' });
      } catch (err: any) {
        setProfileMsg({ type: 'error', text: err.message || 'Failed to upload avatar.' });
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  }

  const planLabel = user?.plan === 'pro' ? 'Pro' : 'Free';

  return (
    <div className="space-y-5">
      {/* Profile Card */}
      <section className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-primary flex items-center justify-center text-2xl font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg transition-colors border-2 border-[var(--color-surface-raised)]"
            >
              {avatarUploading ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-white" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-white">{user?.name || 'User'}</h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                user?.plan === 'pro'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
              }`}>
                {user?.plan === 'pro' ? <Crown className="w-2.5 h-2.5" /> : <Star className="w-2.5 h-2.5" />}
                {planLabel}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> {user?.email}
            </p>
            {user?.company && (
              <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3" /> {user.company}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Edit Profile */}
      <section className="glass-card p-5">
        <SectionHeader icon={UserIcon} iconBg="bg-indigo-500/10" iconColor="text-indigo-400" title="Edit Profile" description="Update your name and company information." />
        <form onSubmit={saveProfile} className="space-y-3 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="form-input w-full" required />
            </div>
            <div>
              <label className="form-label">Company <span className="text-[var(--color-text-muted)]">(optional)</span></label>
              <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your company name" className="form-input w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" value={user?.email || ''} disabled className="form-input w-full opacity-50 cursor-not-allowed" />
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Email cannot be changed.</p>
          </div>
          <FeedbackMsg msg={profileMsg} />
          <button type="submit" disabled={profileSaving} className="flex items-center gap-2 px-4 py-2 gradient-primary hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all">
            {profileSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </form>
      </section>

      {/* Change Password */}
      <section className="glass-card p-5">
        <SectionHeader icon={Shield} iconBg="bg-amber-500/10" iconColor="text-amber-400" title="Change Password" description="Update your password to keep your account secure." />
        <form onSubmit={changePassword} className="space-y-3 mt-4">
          <div>
            <label className="form-label">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="form-input w-full pl-9 pr-9" required />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input w-full pr-9" required minLength={6} />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input w-full" required minLength={6} />
            </div>
          </div>
          <FeedbackMsg msg={passwordMsg} />
          <button type="submit" disabled={passwordSaving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all">
            {passwordSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Update Password
          </button>
        </form>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Plans Tab ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function PlansTab() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    api.getPlanUsage().then(setUsage).catch(() => {});
  }, []);

  const plans = [
    {
      key: 'free', name: 'Free', price: '$0', period: 'forever', icon: Star,
      color: 'text-[var(--color-text-muted)]', borderColor: 'border-[var(--color-border)]',
      bgColor: 'bg-[var(--color-surface-overlay)]',
      features: ['1 lead processing', '1 deployment', 'Basic AI generation', 'Email support'],
    },
    {
      key: 'pro', name: 'Pro', price: '$29', period: '/month', icon: Crown,
      color: 'text-amber-400', borderColor: 'border-amber-500/30', bgColor: 'bg-amber-500/5',
      popular: true,
      features: ['Unlimited lead processing', 'Unlimited deployments', 'Advanced AI models', 'Priority support', 'Custom outreach templates', 'Advanced analytics'],
    },
    {
      key: 'enterprise', name: 'Enterprise', price: 'Custom', period: '', icon: Zap,
      color: 'text-purple-400', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/5',
      features: ['Everything in Pro', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'Team management', 'White-label solutions'],
    },
  ];

  return (
    <div className="space-y-5">
      {usage && (
        <section className="glass-card p-5">
          <SectionHeader icon={CreditCard} iconBg="bg-indigo-500/10" iconColor="text-indigo-400" title="Current Usage" description={`You're on the ${usage.label} plan.`} />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl p-3.5">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Leads Processed</p>
              <p className="text-lg font-bold text-white mt-1">
                {usage.processedLeads}
                <span className="text-xs text-[var(--color-text-muted)] font-normal"> / {usage.maxProcessedLeads === Infinity ? '\u221E' : usage.maxProcessedLeads}</span>
              </p>
              <div className="h-1.5 bg-[var(--color-surface)] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: usage.maxProcessedLeads === Infinity ? '5%' : `${Math.min(100, (usage.processedLeads / usage.maxProcessedLeads) * 100)}%` }} />
              </div>
            </div>
            <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl p-3.5">
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium">Deployments</p>
              <p className="text-lg font-bold text-white mt-1">
                {usage.deploymentCount}
                <span className="text-xs text-[var(--color-text-muted)] font-normal"> / {usage.maxDeployments === Infinity ? '\u221E' : usage.maxDeployments}</span>
              </p>
              <div className="h-1.5 bg-[var(--color-surface)] rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: usage.maxDeployments === Infinity ? '5%' : `${Math.min(100, (usage.deploymentCount / usage.maxDeployments) * 100)}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.key;
          const Icon = plan.icon;
          return (
            <div key={plan.key} className={`relative rounded-2xl border p-5 transition-all duration-200 ${isCurrent ? `${plan.borderColor} ${plan.bgColor} ring-1 ring-indigo-500/20` : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-text-muted)]'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">Most Popular</span>
                </div>
              )}
              <div className="text-center">
                <div className={`inline-flex p-2.5 rounded-xl ${plan.bgColor} mb-3`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-2xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-xs text-[var(--color-text-muted)]">{plan.period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                    <Check className={`w-3.5 h-3.5 shrink-0 ${plan.color}`} /> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button disabled className="w-full py-2.5 rounded-xl text-xs font-medium bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border)] cursor-default">Current Plan</button>
              ) : plan.key === 'enterprise' ? (
                <a href="mailto:contact@elysiansoft.com?subject=Enterprise Plan Inquiry" className="block w-full py-2.5 rounded-xl text-xs font-medium text-center bg-purple-600 hover:bg-purple-500 text-white transition-colors">Contact Sales</a>
              ) : (
                <button className="w-full py-2.5 rounded-xl text-xs font-medium gradient-primary text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
                  {plan.key === 'pro' ? 'Upgrade to Pro' : 'Downgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-white">Secure Payments</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">All payments are processed securely. You can upgrade, downgrade, or cancel your plan at any time.</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Integrations Tab ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function IntegrationsTab() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState<FeedbackMsgType>(null);
  const [vercelToken, setVercelToken] = useState('');
  const [vercelTeamId, setVercelTeamId] = useState('');
  const [vercelSaving, setVercelSaving] = useState(false);
  const [vercelMsg, setVercelMsg] = useState<FeedbackMsgType>(null);
  const [githubToken, setGithubToken] = useState('');
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubMsg, setGithubMsg] = useState<FeedbackMsgType>(null);
  const [autoDeployToggle, setAutoDeployToggle] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setAiProvider(data.aiProvider);
      setAiModel(data.aiModel);
      setAutoDeployToggle(data.autoDeployToVercel);
    } catch { /* defaults */ } finally { setLoading(false); }
  }

  async function saveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true); setAiMsg(null);
    try {
      const payload: any = { aiProvider, aiModel };
      if (aiApiKey) payload.aiApiKey = aiApiKey;
      await api.updateAiSettings(payload);
      setAiApiKey('');
      setAiMsg({ type: 'success', text: 'AI settings saved successfully.' });
      await loadSettings();
    } catch (err: any) {
      setAiMsg({ type: 'error', text: err.message || 'Failed to save AI settings.' });
    } finally { setAiSaving(false); }
  }

  async function connectVercel(e: React.FormEvent) {
    e.preventDefault();
    setVercelSaving(true); setVercelMsg(null);
    try {
      const res = await api.connectVercel({ token: vercelToken, teamId: vercelTeamId || undefined });
      setVercelToken(''); setVercelTeamId('');
      setVercelMsg({ type: 'success', text: `Connected as ${res.username}` });
      await loadSettings();
    } catch (err: any) {
      setVercelMsg({ type: 'error', text: err.message || 'Failed to connect to Vercel.' });
    } finally { setVercelSaving(false); }
  }

  async function disconnectVercel() {
    try { await api.disconnectVercel(); setVercelMsg({ type: 'success', text: 'Vercel disconnected.' }); await loadSettings(); }
    catch (err: any) { setVercelMsg({ type: 'error', text: err.message }); }
  }

  async function connectGithub(e: React.FormEvent) {
    e.preventDefault();
    setGithubSaving(true); setGithubMsg(null);
    try {
      const res = await api.connectGithub({ token: githubToken });
      setGithubToken('');
      setGithubMsg({ type: 'success', text: `Connected as @${res.username}` });
      await loadSettings();
    } catch (err: any) {
      setGithubMsg({ type: 'error', text: err.message || 'Failed to connect to GitHub.' });
    } finally { setGithubSaving(false); }
  }

  async function disconnectGithub() {
    try { await api.disconnectGithub(); setGithubMsg({ type: 'success', text: 'GitHub disconnected.' }); await loadSettings(); }
    catch (err: any) { setGithubMsg({ type: 'error', text: err.message }); }
  }

  async function toggleAutoDeploy(newVal: boolean) {
    try { await api.updateDeployToggle(newVal); setAutoDeployToggle(newVal); }
    catch (err: any) { alert(err.message); setAutoDeployToggle(!newVal); }
  }

  const models = settings?.providers?.[aiProvider]?.models || [];

  if (loading) return <IntegrationsSkeleton />;

  return (
    <div className="space-y-5">
      {/* AI Configuration */}
      <section className="glass-card p-5">
        <SectionHeader icon={Bot} iconBg="bg-indigo-500/10" iconColor="text-indigo-400" title="AI Configuration" description="Select your AI provider and model for generating agents, website proposals, and outreach." />
        <form onSubmit={saveAiSettings} className="space-y-4 mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">AI Provider</label>
              <select value={aiProvider} onChange={(e) => { setAiProvider(e.target.value); setAiModel(settings?.providers?.[e.target.value]?.models[0] || ''); }} className="form-select">
                {settings?.providers && Object.entries(settings.providers).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
              </select>
            </div>
            <div>
              <label className="form-label">Model</label>
              <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="form-select">
                {models.map((m) => (<option key={m} value={m}>{m}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">API Key</label>
            {settings?.aiApiKeySet && (
              <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">Current key: <span className="font-mono text-[var(--color-text-secondary)]">{settings.aiApiKeyMasked}</span></p>
            )}
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input type={showApiKey ? 'text' : 'password'} value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder={settings?.aiApiKeySet ? 'Enter new key to replace' : 'Enter your API key'} className="form-input w-full pl-9 pr-9" />
              <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <FeedbackMsg msg={aiMsg} />
          <button type="submit" disabled={aiSaving} className="flex items-center gap-2 px-4 py-2 gradient-primary hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all">
            {aiSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save AI Settings
          </button>
        </form>
      </section>

      {/* Vercel */}
      <section className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <SectionHeader icon={Globe} iconBg="bg-white/5" iconColor="text-white" title="Vercel Integration" description="Connect your Vercel account to auto-deploy generated websites and AI agents." />
          {settings?.vercelConnected && <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0"><CheckCircle2 className="w-3 h-3" /> Connected</span>}
        </div>
        {settings?.vercelConnected ? (
          <div className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-4 py-3 mt-4">
            <span className="text-xs text-[var(--color-text-secondary)]">Vercel account connected. Deployments will be created automatically.</span>
            <button onClick={disconnectVercel} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Disconnect</button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text-secondary)] mb-1">Don't have a Vercel account?</p>
                  <p><a href="https://vercel.com/signup" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">Create a free account <ExternalLink className="w-2.5 h-2.5" /></a> then generate a token from <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">Account Settings &rarr; Tokens <ExternalLink className="w-2.5 h-2.5" /></a>.</p>
                </div>
              </div>
            </div>
            <form onSubmit={connectVercel} className="space-y-3">
              <div><label className="form-label">Vercel Access Token</label><input type="password" value={vercelToken} onChange={(e) => setVercelToken(e.target.value)} placeholder="Enter your Vercel personal access token" required className="form-input w-full" /></div>
              <div><label className="form-label">Team ID <span className="text-[var(--color-text-muted)]">(optional)</span></label><input type="text" value={vercelTeamId} onChange={(e) => setVercelTeamId(e.target.value)} placeholder="team_xxxxx (leave empty for personal account)" className="form-input w-full" /></div>
              <FeedbackMsg msg={vercelMsg} />
              <button type="submit" disabled={vercelSaving} className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white disabled:opacity-50 rounded-lg text-black text-xs font-medium transition-all">
                {vercelSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} Connect Vercel
              </button>
            </form>
          </div>
        )}
      </section>

      {/* GitHub */}
      <section className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <SectionHeader icon={Github} iconBg="bg-white/5" iconColor="text-white" title="GitHub Integration" description="Connect GitHub to create repos for generated projects and link them with Vercel." />
          {settings?.githubConnected && <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0"><CheckCircle2 className="w-3 h-3" /> @{settings.githubUsername}</span>}
        </div>
        {settings?.githubConnected ? (
          <div className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-4 py-3 mt-4">
            <span className="text-xs text-[var(--color-text-secondary)]">GitHub connected as <strong className="text-white">@{settings.githubUsername}</strong>.</span>
            <button onClick={disconnectGithub} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Disconnect</button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text-secondary)] mb-1">Generate a Personal Access Token</p>
                  <p>Go to <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">GitHub Token Settings <ExternalLink className="w-2.5 h-2.5" /></a> and create a token with <code className="bg-[var(--color-surface-overlay)] px-1 rounded text-indigo-300 text-[10px]">repo</code> scope.</p>
                </div>
              </div>
            </div>
            <form onSubmit={connectGithub} className="space-y-3">
              <div><label className="form-label">GitHub Personal Access Token</label><input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" required className="form-input w-full" /></div>
              <FeedbackMsg msg={githubMsg} />
              <button type="submit" disabled={githubSaving} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-overlay)] hover:bg-white/[0.06] border border-[var(--color-border)] disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all">
                {githubSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />} Connect GitHub
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Auto Deploy */}
      <section className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SectionHeader icon={Rocket} iconBg="bg-purple-500/10" iconColor="text-purple-400" title="Auto-Deploy to Vercel" description="Automatically deploy generated AI agents and websites when processing completes." inline />
          <button onClick={() => toggleAutoDeploy(!autoDeployToggle)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${autoDeployToggle ? 'bg-indigo-600' : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)]'}`} disabled={!settings?.vercelConnected || !settings?.githubConnected} title={!settings?.vercelConnected || !settings?.githubConnected ? 'Connect both Vercel and GitHub first' : ''}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-1 ${autoDeployToggle ? 'translate-x-6 ml-0.5' : 'translate-x-1'}`} />
          </button>
        </div>
        {(!settings?.vercelConnected || !settings?.githubConnected) && (
          <p className="mt-3 text-[11px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Connect both Vercel and GitHub to enable auto-deploy.</p>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Categories Tab ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [catSaving, setCatSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [catMsg, setCatMsg] = useState<FeedbackMsgType>(null);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try { const data = await api.getCategories(); setCategories(data); } catch { /* ignore */ }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true); setCatMsg(null);
    try {
      await api.createCategory({ name: newCatName.trim(), color: newCatColor });
      setNewCatName(''); setNewCatColor('#6366f1');
      setCatMsg({ type: 'success', text: 'Category added.' });
      await loadCategories();
    } catch (err: any) {
      setCatMsg({ type: 'error', text: err.message || 'Failed to add category.' });
    } finally { setCatSaving(false); }
  }

  async function saveEditCategory(id: string) {
    if (!editCatName.trim()) return;
    try { await api.updateCategory(id, { name: editCatName.trim(), color: editCatColor }); setEditingCat(null); await loadCategories(); }
    catch (err: any) { setCatMsg({ type: 'error', text: err.message || 'Failed to update category.' }); }
  }

  async function deleteCategory(id: string) {
    try { await api.deleteCategory(id); await loadCategories(); }
    catch (err: any) { setCatMsg({ type: 'error', text: err.message || 'Failed to delete category.' }); }
  }

  return (
    <div className="space-y-5">
      <section className="glass-card p-5">
        <SectionHeader icon={Tags} iconBg="bg-emerald-500/10" iconColor="text-emerald-400" title="Categories" description="Create categories to organize and filter your leads (e.g., Dentist, Restaurant, Salon)." />
        <form onSubmit={addCategory} className="flex flex-col sm:flex-row sm:items-end gap-2 mt-5 mb-4">
          <div className="flex-1">
            <label className="form-label">Category Name</label>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="e.g., Dentist, Restaurant, Salon" className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Color</label>
            <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="w-10 h-[38px] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg cursor-pointer" />
          </div>
          <button type="submit" disabled={catSaving || !newCatName.trim()} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-colors h-[38px]">
            {catSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
          </button>
        </form>
        <FeedbackMsg msg={catMsg} />
        {categories.length === 0 ? (
          <div className="text-center py-6 text-[var(--color-text-muted)] text-xs">No categories yet. Add one above to get started.</div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5">
                {editingCat === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="color" value={editCatColor} onChange={(e) => setEditCatColor(e.target.value)} className="w-7 h-7 bg-transparent border border-[var(--color-border)] rounded cursor-pointer" />
                    <input type="text" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEditCategory(cat.id)} className="form-input flex-1 py-1.5 text-xs" autoFocus />
                    <button onClick={() => saveEditCategory(cat.id)} className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">Save</button>
                    <button onClick={() => setEditingCat(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-white font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); setEditCatColor(cat.color); }} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded-lg hover:bg-white/[0.04] transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-[var(--color-text-muted)] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── Shared Components ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

type FeedbackMsgType = { type: 'success' | 'error'; text: string } | null;

function SectionHeader({ icon: Icon, iconBg, iconColor, title, description, inline }: {
  icon: any; iconBg: string; iconColor: string; title: string; description: string; inline?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg} shrink-0`}><Icon className={`w-4 h-4 ${iconColor}`} /></div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeedbackMsg({ msg }: { msg: FeedbackMsgType }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
      {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="space-y-1.5"><div className="skeleton h-4 w-32 rounded" /><div className="skeleton h-3 w-56 rounded" /></div>
          </div>
          <div className="skeleton h-10 w-full rounded-lg" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
