import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ScrapedBusiness } from '../lib/api';
import {
  Upload, Bot, Globe, FileSpreadsheet, Search, Loader2,
  MapPin, Star, Phone, ExternalLink, CheckCircle2, X,
  ArrowRight, Tags, Sparkles, Lock,
} from 'lucide-react';

type Tab = 'scrape' | 'csv';

interface PlanUsage {
  plan: string;
  label: string;
  maxProcessedLeads: number;
  processedLeads: number;
  canProcess: boolean;
  remaining: number;
}

export default function ImportLeads() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('scrape');
  const [solutionType, setSolutionType] = useState<'AI_AGENT' | 'WEBSITE' | null>(null);
  const [batchName, setBatchName] = useState('');
  const [error, setError] = useState('');
  const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);

  // Scrape state
  const [searchQuery, setSearchQuery] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapedResults, setScrapedResults] = useState<ScrapedBusiness[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<{ name: string; color: string } | null>(null);

  // CSV state
  const [csvText, setCsvText] = useState('');
  const [csvLoading, setCsvLoading] = useState(false);

  // Fetch plan usage on mount
  useEffect(() => {
    api.getPlanUsage().then(setPlanUsage).catch(() => {});
  }, []);

  const isFreeLimitReached = planUsage ? !planUsage.canProcess : false;

  const handleScrape = async () => {
    if (!searchQuery.trim()) return;
    setScraping(true);
    setError('');
    setScrapedResults([]);
    setSelected(new Set());
    setDetectedCategory(null);
    try {
      const res = await api.scrapeBusinesses({ query: searchQuery.trim(), limit: 20 });
      setScrapedResults(res.businesses);
      setDetectedCategory(res.detectedCategory);
      setSelected(new Set(res.businesses.map((_, i) => i)));
      if (res.businesses.length === 0) {
        setError('No businesses found. Try a more specific search like "dentists in Chicago".');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScraping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScrape();
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(selected.size === scrapedResults.length ? new Set() : new Set(scrapedResults.map((_, i) => i)));
  };

  const handleScrapeImport = async () => {
    if (!solutionType) { setError('Please select a solution type first'); return; }
    if (selected.size === 0) { setError('Select at least one business'); return; }
    setImporting(true);
    setError('');
    try {
      const businesses = scrapedResults.filter((_, i) => selected.has(i));
      const result = await api.scrapeImport({ query: searchQuery, solutionType, batchName: batchName || undefined, businesses });
      navigate(`/dashboard/batches/${result.batchId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    return lines.slice(1).map((line) => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
        else { current += char; }
      }
      values.push(current.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ''; });
      return {
        businessName: row['name'] || row['business_name'] || row['businessname'] || '',
        category: row['category'] || row['industry'] || null,
        address: row['address'] || row['location'] || null,
        phone: row['phone'] || row['phone number'] || null,
        website: row['website'] || row['url'] || null,
        email: row['email'] || row['contact_email'] || null,
        rating: row['rating'] ? parseFloat(row['rating']) : null,
        socials: row['socials'] || row['social media'] || row['social_media'] || null,
        hours: row['hours'] || row['business hours'] || null,
      };
    }).filter((row) => row.businessName);
  };

  const handleCsvSubmit = async () => {
    if (!solutionType) { setError('Please select a solution type first'); return; }
    if (!csvText.trim()) { setError('Please paste CSV data or upload a file'); return; }
    setCsvLoading(true);
    setError('');
    try {
      const leads = parseCSV(csvText);
      if (leads.length === 0) { setError('No valid leads found in CSV'); setCsvLoading(false); return; }
      const result = await api.importLeads({ leads, solutionType, batchName: batchName || undefined });
      navigate(`/dashboard/batches/${result.batchId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCsvLoading(false);
    }
  };

  const currentStep = !solutionType ? 1 : scrapedResults.length === 0 && !csvText ? 2 : 3;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Import Leads</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Search businesses on the map or upload a CSV to get started.</p>
      </div>

      {/* Free plan limit banner */}
      {planUsage && planUsage.plan === 'free' && (
        <div className={`mb-6 p-4 rounded-xl border ${
          isFreeLimitReached
            ? 'bg-amber-500/[0.06] border-amber-500/20'
            : 'bg-indigo-500/[0.06] border-indigo-500/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              isFreeLimitReached ? 'bg-amber-500/15' : 'bg-indigo-500/15'
            }`}>
              <Lock className={`w-4 h-4 ${isFreeLimitReached ? 'text-amber-400' : 'text-indigo-400'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${isFreeLimitReached ? 'text-amber-300' : 'text-white'}`}>
                {isFreeLimitReached ? 'Free Plan Limit Reached' : 'Free Plan'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {isFreeLimitReached
                  ? `You've used your ${planUsage.maxProcessedLeads} free lead. Upgrade to Pro for unlimited processing.`
                  : `${planUsage.remaining} of ${planUsage.maxProcessedLeads} free lead remaining. You can import multiple leads but only ${planUsage.maxProcessedLeads} will be processed.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { num: 1, label: 'Solution Type' },
          { num: 2, label: 'Find Leads' },
          { num: 3, label: 'Import' },
        ].map(({ num, label }, i) => (
          <div key={num} className="flex items-center gap-3">
            {i > 0 && <div className={`w-8 h-px ${currentStep >= num ? 'bg-indigo-500' : 'bg-[var(--color-border)]'}`} />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                currentStep >= num
                  ? 'gradient-primary text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]'
              }`}>
                {currentStep > num ? <CheckCircle2 className="w-3.5 h-3.5" /> : num}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${currentStep >= num ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Solution Type */}
      <section className="mb-6">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Choose Solution Type</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { key: 'AI_AGENT' as const, icon: Bot, title: 'AI Agent', desc: 'Generate custom AI chatbot solutions', color: 'purple' },
            { key: 'WEBSITE' as const, icon: Globe, title: 'Website', desc: 'Generate website audit & redesign proposals', color: 'blue' },
          ].map(({ key, icon: Icon, title, desc, color }) => (
            <button
              key={key}
              onClick={() => setSolutionType(key)}
              className={`group relative p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                solutionType === key
                  ? `border-${color}-500/50 bg-${color}-500/[0.06]`
                  : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-border-hover)]'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                solutionType === key ? `bg-${color}-500/15` : 'bg-[var(--color-surface-overlay)] group-hover:bg-[var(--color-border)]'
              }`}>
                <Icon className={`w-5 h-5 ${solutionType === key ? `text-${color}-400` : 'text-[var(--color-text-secondary)]'}`} />
              </div>
              <p className="font-semibold text-white text-sm">{title}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{desc}</p>
              {solutionType === key && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full bg-${color}-500 flex items-center justify-center`}>
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Batch Name */}
      <section className="mb-6">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Batch Name <span className="text-[var(--color-text-muted)] normal-case">(optional)</span></p>
        <input
          type="text"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="e.g., Chicago Dentists - April 2026"
          className="w-full px-4 py-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-sm transition-colors"
        />
      </section>

      {/* Tab Switcher */}
      <section className="mb-5">
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Find Your Leads</p>
        <div className="inline-flex gap-1 bg-[var(--color-surface-raised)] p-1 rounded-xl border border-[var(--color-border)]">
          {[
            { key: 'scrape' as Tab, icon: Search, label: 'Search Map' },
            { key: 'csv' as Tab, icon: FileSpreadsheet, label: 'Upload CSV' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === key
                  ? 'gradient-primary text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── SCRAPE TAB ─────────────────────────────────────── */}
      {tab === 'scrape' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g., "dentists in New York", "restaurants in LA"...'
                className="w-full pl-11 pr-4 py-3.5 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-sm transition-colors"
              />
            </div>
            <button
              onClick={handleScrape}
              disabled={scraping || !searchQuery.trim()}
              className="flex items-center gap-2 px-6 py-3.5 gradient-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm transition-opacity shadow-lg shadow-indigo-500/20"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Go
            </button>
          </div>

          {/* Scraping indicator */}
          {scraping && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 glass-card">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Searching businesses...</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">This may take a few seconds</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!scraping && scrapedResults.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              {/* Detected category badge */}
              {detectedCategory && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 glass-card w-auto">
                  <Tags className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-[11px] text-[var(--color-text-muted)]">Category:</span>
                  <span
                    className="text-[11px] font-semibold text-white px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: detectedCategory.color }}
                  >
                    {detectedCategory.name}
                  </span>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Found <span className="text-white font-semibold">{scrapedResults.length}</span> businesses
                  {selected.size > 0 && <> · <span className="text-indigo-400">{selected.size} selected</span></>}
                </p>
                <button onClick={toggleSelectAll} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  {selected.size === scrapedResults.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Business cards */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {scrapedResults.map((biz, i) => (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selected.has(i)
                        ? 'bg-indigo-500/[0.06] border-indigo-500/30'
                        : 'bg-[var(--color-surface-raised)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected.has(i) ? 'bg-indigo-600 border-indigo-600 scale-105' : 'border-[var(--color-text-muted)]/40'
                    }`}>
                      {selected.has(i) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{biz.businessName}</p>
                        {biz.rating && (
                          <span className="flex items-center gap-0.5 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                            <Star className="w-3 h-3 fill-current" /> {biz.rating}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        {biz.category && <span className="text-[11px] text-[var(--color-text-muted)]">{biz.category}</span>}
                        {biz.address && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                            <MapPin className="w-3 h-3" /> {biz.address}
                          </span>
                        )}
                        {biz.phone && (
                          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                            <Phone className="w-3 h-3" /> {biz.phone}
                          </span>
                        )}
                        {biz.website && (
                          <span className="flex items-center gap-1 text-[11px] text-indigo-400">
                            <ExternalLink className="w-3 h-3" /> website
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import action */}
              <div className="pt-2">
                <button
                  onClick={handleScrapeImport}
                  disabled={importing || !solutionType || selected.size === 0}
                  className="flex items-center gap-2 px-5 py-3 gradient-primary text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-indigo-500/20 text-sm"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  {importing ? 'Importing...' : `Import ${selected.size} Leads & Create Batch`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CSV TAB ─────────────────────────────────────────── */}
      {tab === 'csv' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl cursor-pointer hover:border-[var(--color-border-hover)] transition-colors">
              <Upload className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Upload CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            <span className="text-xs text-[var(--color-text-muted)]">or paste below</span>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Name,Website,Email,Social Media,Rating,Hours,Phone,Address,Category"
            rows={10}
            className="w-full px-4 py-3 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 font-mono text-xs transition-colors"
          />
          <p className="text-[11px] text-[var(--color-text-muted)]">
            Compatible with Map Scraper CSV export. Headers: Name, Website, Email, Social Media, Rating, Hours, Phone, Address, Category
          </p>
          <button
            onClick={handleCsvSubmit}
            disabled={csvLoading || !solutionType || !csvText.trim()}
            className="flex items-center gap-2 px-5 py-3 gradient-primary text-white font-medium rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-indigo-500/20 text-sm"
          >
            {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {csvLoading ? 'Importing...' : 'Import & Create Batch'}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 animate-fade-in">
          <X className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
