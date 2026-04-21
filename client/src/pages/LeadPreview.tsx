import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Lead, Enrichment, Deliverable, OutreachMessage, Deployment, startPolling } from '../lib/api';
import {
  ArrowLeft, Bot, Globe, Mail, BarChart3, Target, AlertCircle,
  Lightbulb, Users, Wrench, BookOpen, MessageSquare, CheckCircle,
  MapPin, Phone, Star, Copy, CheckCheck, Rocket, ExternalLink, Github,
  Lock, Sparkles, AlertTriangle, FileCode, FolderOpen, ChevronRight, ChevronDown,
} from 'lucide-react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../components/Modal';
import RevisionChat from '../components/RevisionChat';

export default function LeadPreview() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [outreach, setOutreach] = useState<OutreachMessage | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [activeTab, setActiveTab] = useState<'insights' | 'solution' | 'app' | 'outreach'>('insights');
  const [loading, setLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [planUsage, setPlanUsage] = useState<{ plan: string; canDeploy: boolean; deploymentCount: number; maxDeployments: number } | null>(null);

  const fetchData = async () => {
    if (!id) return;
    try {
      const data = await api.getLeadPreview(id);
      setLead(data.lead as Lead);
      setEnrichment(data.enrichment);
      setDeliverables(data.deliverables);
      setOutreach(data.outreach);
      setDeployment(data.deployment);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const stop = startPolling(fetchData, 4000);
    return stop;
  }, [id]);

  useEffect(() => {
    api.getPlanUsage().then(setPlanUsage).catch(() => {});
  }, []);

  if (loading) return <LeadPreviewSkeleton />;
  if (!lead) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle className="w-8 h-8 text-[var(--color-error)]" />
      <p className="text-sm text-[var(--color-text-secondary)]">Lead not found</p>
      <Link to="/dashboard/leads" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">← Back to leads</Link>
    </div>
  );

  const hasGeneratedApp = deliverables.some(d => d.type === 'AI_AGENT_APP' || d.type === 'WEBSITE_APP');

  const tabs = [
    { key: 'insights', label: 'Business Insights', icon: BarChart3 },
    { key: 'solution', label: lead.solutionType === 'AI_AGENT' ? 'AI Agent Spec' : 'Website Proposal', icon: lead.solutionType === 'AI_AGENT' ? Bot : Globe },
    ...(hasGeneratedApp ? [{ key: 'app', label: 'Generated App', icon: Rocket }] : []),
    { key: 'outreach', label: 'Outreach Email', icon: Mail },
  ] as const;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header Card */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <Link to="/dashboard/leads" className="p-2 rounded-lg bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] hover:text-white hover:bg-white/[0.06] transition-all mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-lg font-bold text-white truncate">{lead.businessName}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
              {lead.category && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[11px] font-medium">{lead.category}</span>
              )}
              {lead.address && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.address}</span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors">
                  <Globe className="w-3 h-3" />{new URL(lead.website).hostname}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Banner */}
      {deployment && <DeploymentBanner deployment={deployment} />}

      {/* Deployment Skipped Banner — show when lead is completed but no deployment exists */}
      {!deployment && lead.status === 'COMPLETED' && planUsage && (
        <div
          className="glass-card p-4 border-l-2 border-l-amber-500 cursor-pointer hover:bg-white/[0.02] transition-colors"
          onClick={() => {
            if (planUsage.plan === 'free' && !planUsage.canDeploy) setShowLimitModal(true);
            else setShowIntegrationModal(true);
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-300">Deployment Skipped</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {planUsage.plan === 'free' && !planUsage.canDeploy
                  ? 'Free plan deployment limit reached. Click to learn more.'
                  : 'Vercel & GitHub integration required for auto-deploy. Click to configure.'}
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Plan Limit Modal */}
      <Modal open={showLimitModal} onClose={() => setShowLimitModal(false)}>
        <ModalHeader
          icon={<Lock className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
          title="Deployment Limit Reached"
          subtitle="Free plan allows 1 deployment"
        />
        <ModalBody>
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--color-text-muted)]">Deployments Used</span>
                <span className="text-xs font-bold text-white">{planUsage?.deploymentCount ?? 0} / {planUsage?.maxDeployments ?? 1}</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-full rounded-full bg-amber-500" />
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Your solution was generated successfully but couldn't be auto-deployed. Upgrade to <span className="text-indigo-400 font-medium">Pro</span> for unlimited deployments.
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
          <button onClick={() => setShowLimitModal(false)} className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-white transition-colors">
            Maybe Later
          </button>
          <button onClick={() => setShowLimitModal(false)} className="px-5 py-2 gradient-primary text-white text-xs font-medium rounded-xl hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-opacity">
            Upgrade to Pro — $29/mo
          </button>
        </ModalFooter>
      </Modal>

      {/* Missing Integration Modal */}
      <Modal open={showIntegrationModal} onClose={() => setShowIntegrationModal(false)}>
        <ModalHeader
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          iconBg="bg-amber-500/10"
          title="Integrations Required"
          subtitle="Connect Vercel & GitHub for auto-deploy"
        />
        <ModalBody>
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Your solution was generated but not deployed. Connect your <span className="text-white font-medium">Vercel</span> and <span className="text-white font-medium">GitHub</span> accounts to enable auto-deployment.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
                <Globe className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-secondary)] flex-1">Vercel Token</span>
                <span className="text-[11px] text-amber-400 font-medium">Not connected</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
                <Github className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-secondary)] flex-1">GitHub Token</span>
                <span className="text-[11px] text-amber-400 font-medium">Not connected</span>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button onClick={() => setShowIntegrationModal(false)} className="px-4 py-2 text-xs text-[var(--color-text-muted)] hover:text-white transition-colors">
            Skip for Now
          </button>
          <Link
            to="/dashboard/settings"
            onClick={() => setShowIntegrationModal(false)}
            className="px-5 py-2 gradient-primary text-white text-xs font-medium rounded-xl hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-opacity inline-flex items-center gap-1.5"
          >
            Go to Settings
          </Link>
        </ModalFooter>
      </Modal>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--color-surface-raised)] p-1 rounded-xl border border-[var(--color-border)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
              activeTab === key
                ? 'bg-[var(--color-primary-muted)] text-indigo-400 shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.02]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'insights' && <InsightsPanel enrichment={enrichment} />}
        {activeTab === 'solution' && <SolutionPanel deliverables={deliverables} solutionType={lead.solutionType} />}
        {activeTab === 'app' && <GeneratedAppPanel deliverables={deliverables} deployment={deployment} leadId={lead.id} onUpdate={fetchData} planUsage={planUsage} onShowLimitModal={() => setShowLimitModal(true)} onShowIntegrationModal={() => setShowIntegrationModal(true)} solutionType={lead.solutionType as 'AI_AGENT' | 'WEBSITE' | null} isCompleted={lead.status === 'COMPLETED'} />}
        {activeTab === 'outreach' && <OutreachPanel outreach={outreach} deployment={deployment} leadId={lead.id} onUpdate={fetchData} />}
      </div>


    </div>
  );
}

