import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Stats, Batch, startPolling, startBatchProcessor } from '../lib/api';
import {
  Activity, CheckCircle, Clock, AlertTriangle, Layers, TrendingUp,
  RotateCcw, ArrowRight, Sparkles, Upload, Bot, Globe,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [s, b] = await Promise.all([api.getStats(), api.getBatches()]);
      setStats(s);
      setBatches(b);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const stop = startPolling(fetchData, 5000);
    return stop;
  }, []);

  if (loading) return <DashboardSkeleton />;

  const statCards = stats
    ? [
        { label: 'Total Leads', value: stats.leads.total, icon: Layers, gradient: 'from-blue-500/10 to-blue-600/5', iconColor: 'text-blue-400', iconBg: 'bg-blue-500/10' },
        { label: 'Completed', value: stats.leads.completed, icon: CheckCircle, gradient: 'from-emerald-500/10 to-emerald-600/5', iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
        { label: 'In Progress', value: stats.leads.inProgress, icon: Activity, gradient: 'from-amber-500/10 to-amber-600/5', iconColor: 'text-amber-400', iconBg: 'bg-amber-500/10' },
        { label: 'Failed', value: stats.leads.failed, icon: AlertTriangle, gradient: 'from-red-500/10 to-red-600/5', iconColor: 'text-red-400', iconBg: 'bg-red-500/10' },
        { label: 'Queued Jobs', value: stats.jobs.queued, icon: Clock, gradient: 'from-purple-500/10 to-purple-600/5', iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10' },
        { label: 'Active Jobs', value: stats.jobs.active, icon: TrendingUp, gradient: 'from-indigo-500/10 to-indigo-600/5', iconColor: 'text-indigo-400', iconBg: 'bg-indigo-500/10' },
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">Track your lead pipeline and processing status</p>
        </div>
        <Link
          to="/import"
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
        >
          <Upload className="w-4 h-4" />
          Import Leads
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, icon: Icon, gradient, iconColor, iconBg }, i) => (
          <div
            key={label}
            className={`glass-card p-4 bg-gradient-to-br ${gradient} animate-fade-in`}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Batches */}
      <div className="glass-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Recent Batches</h2>
          </div>
          <Link to="/import" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            View All
          </Link>
        </div>

        {batches.length === 0 ? (
          <EmptyBatches />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {batches.slice(0, 10).map((batch, i) => (
              <BatchRow key={batch.id} batch={batch} onRetried={fetchData} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Batch Row ───────────────────────────────────────────────── */
function BatchRow({ batch, onRetried, index }: { batch: Batch; onRetried: () => void; index: number }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRetrying(true);
    try {
      await api.retryBatch(batch.id);
      startBatchProcessor(batch.id, onRetried, 2000);
      onRetried();
    } catch (err) {
      console.error(err);
    } finally {
      setRetrying(false);
    }
  };

  const percent = batch.totalLeads > 0
    ? Math.round(((batch.completed + batch.failed) / batch.totalLeads) * 100)
    : 0;

  return (
    <Link
      to={`/batches/${batch.id}`}
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors animate-fade-in"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        batch.solutionType === 'AI_AGENT' ? 'bg-purple-500/10' : 'bg-blue-500/10'
      }`}>
        {batch.solutionType === 'AI_AGENT'
          ? <Bot className="w-4 h-4 text-purple-400" />
          : <Globe className="w-4 h-4 text-blue-400" />
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{batch.name || 'Unnamed Batch'}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {batch.solutionType === 'AI_AGENT' ? 'AI Agent' : 'Website'} · {batch.totalLeads} leads
        </p>
      </div>

      {/* Progress mini-bar */}
      <div className="hidden md:flex items-center gap-3 w-32">
        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background: batch.failed > 0 && batch.completed === 0
                ? 'var(--color-error)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>
        <span className="text-[11px] text-[var(--color-text-muted)] tabular-nums w-8 text-right">{percent}%</span>
      </div>

      {/* Retry button */}
      {batch.failed > 0 && (
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 disabled:opacity-50 transition-colors"
        >
          <RotateCcw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          {retrying ? 'Retrying' : `Retry ${batch.failed}`}
        </button>
      )}

      {/* Status */}
      <StatusBadge status={batch.status} />
      <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
    </Link>
  );
}

/* ─── Empty State ─────────────────────────────────────────────── */
function EmptyBatches() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
        <Layers className="w-7 h-7 text-indigo-400" />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">No batches yet</h3>
      <p className="text-xs text-[var(--color-text-muted)] mb-4 max-w-xs">
        Import businesses from maps or upload a CSV to create your first batch.
      </p>
      <Link
        to="/import"
        className="flex items-center gap-2 px-4 py-2 gradient-primary text-white text-xs font-medium rounded-lg shadow-lg shadow-indigo-500/20"
      >
        <Upload className="w-3.5 h-3.5" />
        Import Leads
      </Link>
    </div>
  );
}

/* ─── Loading Skeleton ────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-7 w-36 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="skeleton w-8 h-8 rounded-lg mb-3" />
            <div className="skeleton h-7 w-12 mb-1" />
            <div className="skeleton h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="glass-card">
        <div className="px-5 py-4 border-b border-[var(--color-border)]">
          <div className="skeleton h-4 w-32" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="skeleton w-9 h-9 rounded-xl" />
            <div className="flex-1">
              <div className="skeleton h-4 w-40 mb-1" />
              <div className="skeleton h-3 w-24" />
            </div>
            <div className="skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string }> = {
    PENDING: { bg: 'bg-white/[0.04]', text: 'text-[var(--color-text-muted)]', dot: 'bg-gray-500' },
    PROCESSING: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  };
  const c = config[status] || config.PENDING;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'PROCESSING' ? 'status-dot-active' : ''}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
