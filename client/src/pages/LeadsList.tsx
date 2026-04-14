import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Lead, Category, startPolling } from '../lib/api';
import { CheckCircle, Clock, Loader, AlertTriangle, Search, Tags, ChevronLeft, ChevronRight, Users } from 'lucide-react';

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const result = await api.getLeads(params);
      setLeads(result.leads);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);
  useEffect(() => { fetchLeads(); }, [page, search, statusFilter, categoryFilter]);
  useEffect(() => { const stop = startPolling(fetchLeads, 4000); return stop; }, [page, search, statusFilter, categoryFilter]);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ENRICHING':
      case 'PROCESSING': return <Loader className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'FAILED': return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />;
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">All Leads</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{total} total leads</p>
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <button
            onClick={() => { setCategoryFilter(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              !categoryFilter
                ? 'gradient-primary text-white shadow-sm'
                : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryFilter(cat.name); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                categoryFilter === cat.name
                  ? 'text-white shadow-sm'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border)]'
              }`}
              style={categoryFilter === cat.name ? { backgroundColor: cat.color } : undefined}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search businesses..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-sm transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-secondary)] text-sm focus:outline-none focus:border-indigo-500/50 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ENRICHING">Enriching</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No leads found</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {search || statusFilter || categoryFilter ? 'Try adjusting your filters' : 'Import some leads to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Business</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Category</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden lg:table-cell">Location</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Solution</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                    <th className="text-left px-5 py-3 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider hidden md:table-cell">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <Link to={`/leads/${lead.id}`} className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">
                          {lead.businessName}
                        </Link>
                        {lead.website && (
                          <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-48 mt-0.5">{lead.website}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-secondary)]">{lead.category || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--color-text-muted)] hidden lg:table-cell">{lead.address || '—'}</td>
                      <td className="px-5 py-3.5">
                        {lead.solutionType && (
                          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            lead.solutionType === 'AI_AGENT'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {lead.solutionType === 'AI_AGENT' ? 'AI Agent' : 'Website'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(lead.status)}
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {lead.status.charAt(0) + lead.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {lead.enrichment?.digitalPresenceScore != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${lead.enrichment.digitalPresenceScore}%`,
                                  background: lead.enrichment.digitalPresenceScore >= 60 ? '#22c55e' : lead.enrichment.digitalPresenceScore >= 40 ? '#eab308' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">{lead.enrichment.digitalPresenceScore}</span>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border)]">
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[var(--color-text-secondary)] px-2 tabular-nums">{page} / {totalPages || 1}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="skeleton h-4 w-40" />
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-32 hidden lg:block" />
          <div className="skeleton h-5 w-16 rounded-md" />
          <div className="skeleton h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