function DeploymentBanner({ deployment }: { deployment: Deployment }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    PENDING: { bg: 'bg-[var(--color-surface-overlay)]', text: 'text-[var(--color-text-muted)]', label: 'Pending', dot: 'bg-gray-400' },
    DEPLOYING: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Deploying...', dot: 'bg-blue-400 animate-pulse' },
    DEPLOYED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Deployed', dot: 'bg-emerald-400' },
    FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Failed', dot: 'bg-red-400' },
  };
  const s = statusConfig[deployment.status] || statusConfig.PENDING;

  return (
    <div className={`glass-card p-4 border-l-2 ${deployment.status === 'DEPLOYED' ? 'border-l-emerald-500' : deployment.status === 'FAILED' ? 'border-l-red-500' : 'border-l-indigo-500'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 shrink-0">
            <Rocket className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-white">Auto-Deployment</p>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${s.bg} ${s.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {s.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{deployment.projectName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          {deployment.repoUrl && (
            <a
              href={deployment.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Github className="w-3.5 h-3.5" /> Repo
            </a>
          )}
          {deployment.deployUrl && (
            <a
              href={deployment.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Live Preview
            </a>
          )}
        </div>
      </div>
      {deployment.status === 'FAILED' && deployment.errorMsg && (
        <p className="mt-2 text-[11px] text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2">{deployment.errorMsg}</p>
      )}
    </div>
  );
}

function InsightsPanel({ enrichment }: { enrichment: Enrichment | null }) {
  if (!enrichment) {
    return <EmptyState message="Enrichment data not yet available. Processing may still be in progress." />;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card title="Business Summary" icon={BookOpen}>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{enrichment.businessSummary || 'N/A'}</p>
      </Card>

      {/* Score */}
      <Card title="Digital Presence Score" icon={BarChart3}>
        <div className="flex items-center gap-5">
          <div className="relative w-[72px] h-[72px] shrink-0">
            <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none" stroke="var(--color-surface-overlay)" strokeWidth="3" />
              <path d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={getScoreColor(enrichment.digitalPresenceScore || 0)}
                strokeWidth="3"
                strokeDasharray={`${enrichment.digitalPresenceScore}, 100`}
                strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-white">
              {enrichment.digitalPresenceScore}
            </span>
          </div>
          <div className="space-y-1.5">
            <InfoRow label="Maturity" value={enrichment.maturityLevel || 'N/A'} />
            <InfoRow label="Decision Maker" value={enrichment.decisionMakerRole || 'N/A'} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Services */}
        <Card title="Services Offered" icon={Wrench}>
          <div className="flex flex-wrap gap-1.5">
            {enrichment.services.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-full text-[11px] text-[var(--color-text-secondary)]">{s}</span>
            ))}
          </div>
        </Card>

        {/* Target Audience */}
        <Card title="Target Audience" icon={Users}>
          <p className="text-sm text-[var(--color-text-secondary)]">{enrichment.targetAudience || 'N/A'}</p>
        </Card>

        {/* Pain Points */}
        <Card title="Pain Points" icon={AlertCircle}>
          <ul className="space-y-1.5">
            {enrichment.painPoints.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-red-300/80">
                <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </Card>

        {/* Opportunities */}
        <Card title="Opportunities" icon={Lightbulb}>
          <ul className="space-y-1.5">
            {enrichment.opportunities.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-emerald-300/80">
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" /> {o}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SolutionPanel({ deliverables, solutionType }: { deliverables: Deliverable[]; solutionType: string | null }) {
  const deliverable = deliverables[0];

  if (!deliverable) {
    return <EmptyState message="Solution not yet generated. Processing may still be in progress." />;
  }

  const content = deliverable.content as Record<string, any>;

  if (solutionType === 'AI_AGENT') {
    return <AIAgentView content={content} />;
  }
  return <WebsiteView content={content} />;
}

function AIAgentView({ content }: { content: Record<string, any> }) {
  return (
    <div className="space-y-4">
      <Card title={content.agentName || 'AI Agent'} icon={Bot}>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[11px] font-medium">{content.agentType}</span>
        </div>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{content.overview}</p>
      </Card>

      {content.capabilities && (
        <Card title="Capabilities" icon={Wrench}>
          <div className="space-y-3">
            {content.capabilities.map((cap: any, i: number) => (
              <div key={i} className="border-l-2 border-indigo-500/30 pl-3 py-0.5">
                <p className="text-xs font-medium text-white">{cap.name}</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{cap.description}</p>
                <p className="text-[11px] text-indigo-400/80 mt-0.5">Impact: {cap.businessImpact}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {content.sampleDialogues && (
        <Card title="Sample Dialogues" icon={MessageSquare}>
          <div className="space-y-4">
            {content.sampleDialogues.map((d: any, i: number) => (
              <div key={i}>
                <p className="text-[11px] text-[var(--color-text-muted)] mb-2 font-medium">{d.scenario}</p>
                <div className="space-y-1.5">
                  {d.conversation?.map((msg: any, j: number) => (
                    <div key={j} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${
                        msg.role === 'user'
                          ? 'bg-indigo-600/80 text-white rounded-br-sm'
                          : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-bl-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {content.roi && (
        <Card title="ROI Analysis" icon={Target}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <MetricBox label="Time Saved" value={content.roi.timeSaved} color="emerald" />
            <MetricBox label="Lead Increase" value={content.roi.leadIncrease} color="blue" />
            <MetricBox label="Cost Reduction" value={content.roi.costReduction} color="purple" />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">{content.roi.summary}</p>
        </Card>
      )}
    </div>
  );
}

function WebsiteView({ content }: { content: Record<string, any> }) {
  return (
    <div className="space-y-4">
      <Card title={content.proposalTitle || 'Website Proposal'} icon={Globe}>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{content.executiveSummary}</p>
      </Card>

      {content.currentSiteAudit && (
        <Card title="Current Site Audit" icon={BarChart3}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-white">{content.currentSiteAudit.overallScore}/100</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${content.currentSiteAudit.overallScore > 60 ? 'bg-emerald-500/10 text-emerald-400' : content.currentSiteAudit.overallScore > 30 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
              {content.currentSiteAudit.overallScore > 60 ? 'Good' : content.currentSiteAudit.overallScore > 30 ? 'Needs Work' : 'Poor'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <IssueList title="UX Issues" items={content.currentSiteAudit.uxIssues} color="text-red-300/80" />
            <IssueList title="SEO Gaps" items={content.currentSiteAudit.seoGaps} color="text-orange-300/80" />
            <IssueList title="Performance" items={content.currentSiteAudit.performanceIssues} color="text-amber-300/80" />
            <IssueList title="Positives" items={content.currentSiteAudit.positives} color="text-emerald-300/80" />
          </div>
        </Card>
      )}

      {content.designRecommendations && (
        <Card title="Design Recommendations" icon={Lightbulb}>
          <div className="space-y-2 text-xs">
            <InfoRow label="Style" value={content.designRecommendations.style} />
            <InfoRow label="Colors" value={content.designRecommendations.colorPalette} />
            <InfoRow label="Typography" value={content.designRecommendations.typography} />
            {content.designRecommendations.keyFeatures && (
              <div className="pt-1">
                <p className="text-[var(--color-text-muted)] mb-1.5 text-[11px] font-medium">Key Features</p>
                <ul className="space-y-1">
                  {content.designRecommendations.keyFeatures.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-[var(--color-text-secondary)]">
                      <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {content.roi && (
        <Card title="Expected ROI" icon={Target}>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <MetricBox label="Traffic Increase" value={content.roi.trafficIncrease} color="blue" />
            <MetricBox label="Conversion Improvement" value={content.roi.conversionImprovement} color="emerald" />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">{content.roi.summary}</p>
        </Card>
      )}
    </div>
  );
}

function GeneratedAppPanel({ deliverables, deployment, leadId, onUpdate, planUsage, onShowLimitModal, onShowIntegrationModal, solutionType, isCompleted }: { deliverables: Deliverable[]; deployment: Deployment | null; leadId: string; onUpdate: () => void; planUsage: { plan: string; canDeploy: boolean; deploymentCount: number; maxDeployments: number } | null; onShowLimitModal: () => void; onShowIntegrationModal: () => void; solutionType: 'AI_AGENT' | 'WEBSITE' | null; isCompleted: boolean }) {
  const appDeliverable = deliverables.find(d => d.type === 'AI_AGENT_APP' || d.type === 'WEBSITE_APP');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'src/app']));
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlAdded, setUrlAdded] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!appDeliverable) {
    return <EmptyState message="Application code not yet generated. Processing may still be in progress." />;
  }

  const files: Record<string, string> = appDeliverable.content.files || {};
  const fileNames = Object.keys(files).sort();
  const isAgent = appDeliverable.type === 'AI_AGENT_APP';

  // Build folder tree
  const tree = buildFileTree(fileNames);

  const handleDeploy = async () => {
    if (!planUsage) return;
    if (planUsage.plan === 'free' && !planUsage.canDeploy) { onShowLimitModal(); return; }
    setDeploying(true);
    setDeployError(null);
    try {
      await api.deployLead(leadId);
      onUpdate();
    } catch (err: any) {
      if (err.message?.includes('not connected')) {
        onShowIntegrationModal();
      } else {
        setDeployError(err.message || 'Deployment failed');
      }
    } finally {
      setDeploying(false);
    }
  };

  const handleAddUrlToEmail = async () => {
    if (!deployment?.deployUrl) return;
    setAddingUrl(true);
    try {
      await api.addUrlToOutreach(leadId, deployment.deployUrl);
      setUrlAdded(true);
      onUpdate();
      setTimeout(() => setUrlAdded(false), 3000);
    } catch {
      // silently fail
    } finally {
      setAddingUrl(false);
    }
  };

  function toggleFolder(path: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function getFileIcon(name: string) {
    if (name.endsWith('.tsx') || name.endsWith('.ts')) return 'text-blue-400';
    if (name.endsWith('.css')) return 'text-purple-400';
    if (name.endsWith('.json')) return 'text-amber-400';
    if (name.endsWith('.js')) return 'text-yellow-400';
    return 'text-[var(--color-text-muted)]';
  }

  function renderTree(nodes: FileNode[], depth = 0): React.ReactNode {
    return nodes.map(node => {
      if (node.children) {
        const isOpen = expandedFolders.has(node.path);
        return (
          <div key={node.path}>
            <button
              onClick={() => toggleFolder(node.path)}
              className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-white/[0.04] rounded transition-colors"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isOpen ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>{node.name}</span>
            </button>
            {isOpen && renderTree(node.children, depth + 1)}
          </div>
        );
      }
      return (
        <button
          key={node.path}
          onClick={() => setSelectedFile(node.path)}
          className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs rounded transition-colors ${
            selectedFile === node.path
              ? 'bg-indigo-500/10 text-indigo-400'
              : 'text-[var(--color-text-muted)] hover:bg-white/[0.04] hover:text-[var(--color-text-secondary)]'
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <FileCode className={`w-3.5 h-3.5 shrink-0 ${getFileIcon(node.name)}`} />
          <span className="truncate">{node.name}</span>
        </button>
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10">
            <Rocket className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h3 className="text-xs font-semibold text-white">
            {isAgent ? 'AI Agent Application' : 'Business Website'}
          </h3>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium">
            Next.js
          </span>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mb-3">{appDeliverable.summary}</p>
        <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-muted)]">
          <span>{appDeliverable.content.fileCount} files</span>
          <span>{formatBytes(appDeliverable.content.totalSize)}</span>
          <span>Framework: {appDeliverable.content.framework}</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Deploy button — show when not yet deployed */}
          {(!deployment || deployment.status === 'FAILED') && (
            <button
              onClick={handleDeploy}
              disabled={deploying}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              {deploying ? 'Deploying...' : 'Deploy to Vercel'}
            </button>
          )}

          {/* Deploying spinner */}
          {deployment?.status === 'DEPLOYING' && (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium">
              <Rocket className="w-3.5 h-3.5 animate-pulse" /> Deploying...
            </span>
          )}

          {/* Open Website — show when deployed */}
          {deployment?.status === 'DEPLOYED' && deployment.deployUrl && (
            <a
              href={deployment.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-white text-xs font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Website
            </a>
          )}

          {/* GitHub Repo */}
          {deployment?.status === 'DEPLOYED' && deployment.repoUrl && (
            <a
              href={deployment.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06] transition-all"
            >
              <Github className="w-3.5 h-3.5" /> Repo
            </a>
          )}

          {/* Add URL to Email — show when deployed */}
          {deployment?.status === 'DEPLOYED' && deployment.deployUrl && (
            <button
              onClick={handleAddUrlToEmail}
              disabled={addingUrl}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                urlAdded
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06]'
              } disabled:opacity-50`}
            >
              <Mail className="w-3.5 h-3.5" />
              {urlAdded ? 'URL Added to Email!' : addingUrl ? 'Adding...' : 'Add URL to Email'}
            </button>
          )}

          {/* Revise Code — toggle chat */}
          {isCompleted && (
            <button
              onClick={() => setShowChat(!showChat)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: showChat ? '#818cf8' : '#e2e8f0',
                backgroundColor: showChat ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                border: showChat ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer',
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Revise</span>
            </button>
          )}
        </div>

        {/* Deploy URL display */}
        {deployment?.status === 'DEPLOYED' && deployment.deployUrl && (
          <div className="mt-3 flex items-center gap-2">
            <a
              href={deployment.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors truncate"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              {deployment.deployUrl.replace('https://', '')}
            </a>
            <CopyButton text={deployment.deployUrl} />
          </div>
        )}

        {/* Deploy Error */}
        {deployError && (
          <p className="mt-2 text-[11px] text-red-400/80 bg-red-500/5 rounded-lg px-3 py-2">{deployError}</p>
        )}
      </div>

      {/* Revision Chat — toggled by Revise button */}
      {showChat && (
        <RevisionChat
          leadId={leadId}
          solutionType={solutionType}
          isCompleted={isCompleted}
          onRevisionApplied={onUpdate}
          defaultExpanded
        />
      )}

      {/* File Explorer + Code Viewer */}
      <div className="glass-card overflow-hidden">
        <div className="flex flex-col lg:flex-row" style={{ minHeight: '400px' }}>
          {/* File Tree */}
          <div className="lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] overflow-y-auto" style={{ maxHeight: '500px' }}>
            <div className="p-2 border-b border-[var(--color-border)]">
              <p className="text-[11px] font-medium text-[var(--color-text-muted)] px-2">PROJECT FILES</p>
            </div>
            <div className="py-1">
              {renderTree(tree)}
            </div>
          </div>

          {/* Code Viewer */}
          <div className="flex-1 overflow-auto" style={{ maxHeight: '500px' }}>
            {selectedFile ? (
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
                  <p className="text-[11px] font-medium text-[var(--color-text-secondary)]">{selectedFile}</p>
                  <CopyButton text={files[selectedFile]} />
                </div>
                <pre className="p-4 text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap font-mono">
                  {files[selectedFile]}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-xs">
                Select a file to view its contents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FileNode {
  name: string;
  path: string;
  children?: FileNode[];
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];
  
  for (const filePath of paths) {
    const parts = filePath.split('/');
    let current = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      let existing = current.find(n => n.name === part);
      if (!existing) {
        existing = { name: part, path: currentPath, ...(isFile ? {} : { children: [] }) };
        current.push(existing);
      }
      if (!isFile && existing.children) {
        current = existing.children;
      }
    }
  }

  return root;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
        copied ? 'text-emerald-400' : 'text-[var(--color-text-muted)] hover:text-white'
      }`}
    >
      {copied ? <><CheckCheck className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function OutreachPanel({ outreach, deployment, leadId, onUpdate }: { outreach: OutreachMessage | null; deployment: Deployment | null; leadId: string; onUpdate: () => void }) {
  const [copied, setCopied] = useState(false);
  const [addingUrl, setAddingUrl] = useState(false);
  const [urlAdded, setUrlAdded] = useState(false);

  if (!outreach) {
    return <EmptyState message="Outreach message not yet generated." />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${outreach.subject}\n\n${outreach.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddUrl = async () => {
    if (!deployment?.deployUrl) return;
    setAddingUrl(true);
    try {
      await api.addUrlToOutreach(leadId, deployment.deployUrl);
      setUrlAdded(true);
      onUpdate();
      setTimeout(() => setUrlAdded(false), 3000);
    } catch {
      // silently fail
    } finally {
      setAddingUrl(false);
    }
  };

  const hasDeployUrl = deployment?.status === 'DEPLOYED' && deployment.deployUrl;
  const emailAlreadyHasUrl = hasDeployUrl && outreach.body.includes(deployment!.deployUrl!);

  return (
    <div className="max-w-2xl">
      <Card title="Outreach Email" icon={Mail}>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1 font-medium">Subject</p>
            <p className="text-sm text-white font-medium">{outreach.subject}</p>
          </div>
          {outreach.toEmail && (
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-1 font-medium">To</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{outreach.toName} &lt;{outreach.toEmail}&gt;</p>
            </div>
          )}
          <div>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5 font-medium">Body</p>
            <div className="bg-[var(--color-surface-overlay)] border border-[var(--color-border)] rounded-xl p-4 whitespace-pre-wrap text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {outreach.body}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'gradient-primary text-white hover:shadow-lg hover:shadow-indigo-500/20'
              }`}
            >
              {copied ? <><CheckCheck className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy to Clipboard</>}
            </button>

            {/* Add URL to Email button — show when deployed and URL not already in email */}
            {hasDeployUrl && !emailAlreadyHasUrl && (
              <button
                onClick={handleAddUrl}
                disabled={addingUrl}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  urlAdded
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.06]'
                } disabled:opacity-50`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {urlAdded ? 'URL Added!' : addingUrl ? 'Adding...' : 'Add Live URL to Email'}
              </button>
            )}

            {/* Already has URL indicator */}
            {hasDeployUrl && emailAlreadyHasUrl && (
              <span className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Live URL included
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Shared Components ─────────────────────────────────────────
function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-indigo-500/10">
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <h3 className="text-xs font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-card p-10 text-center">
      <div className="w-10 h-10 rounded-full bg-[var(--color-surface-overlay)] flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-5 h-5 text-[var(--color-text-muted)]" />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  return (
    <div className={`rounded-xl p-3 text-center ${colors[color] || colors.blue}`}>
      <p className="text-[10px] text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="text-xs font-semibold">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {label}: <span className="text-white font-medium">{value}</span>
    </p>
  );
}

function IssueList({ title, items, color }: { title: string; items?: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] text-[var(--color-text-muted)] mb-1 font-medium">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className={`text-[11px] ${color} flex items-start gap-1.5`}>
            <span className="w-1 h-1 rounded-full bg-current mt-1.5 shrink-0" /> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border-[var(--color-border)]',
    ENRICHING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    PROCESSING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}

function LeadPreviewSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="skeleton w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-5 w-48 rounded" />
            <div className="skeleton h-3 w-72 rounded" />
          </div>
        </div>
      </div>
      <div className="skeleton h-12 rounded-xl" />
      <div className="glass-card p-4 space-y-3">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-16 w-full rounded" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 space-y-3">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-12 w-full rounded" />
        </div>
        <div className="glass-card p-4 space-y-3">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-12 w-full rounded" />
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}
