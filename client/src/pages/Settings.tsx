import { useEffect, useState } from 'react';
import { api, SettingsResponse, Category } from '../lib/api';
import {
  Key,
  Bot,
  Globe,
  Github,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Rocket,
  Eye,
  EyeOff,
  AlertTriangle,
  Tags,
  Plus,
  Trash2,
  Pencil,
  X,
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // AI form
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vercel form
  const [vercelToken, setVercelToken] = useState('');
  const [vercelTeamId, setVercelTeamId] = useState('');
  const [vercelSaving, setVercelSaving] = useState(false);
  const [vercelMsg, setVercelMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // GitHub form
  const [githubToken, setGithubToken] = useState('');
  const [githubSaving, setGithubSaving] = useState(false);
  const [githubMsg, setGithubMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Deploy toggle
  const [autoDeployToggle, setAutoDeployToggle] = useState(false);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [catSaving, setCatSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatColor, setEditCatColor] = useState('');
  const [catMsg, setCatMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
    loadCategories();
  }, []);

  async function loadSettings() {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setAiProvider(data.aiProvider);
      setAiModel(data.aiModel);
      setAutoDeployToggle(data.autoDeployToVercel);
    } catch {
      // settings not yet created, use defaults
    } finally {
      setLoading(false);
    }
  }

  // ─── AI Settings ─────────────────────────────────────────────
  async function saveAiSettings(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setAiMsg(null);
    try {
      const payload: any = { aiProvider, aiModel };
      if (aiApiKey) payload.aiApiKey = aiApiKey;
      await api.updateAiSettings(payload);
      setAiApiKey('');
      setAiMsg({ type: 'success', text: 'AI settings saved successfully.' });
      await loadSettings();
    } catch (err: any) {
      setAiMsg({ type: 'error', text: err.message || 'Failed to save AI settings.' });
    } finally {
      setAiSaving(false);
    }
  }

  // ─── Vercel ──────────────────────────────────────────────────
  async function connectVercel(e: React.FormEvent) {
    e.preventDefault();
    setVercelSaving(true);
    setVercelMsg(null);
    try {
      const res = await api.connectVercel({ token: vercelToken, teamId: vercelTeamId || undefined });
      setVercelToken('');
      setVercelTeamId('');
      setVercelMsg({ type: 'success', text: `Connected as ${res.username}` });
      await loadSettings();
    } catch (err: any) {
      setVercelMsg({ type: 'error', text: err.message || 'Failed to connect to Vercel.' });
    } finally {
      setVercelSaving(false);
    }
  }

  async function disconnectVercel() {
    try {
      await api.disconnectVercel();
      setVercelMsg({ type: 'success', text: 'Vercel disconnected.' });
      await loadSettings();
    } catch (err: any) {
      setVercelMsg({ type: 'error', text: err.message });
    }
  }

  // ─── GitHub ──────────────────────────────────────────────────
  async function connectGithub(e: React.FormEvent) {
    e.preventDefault();
    setGithubSaving(true);
    setGithubMsg(null);
    try {
      const res = await api.connectGithub({ token: githubToken });
      setGithubToken('');
      setGithubMsg({ type: 'success', text: `Connected as @${res.username}` });
      await loadSettings();
    } catch (err: any) {
      setGithubMsg({ type: 'error', text: err.message || 'Failed to connect to GitHub.' });
    } finally {
      setGithubSaving(false);
    }
  }

  async function disconnectGithub() {
    try {
      await api.disconnectGithub();
      setGithubMsg({ type: 'success', text: 'GitHub disconnected.' });
      await loadSettings();
    } catch (err: any) {
      setGithubMsg({ type: 'error', text: err.message });
    }
  }

  // ─── Deploy Toggle ──────────────────────────────────────────
  async function toggleAutoDeploy(newVal: boolean) {
    try {
      await api.updateDeployToggle(newVal);
      setAutoDeployToggle(newVal);
    } catch (err: any) {
      alert(err.message);
      setAutoDeployToggle(!newVal);
    }
  }

  // ─── Categories ──────────────────────────────────────────────
  async function loadCategories() {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      // ignore
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatSaving(true);
    setCatMsg(null);
    try {
      await api.createCategory({ name: newCatName.trim(), color: newCatColor });
      setNewCatName('');
      setNewCatColor('#6366f1');
      setCatMsg({ type: 'success', text: 'Category added.' });
      await loadCategories();
    } catch (err: any) {
      setCatMsg({ type: 'error', text: err.message || 'Failed to add category.' });
    } finally {
      setCatSaving(false);
    }
  }

  async function saveEditCategory(id: string) {
    if (!editCatName.trim()) return;
    try {
      await api.updateCategory(id, { name: editCatName.trim(), color: editCatColor });
      setEditingCat(null);
      await loadCategories();
    } catch (err: any) {
      setCatMsg({ type: 'error', text: err.message || 'Failed to update category.' });
    }
  }

  async function deleteCategory(id: string) {
    try {
      await api.deleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      setCatMsg({ type: 'error', text: err.message || 'Failed to delete category.' });
    }
  }

  const models = settings?.providers?.[aiProvider]?.models || [];

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-lg font-bold text-white">Settings</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Configure AI provider, integrations, and categories.</p>
      </div>

      {/* ─── AI Provider & API Key ──────────────────────────────── */}
      <section className="glass-card p-5">
        <SectionHeader
          icon={Bot}
          iconBg="bg-indigo-500/10"
          iconColor="text-indigo-400"
          title="AI Configuration"
          description="Select your AI provider and model for generating agents, website proposals, and outreach."
        />

        <form onSubmit={saveAiSettings} className="space-y-4 mt-5">
          {/* Provider select */}
          <div>
            <label className="form-label">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => {
                setAiProvider(e.target.value);
                const firstModel = settings?.providers?.[e.target.value]?.models[0] || '';
                setAiModel(firstModel);
              }}
              className="form-select"
            >
              {settings?.providers &&
                Object.entries(settings.providers).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
            </select>
          </div>

          {/* Model select */}
          <div>
            <label className="form-label">Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="form-select"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="form-label">API Key</label>
            {settings?.aiApiKeySet && (
              <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">
                Current key: <span className="font-mono text-[var(--color-text-secondary)]">{settings.aiApiKeyMasked}</span>
              </p>
            )}
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input
                type={showApiKey ? 'text' : 'password'}
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={settings?.aiApiKeySet ? 'Enter new key to replace' : 'Enter your API key'}
                className="form-input w-full pl-9 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <FeedbackMsg msg={aiMsg} />

          <button
            type="submit"
            disabled={aiSaving}
            className="flex items-center gap-2 px-4 py-2 gradient-primary hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all"
          >
            {aiSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save AI Settings
          </button>
        </form>
      </section>

      {/* ─── Vercel Integration ─────────────────────────────────── */}
      <section className="glass-card p-5">
        <div className="flex items-start justify-between">
          <SectionHeader
            icon={Globe}
            iconBg="bg-white/5"
            iconColor="text-white"
            title="Vercel Integration"
            description="Connect your Vercel account to auto-deploy generated websites and AI agents."
          />
          {settings?.vercelConnected && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          )}
        </div>

        {settings?.vercelConnected ? (
          <div className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-4 py-3 mt-4">
            <span className="text-xs text-[var(--color-text-secondary)]">Vercel account connected. Deployments will be created automatically.</span>
            <button
              onClick={disconnectVercel}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text-secondary)] mb-1">Don't have a Vercel account?</p>
                  <p>
                    <a href="https://vercel.com/signup" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                      Create a free account <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    then generate a token from{' '}
                    <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                      Account Settings → Tokens <ExternalLink className="w-2.5 h-2.5" />
                    </a>.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={connectVercel} className="space-y-3">
              <div>
                <label className="form-label">Vercel Access Token</label>
                <input
                  type="password"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  placeholder="Enter your Vercel personal access token"
                  required
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="form-label">
                  Team ID <span className="text-[var(--color-text-muted)]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={vercelTeamId}
                  onChange={(e) => setVercelTeamId(e.target.value)}
                  placeholder="team_xxxxx (leave empty for personal account)"
                  className="form-input w-full"
                />
              </div>

              <FeedbackMsg msg={vercelMsg} />

              <button
                type="submit"
                disabled={vercelSaving}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white disabled:opacity-50 rounded-lg text-black text-xs font-medium transition-all"
              >
                {vercelSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Connect Vercel
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ─── GitHub Integration ─────────────────────────────────── */}
      <section className="glass-card p-5">
        <div className="flex items-start justify-between">
          <SectionHeader
            icon={Github}
            iconBg="bg-white/5"
            iconColor="text-white"
            title="GitHub Integration"
            description="Connect GitHub to create repos for generated projects and link them with Vercel."
          />
          {settings?.githubConnected && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> @{settings.githubUsername}
            </span>
          )}
        </div>

        {settings?.githubConnected ? (
          <div className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-4 py-3 mt-4">
            <span className="text-xs text-[var(--color-text-secondary)]">
              GitHub connected as <strong className="text-white">@{settings.githubUsername}</strong>.
            </span>
            <button
              onClick={disconnectGithub}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  <p className="font-medium text-[var(--color-text-secondary)] mb-1">Generate a Personal Access Token</p>
                  <p>
                    Go to{' '}
                    <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                      GitHub Token Settings <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    and create a token with <code className="bg-[var(--color-surface-overlay)] px-1 rounded text-indigo-300 text-[10px]">repo</code> scope.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={connectGithub} className="space-y-3">
              <div>
                <label className="form-label">GitHub Personal Access Token</label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  required
                  className="form-input w-full"
                />
              </div>

              <FeedbackMsg msg={githubMsg} />

              <button
                type="submit"
                disabled={githubSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-overlay)] hover:bg-white/[0.06] border border-[var(--color-border)] disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-all"
              >
                {githubSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
                Connect GitHub
              </button>
            </form>
          </div>
        )}
      </section>

      {/* ─── Auto Deploy Toggle ─────────────────────────────────── */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between">
          <SectionHeader
            icon={Rocket}
            iconBg="bg-purple-500/10"
            iconColor="text-purple-400"
            title="Auto-Deploy to Vercel"
            description="Automatically deploy generated AI agents and websites when processing completes."
            inline
          />

          <button
            onClick={() => toggleAutoDeploy(!autoDeployToggle)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
              autoDeployToggle ? 'bg-indigo-600' : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)]'
            }`}
            disabled={!settings?.vercelConnected || !settings?.githubConnected}
            title={
              !settings?.vercelConnected || !settings?.githubConnected
                ? 'Connect both Vercel and GitHub first'
                : ''
            }
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out mt-1 ${
                autoDeployToggle ? 'translate-x-6 ml-0.5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {(!settings?.vercelConnected || !settings?.githubConnected) && (
          <p className="mt-3 text-[11px] text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Connect both Vercel and GitHub to enable auto-deploy.
          </p>
        )}
      </section>

      {/* ─── Categories ────────────────────────────────────────── */}
      <section className="glass-card p-5">
        <SectionHeader
          icon={Tags}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-400"
          title="Categories"
          description="Create categories to organize and filter your leads (e.g., Dentist, Restaurant, Salon)."
        />

        {/* Add new category */}
        <form onSubmit={addCategory} className="flex items-end gap-2 mt-5 mb-4">
          <div className="flex-1">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g., Dentist, Restaurant, Salon"
              className="form-input w-full"
            />
          </div>
          <div>
            <label className="form-label">Color</label>
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="w-10 h-[38px] bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-lg cursor-pointer"
            />
          </div>
          <button
            type="submit"
            disabled={catSaving || !newCatName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white text-xs font-medium transition-colors h-[38px]"
          >
            {catSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </form>

        <FeedbackMsg msg={catMsg} />

        {/* Category list */}
        {categories.length === 0 ? (
          <div className="text-center py-6 text-[var(--color-text-muted)] text-xs">
            No categories yet. Add one above to get started.
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5"
              >
                {editingCat === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={editCatColor}
                      onChange={(e) => setEditCatColor(e.target.value)}
                      className="w-7 h-7 bg-transparent border border-[var(--color-border)] rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditCategory(cat.id)}
                      className="form-input flex-1 py-1.5 text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => saveEditCategory(cat.id)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingCat(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-white font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCat(cat.id);
                          setEditCatName(cat.name);
                          setEditCatColor(cat.color);
                        }}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] rounded-lg hover:bg-white/[0.04] transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1.5 text-[var(--color-text-muted)] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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

// ─── Shared Components ─────────────────────────────────────────

function SectionHeader({ icon: Icon, iconBg, iconColor, title, description, inline }: {
  icon: any; iconBg: string; iconColor: string; title: string; description: string; inline?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeedbackMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <div
      className={`flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg ${
        msg.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border border-red-500/20'
      }`}
    >
      {msg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
      {msg.text}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="space-y-2">
        <div className="skeleton h-5 w-24 rounded" />
        <div className="skeleton h-3 w-56 rounded" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="skeleton w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-3 w-56 rounded" />
            </div>
          </div>
          <div className="skeleton h-10 w-full rounded-lg" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
