import { Link } from 'react-router-dom';
import {
  Zap, ArrowRight, Bot, Globe, Search, BarChart3, Mail, Shield,
  Sparkles, CheckCircle2, Users, Star, Rocket, ChevronRight
} from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'Smart Lead Discovery',
    desc: 'Scrape businesses from Google Maps and enrich them with AI-powered insights automatically.',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: Bot,
    title: 'AI Agent Generation',
    desc: 'Generate custom AI chatbots tailored to each business — support bots, booking assistants, and more.',
    color: 'from-indigo-500 to-purple-400',
  },
  {
    icon: Globe,
    title: 'Website Solutions',
    desc: 'Analyze existing websites, identify issues, and generate redesign proposals with conversion focus.',
    color: 'from-emerald-500 to-teal-400',
  },
  {
    icon: Mail,
    title: 'Outreach Messages',
    desc: 'AI-crafted personalized emails referencing real business insights. Professional, human, non-spammy.',
    color: 'from-orange-500 to-amber-400',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Processing',
    desc: 'Track progress across hundreds of leads with live status updates and batch management.',
    color: 'from-pink-500 to-rose-400',
  },
  {
    icon: Shield,
    title: 'Production Grade',
    desc: 'Queue-based processing, retry mechanisms, and scalable architecture for 1000+ leads.',
    color: 'from-violet-500 to-fuchsia-400',
  },
];

const plans = [
  {
    name: 'Student',
    price: 'Free',
    period: '',
    desc: 'Perfect for learning and experimenting',
    color: 'border-emerald-500/30',
    badge: null,
    features: [
      '1 processed lead',
      'AI enrichment & insights',
      'AI Agent or Website solution',
      'Outreach message generation',
      'Basic dashboard',
    ],
    cta: 'Get Started Free',
    ctaStyle: 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-[var(--color-border)]',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    desc: 'For freelancers and growing agencies',
    color: 'border-indigo-500/50',
    badge: 'Most Popular',
    features: [
      'Unlimited processed leads',
      'Premium AI models (GPT-4.1)',
      'Batch processing (1000+)',
      'Auto-deploy to Vercel',
      'GitHub integration',
      'Priority queue processing',
      'Custom categories',
      'Export & API access',
    ],
    cta: 'Start Pro Trial',
    ctaStyle: 'gradient-primary text-white shadow-lg shadow-indigo-500/25',
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: '/mo',
    desc: 'For teams and large-scale operations',
    color: 'border-purple-500/30',
    badge: null,
    features: [
      'Everything in Pro',
      'Team management (5 seats)',
      'Custom AI model selection',
      'Dedicated processing queue',
      'Webhook integrations',
      'White-label solutions',
      'Priority support',
      'Custom domain deploys',
      'SLA guarantee',
    ],
    cta: 'Contact Sales',
    ctaStyle: 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-[var(--color-border)]',
  },
];

const stats = [
  { value: '10K+', label: 'Leads Processed' },
  { value: '98%', label: 'Enrichment Accuracy' },
  { value: '50x', label: 'Faster Than Manual' },
  { value: '24/7', label: 'AI Processing' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-surface)] overflow-hidden">
      {/* ─── Navbar ──────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">Gen X</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5">Features</a>
            <a href="#pricing" className="hidden sm:block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5">Pricing</a>
            <Link
              to="/login"
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="gradient-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-[300px] h-[300px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-400">AI-Powered Business Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="text-[var(--color-text-primary)]">Turn Map Leads Into</span>
            <br />
            <span className="gradient-text">Revenue-Ready Solutions</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Scrape businesses, enrich with AI, generate custom solutions, and craft
            personalized outreach — all in one pipeline.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/25 text-base"
            >
              <Rocket className="w-5 h-5" />
              Start Building Free
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium px-6 py-3.5 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all text-base"
            >
              See How It Works
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">How It Works</h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">From raw leads to revenue-ready solutions in four simple steps.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Scrape Leads', desc: 'Search and extract businesses from Google Maps with our built-in scraper.', icon: Search },
              { step: '02', title: 'AI Enrichment', desc: 'AI analyzes each business — services, pain points, opportunities, digital presence.', icon: Sparkles },
              { step: '03', title: 'Generate Solutions', desc: 'Choose AI Agent or Website — get tailored proposals for every lead.', icon: Bot },
              { step: '04', title: 'Send Outreach', desc: 'Personalized, insight-backed emails ready to send to decision makers.', icon: Mail },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative glass-card p-6 group hover:border-indigo-500/20 transition-all">
                <div className="text-[40px] font-black text-[var(--color-border)] absolute top-4 right-4 leading-none select-none">{step}</div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">Everything You Need</h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">A complete pipeline to turn raw map data into ready-to-close deals.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="glass-card p-6 group hover:border-indigo-500/20 transition-all">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg opacity-90`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">Simple, Transparent Pricing</h2>
            <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">Start free. Scale when you're ready. No hidden fees.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative glass-card p-6 flex flex-col ${plan.color} ${plan.badge ? 'ring-1 ring-indigo-500/30 scale-[1.02]' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-xs font-semibold text-white shadow-lg shadow-indigo-500/25">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-base font-bold text-[var(--color-text-primary)]">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-[var(--color-text-primary)]">{plan.price}</span>
                    {plan.period && <span className="text-sm text-[var(--color-text-muted)]">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-400">Join hundreds of agencies</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            Ready to Transform Your Lead Pipeline?
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8 max-w-lg mx-auto">
            Stop wasting hours on manual research. Let AI do the heavy lifting while you close deals.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 gradient-primary text-white font-semibold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-indigo-500/25 text-base"
          >
            Get Started — It's Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Gen X Business Builder</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} ElysianSoft. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
