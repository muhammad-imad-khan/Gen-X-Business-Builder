import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowRight, Bot, Globe, Search, BarChart3, Mail, Shield,
  Sparkles, CheckCircle2, Users, Star, Rocket, ChevronRight
} from 'lucide-react';
import Logo from '../components/Logo';
import RocketScene from '../components/RocketScene';
import { useStaggerReveal, useCountUp } from '../hooks/useScrollReveal';

/* ─── Data ─────────────────────────────────────────────────── */

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

/* ─── Typing Effect Hook ─────────────────────────────────────── */

function useTypingEffect(text: string, speed = 40, delay = 600) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const t = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed]);

  return { displayed, cursor: started && displayed.length < text.length };
}

/* ─── Stat Counter Component ─────────────────────────────────── */

function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { ref, count } = useCountUp(value, 2200);
  return (
    <div className="text-center" ref={ref}>
      <div className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">
        {count}{suffix}
      </div>
      <div className="text-xs text-[var(--color-text-muted)] mt-1">{label}</div>
    </div>
  );
}

/* ─── Landing Page ───────────────────────────────────────────── */

export default function Landing() {
  const howItWorksRef = useStaggerReveal();
  const featuresRef = useStaggerReveal();
  const pricingRef = useStaggerReveal();
  const ctaRef = useStaggerReveal();

  // Navbar scroll effect
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hero typing
  const { displayed: subtitle, cursor } = useTypingEffect(
    'Scrape businesses, enrich with AI, generate custom solutions, and craft personalized outreach — all in one pipeline.',
    25,
    800
  );

  // Hero staggered appear
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface)] overflow-hidden">

      {/* ─── Navbar ──────────────────────────────────────── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[var(--color-surface)]/90 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-[var(--color-border)]' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <Logo size="md" />
            </div>
            <span className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">Gen X</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 relative group">
              Features
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
            <a href="#pricing" className="hidden sm:block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5 relative group">
              Pricing
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
            <Link to="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/register" className="gradient-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-32 pb-10 sm:pb-16 px-6">
        {/* Animated glow effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[min(600px,100vw)] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-glow-pulse" />
        <div className="absolute top-40 left-1/4 w-[min(300px,50vw)] h-[300px] bg-purple-500/8 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-60 right-1/4 w-[min(250px,40vw)] h-[250px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none animate-glow-pulse" style={{ animationDelay: '3s' }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Left: Text content */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-xs font-medium text-indigo-400">AI-Powered Business Intelligence</span>
              </div>

              {/* Headline */}
              <h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 transition-all duration-700 delay-100 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <span className="text-[var(--color-text-primary)]">Turn Local Businesses</span>
                <br />
                <span className="text-[var(--color-text-primary)]">Into </span>
                <span className="animate-text-shimmer" style={{ background: 'linear-gradient(90deg, #6366f1, #a78bfa, #818cf8, #6366f1)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Revenue-Ready
                </span>
                <br />
                <span className="gradient-text">Solutions</span>
              </h1>

              {/* Typing subtitle */}
              <p
                className={`text-base sm:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto lg:mx-0 mb-10 min-h-[4rem] transition-all duration-700 delay-200 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                {subtitle}
                {cursor && <span className="inline-block w-0.5 h-5 bg-indigo-400 ml-0.5 align-middle animate-pulse" />}
              </p>

              {/* CTA Buttons */}
              <div
                className={`flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-12 transition-all duration-700 delay-300 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2 gradient-primary text-white font-semibold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 text-base hover:scale-105 active:scale-95"
                >
                  <Rocket className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:rotate-[-15deg]" />
                  Start Building Free
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#features"
                  className="group inline-flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium px-6 py-3.5 rounded-2xl bg-white/[0.04] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-all text-base hover:scale-105 active:scale-95"
                >
                  See How It Works
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              {/* Stats with animated counters */}
              <div
                className={`grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-lg mx-auto lg:mx-0 transition-all duration-700 delay-[400ms] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              >
                <StatCounter value={10} label="Leads Processed" suffix="K+" />
                <StatCounter value={98} label="Enrichment Accuracy" suffix="%" />
                <StatCounter value={50} label="Faster Than Manual" suffix="x" />
                <StatCounter value={24} label="AI Processing" suffix="/7" />
              </div>
            </div>

            {/* Right: Rocket Scene */}
            <div
              className={`relative h-[340px] sm:h-[420px] lg:h-[520px] transition-all duration-1000 delay-500 ${heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
            >
              <RocketScene />

              {/* Floating status badges around rocket */}
              <div className="absolute top-8 right-4 sm:top-12 sm:right-8 animate-float" style={{ animationDelay: '0s' }}>
                <div className="glass-card px-3 py-2 flex items-center gap-2 animate-border-glow">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Lead Enriched</span>
                </div>
              </div>

              <div className="absolute bottom-12 left-2 sm:bottom-16 sm:left-4 animate-float" style={{ animationDelay: '2s' }}>
                <div className="glass-card px-3 py-2 flex items-center gap-2 animate-border-glow" style={{ animationDelay: '1s' }}>
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">AI Agent Ready</span>
                </div>
              </div>

              <div className="absolute top-1/2 left-0 sm:left-2 animate-float" style={{ animationDelay: '4s' }}>
                <div className="glass-card px-3 py-2 flex items-center gap-2 animate-border-glow" style={{ animationDelay: '2s' }}>
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">Outreach Sent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Gradient Divider ────────────────────────────── */}
      <div className="section-divider" />

      {/* ─── How It Works ────────────────────────────────── */}
      <section className="py-20 px-6" ref={howItWorksRef}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="scroll-reveal">
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">How It Works</h2>
              <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">From raw leads to revenue-ready solutions in four simple steps.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Scrape Leads', desc: 'Search and extract businesses from Google Maps with our built-in scraper.', icon: Search },
              { step: '02', title: 'AI Enrichment', desc: 'AI analyzes each business — services, pain points, opportunities, digital presence.', icon: Sparkles },
              { step: '03', title: 'Generate Solutions', desc: 'Choose AI Agent or Website — get tailored proposals for every lead.', icon: Bot },
              { step: '04', title: 'Send Outreach', desc: 'Personalized, insight-backed emails ready to send to decision makers.', icon: Mail },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div
                key={step}
                className={`scroll-reveal stagger-${i + 1} relative glass-card p-6 group hover:border-indigo-500/20 transition-all card-hover-lift`}
              >
                <div className="text-[40px] font-black text-[var(--color-border)] absolute top-4 right-4 leading-none select-none group-hover:text-indigo-500/20 transition-colors duration-500">{step}</div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-300">
                  <Icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>

                {/* Connecting line (visible on lg+) */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-indigo-500/30 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Features ────────────────────────────────────── */}
      <section id="features" className="py-20 px-6" ref={featuresRef}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="scroll-reveal">
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">Everything You Need</h2>
              <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">A complete pipeline to turn raw map data into ready-to-close deals.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <div
                key={title}
                className={`scroll-reveal stagger-${(i % 6) + 1} glass-card p-6 group hover:border-indigo-500/20 transition-all card-hover-lift`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg opacity-90 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6" ref={pricingRef}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="scroll-reveal">
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">Simple, Transparent Pricing</h2>
              <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">Start free. Scale when you're ready. No hidden fees.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.map((plan, i) => (
              <div
                key={plan.name}
                className={`scroll-reveal stagger-${i + 1} relative glass-card p-6 flex flex-col ${plan.color} ${plan.badge ? 'ring-1 ring-indigo-500/30 md:scale-[1.02]' : ''} card-hover-lift`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 animate-border-glow">
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
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${plan.ctaStyle}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section className="py-24 px-6 relative" ref={ctaRef}>
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(500px,90vw)] h-[300px] bg-indigo-500/8 rounded-full blur-[100px] animate-glow-pulse" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="scroll-reveal">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-medium text-indigo-400">Join hundreds of agencies</span>
            </div>
          </div>
          <div className="scroll-reveal stagger-1">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Ready to Transform Your Lead Pipeline?
            </h2>
          </div>
          <div className="scroll-reveal stagger-2">
            <p className="text-[var(--color-text-secondary)] mb-8 max-w-lg mx-auto">
              Stop wasting hours on manual research. Let AI do the heavy lifting while you close deals.
            </p>
          </div>
          <div className="scroll-reveal stagger-3">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 gradient-primary text-white font-semibold px-8 py-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 text-base hover:scale-105 active:scale-95"
            >
              <Rocket className="w-5 h-5 transition-transform group-hover:-translate-y-1 group-hover:rotate-[-15deg]" />
              Get Started — It's Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-[var(--color-border)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
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
