import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, startPolling, startBatchProcessor } from '../lib/api';
import { Play, ArrowLeft, CheckCircle, Clock, Loader, AlertTriangle, RotateCcw, Bot, Globe, ArrowRight, Lock, Rocket, Sparkles } from 'lucide-react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';

interface BatchDetail {
  id: string;
  name: string;
  solutionType: 'AI_AGENT' | 'WEBSITE';
  totalLeads: number;
  completed: number;
  failed: number;
  inProgress: number;
  status: string;
  leads: { id: string; businessName: string; status: string }[];
}

interface Progress {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  progressPercent: number;
}

export default function BatchView() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [b, p] = await Promise.all([api.getBatch(id), api.getBatchProgress(id)]);
      setBatch(b);
      setProgress(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const stop = startPolling(fetchData, 3000);
    return stop;
  }, [id]);

  const handleStart = async () => {
    if (!id) return;
    setStarting(true);
    setPlanError(null);
    try {
      await api.startBatch(id);
      const stopProcessor = startBatchProcessor(id, fetchData, 2000);
      (window as any).__batchProcessor = stopProcessor;
      await fetchData();
    } catch (err: any) {
      if (err.message?.includes('Free plan limit') || err.message?.includes('PLAN_LIMIT_REACHED')) {
        setPlanError(err.message);
        setShowLimitModal(true);
      } else {
        console.error(err);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    setPlanError(null);
    try {
      await api.retryBatch(id);
      const stopProcessor = startBatchProcessor(id, fetchData, 2000);
      (window as any).__batchProcessor = stopProcessor;
      await fetchData();
    } catch (err: any) {
      if (err.message?.includes('Free plan limit') || err.message?.includes('PLAN_LIMIT_REACHED')) {
        setPlanError(err.message);
        setShowLimitModal(true);
      } else {
        console.error(err);
      }
    } finally {
      setRetrying(false);
    }
  };

  if (loading) return <BatchSkeleton />;
  if (!batch) return <div className="text-red-400 text-center py-16">Batch not found</div>;

  const percent = progress?.progressPercent ?? 0;
  const isProcessing = ['PROCESSING', 'ENRICHING'].includes(batch.status);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 mb-6">
        <Link to="/dashboard" className="p-2 rounded-xl hover:bg-white/[0.04] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </Link>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          batch.solutionType === 'AI_AGENT' ? 'bg-purple-500/10' : 'bg-blue-500/10'
        }`}>
          {batch.solutionType === 'AI_AGENT'
            ? <Bot className="w-5 h-5 text-purple-400" />
            : <Globe className="w-5 h-5 text-blue-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{batch.name || 'Unnamed Batch'}</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {batch.solutionType === 'AI_AGENT' ? 'AI Agent' : 'Website'} · {batch.totalLeads} leads
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          {batch.status === 'PENDING' && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center gap-2 px-5 py-2.5 gradient-primary text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg shadow-indigo-500/20 text-sm flex-1 sm:flex-initial justify-center"
            >
              <Play className="w-4 h-4" />
              {starting ? 'Starting...' : 'Start Processing'}
            </button>
          )}
          {(progress?.failed ?? 0) > 0 && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 font-medium rounded-xl hover:bg-red-500/20 disabled:opacity-50 transition-colors text-sm flex-1 sm:flex-initial justify-center"
            >
              <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying...' : `Retry Failed (${progress?.failed})`}
            </button>
          )}
        </div>
      </div>

      {/* Plan limit warning */}
      {planError && (
        <div className="mb-5 p-4 rounded-xl border bg-amber-500/[0.06] border-amber-500/20 animate-fade-in cursor-pointer" onClick={() => setShowLimitModal(true)}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-amber-500/15">
              <Lock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-300">Free Plan Limit Reached</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                You've used your free plan quota. Click to learn more.
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
          </div>
        </div>
      )}

      {/* Plan Limit Modal */}
      <Modal open={showLimitModal} onClose={() => setShowLimitModal(false)}>
        <ModalHeader
          icon={<Lock className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
          title="Free Plan Limit Reached"
          subtitle="You've reached your free plan quota"
        />
        <ModalBody>
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-text-muted)]">Solutions Created</span>
                <span className="text-xs font-bold text-white">1 / 1</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-full rounded-full bg-amber-500" />
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              The <span className="text-white font-medium">Free plan</span> allows you to create and deploy <span className="text-white font-medium">1 AI Agent or Website solution</span>. Upgrade to <span className="text-indigo-400 font-medium">Pro</span> for unlimited leads, deployments, and premium AI models.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 text-center">
                <Rocket className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-[var(--color-text-muted)]">Unlimited Deploys</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 text-center">
                <Sparkles className="w-4 h-4 text-indigo-400 mx-auto mb-1.5" />
                <p className="text-[11px] text-[var(--color-text-muted)]">Premium AI</p>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setShowLimitModal(false)}
            className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-white transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => setShowLimitModal(false)}
            className="px-5 py-2 gradient-primary text-white text-xs font-medium rounded-xl hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-opacity"
          >
            Upgrade to Pro — $29/mo
          </button>
        </ModalFooter>
      </Modal>

      {/* Progress Card */}
      <div className="glass-card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">
            {progress?.completed ?? 0} / {progress?.total ?? 0} completed
            {(progress?.failed ?? 0) > 0 && <span className="text-red-400 ml-2">· {progress?.failed} failed</span>}
          </p>
          <span className={`text-sm font-bold tabular-nums ${percent === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>{percent}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 bg-white/[0.04] rounded-full overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${percent}%`,
              background: percent === 100
                ? 'linear-gradient(90deg, #22c55e, #10b981)'
                : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: 'Pending', value: progress?.pending ?? 0, color: 'text-[var(--color-text-muted)]' },
            { icon: Loader, label: 'In Progress', value: batch.inProgress, color: 'text-amber-400' },
            { icon: CheckCircle, label: 'Completed', value: progress?.completed ?? 0, color: 'text-emerald-400' },
            { icon: AlertTriangle, label: 'Failed', value: progress?.failed ?? 0, color: 'text-red-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/[0.02] rounded-xl p-3 text-center">
              <Icon className={`w-3.5 h-3.5 ${color} mx-auto mb-1`} />
              <p className="text-lg font-bold text-white tabular-nums">{value}</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="glass-card">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-white">Leads in this Batch</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          {batch.leads.map((lead, i) => (
            <Link
              key={lead.id}
              to={`/dashboard/leads/${lead.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors animate-fade-in"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[11px] text-[var(--color-text-muted)] font-medium tabular-nums">
                {i + 1}
              </div>
              <p className="flex-1 text-sm font-medium text-white truncate">{lead.businessName}</p>
              <div className="flex items-center gap-2">
                {lead.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                {['ENRICHING', 'PROCESSING'].includes(lead.status) && <Loader className="w-4 h-4 text-amber-400 animate-spin" />}
                {lead.status === 'FAILED' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                {lead.status === 'PENDING' && <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />}
                <span className="text-[11px] text-[var(--color-text-muted)] w-20 text-right">
                  {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function BatchSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="flex-1">
          <div className="skeleton h-6 w-48 mb-1" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-32 mb-3" />
        <div className="skeleton h-2.5 w-full rounded-full mb-4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="glass-card">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)]">
          <div className="skeleton h-4 w-32" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <div className="skeleton w-7 h-7 rounded-lg" />
            <div className="skeleton h-4 w-40 flex-1" />
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
