import { Lead, Enrichment, Deliverable } from '@prisma/client';
import { logger } from '../lib/logger';

/**
 * Generates deployable Next.js project files from the AI-generated deliverable.
 * Returns a Record<path, content> that can be pushed to GitHub.
 */
export function generateProjectFiles(
  lead: Lead,
  enrichment: Enrichment,
  deliverable: Deliverable,
): Record<string, string> {
  const spec = deliverable.content as Record<string, any>;

  if (deliverable.type === 'WEBSITE_PROPOSAL') {
    return generateWebsiteFiles(lead, enrichment, spec);
  } else {
    return generateAIAgentFiles(lead, enrichment, spec);
  }
}

// ─── Website Project Generator ─────────────────────────────────

function generateWebsiteFiles(
  lead: Lead,
  enrichment: Enrichment,
  spec: Record<string, any>,
): Record<string, string> {
  const bizName = lead.businessName;
  const category = lead.category || 'Business';
  const phone = lead.phone || '';
  const address = lead.address || '';
  const website = lead.website || '';
  const rating = lead.rating ?? null;
  const reviewCount = lead.reviewCount ?? null;
  const services: string[] = (enrichment.services as string[]) || [];
  const painPoints: string[] = (enrichment.painPoints as string[]) || [];
  const targetAudience = (enrichment as any).targetAudience || '';
  const summary = (enrichment as any).businessSummary || spec.executiveSummary || '';
  const palette = spec.designRecommendations?.colorPalette || '';
  const pages = spec.proposedStructure?.pages || [];
  const ctaRaw = spec.conversionOptimization?.primaryCta || 'Get Started';
  // Clean CTA — just keep first 3-4 words, strip explanations
  const cta = ctaRaw.split(/[\-–—,.]/).map((s: string) => s.trim()).find((s: string) => s.length > 0 && s.length < 30) || 'Get Started';
  const trustElements: string[] = spec.conversionOptimization?.trustElements || [];
  const keywords: string[] = spec.seoStrategy?.targetKeywords || [];
  const style = spec.designRecommendations?.style || 'Modern';

  // Pick a color scheme based on category / palette hint
  const colorScheme = pickColorScheme(category, palette, style);

  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = JSON.stringify({
    name: sanitize(bizName),
    version: '1.0.0',
    private: true,
    scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
    dependencies: { next: '^14.2.0', react: '^18.3.0', 'react-dom': '^18.3.0' },
    devDependencies: {
      '@types/node': '^20.0.0', '@types/react': '^18.3.0', typescript: '^5.5.0',
      tailwindcss: '^3.4.0', postcss: '^8.4.0', autoprefixer: '^10.4.0',
    },
  }, null, 2);

  files['next.config.js'] = `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n`;

  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: {
      target: 'es5', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true,
      strict: true, forceConsistentCasingInFileNames: true, noEmit: true, esModuleInterop: true,
      module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true,
      jsx: 'preserve', incremental: true, paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  }, null, 2);

  files['tailwind.config.ts'] = `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`;

  files['postcss.config.js'] = `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n`;

  // globals.css with smooth scroll and animations
  files['src/app/globals.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in-up { animation: fadeInUp 0.7s ease-out both; }
.animate-fade-in { animation: fadeIn 0.6s ease-out both; }
.animate-scale-in { animation: scaleIn 0.5s ease-out both; }
.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-400 { animation-delay: 0.4s; }
.delay-500 { animation-delay: 0.5s; }
`;

  // layout.tsx with better meta
  const metaDesc = esc((summary || `Professional ${category} services by ${bizName}`).slice(0, 155));
  files['src/app/layout.tsx'] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${esc(bizName)} | ${esc(category)}",
  description: "${metaDesc}",
  keywords: ${JSON.stringify(keywords.slice(0, 8))},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
`;

  // Generate service icons based on category
  const serviceIcons = generateServiceIcons(services, category);

  // Build service cards
  const serviceCardsHtml = services.slice(0, 6).map((s: string, i: number) => {
    const icon = serviceIcons[i] || serviceIcons[0];
    return `            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-${colorScheme.accent}-100 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up delay-${i * 100}">
              <div className="w-12 h-12 rounded-xl bg-${colorScheme.accent}-50 flex items-center justify-center mb-5 group-hover:bg-${colorScheme.accent}-100 transition-colors">
                ${icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900">${esc(s)}</h3>
              <p className="mt-3 text-gray-500 text-sm leading-relaxed">Professional ${esc(s.toLowerCase())} services tailored to your needs.</p>
            </div>`;
  }).join('\n');

  // Build trust items
  const trustItemsHtml = trustElements.slice(0, 6).map((t: string, i: number) => {
    return `            <div className="flex items-start gap-3 animate-fade-in-up delay-${i * 100}">
              <div className="w-6 h-6 rounded-full bg-${colorScheme.accent}-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-${colorScheme.accent}-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              </div>
              <span className="text-gray-700 font-medium">${esc(t)}</span>
            </div>`;
  }).join('\n');

  // Stats section
  const stats = generateStats(category, rating, reviewCount, services.length);

  // Pre-compute fallback strings to avoid nested backticks (breaks Vercel bundler)
  const heroFallback = 'Trusted ' + category.toLowerCase() + ' services delivering excellence and quality for every client.';
  const aboutFallback = 'At ' + bizName + ', we are dedicated to providing top-quality ' + category.toLowerCase() + ' services. Our team of experienced professionals ensures every client receives personalized attention and outstanding results.';
  const footerFallback = 'Professional ' + category.toLowerCase() + ' services you can trust.';
  const heroText = esc((summary || heroFallback).slice(0, 250));
  const aboutText = esc((summary || aboutFallback).slice(0, 400));
  const footerText = esc((summary || footerFallback).slice(0, 150));
  const websiteDisplay = website ? esc(website.replace(/^https?:\/\//, '')) : '';

  // page.tsx — Professional landing page
  files['src/app/page.tsx'] = `"use client";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="text-xl font-bold text-gray-900">${esc(bizName.length > 25 ? bizName.split(' ').slice(0, 3).join(' ') : bizName)}</a>
          <div className="hidden md:flex items-center gap-8">
            ${services.length > 0 ? '<a href="#services" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Services</a>' : ''}
            <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</a>
            ${trustElements.length > 0 ? '<a href="#why-us" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Why Us</a>' : ''}
            <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
            <a href="#contact" className="px-5 py-2.5 bg-${colorScheme.primary}-600 text-white text-sm font-semibold rounded-xl hover:bg-${colorScheme.primary}-700 transition-colors shadow-sm">
              ${esc(cta)}
            </a>
          </div>
          <a href="#contact" className="md:hidden px-4 py-2 bg-${colorScheme.primary}-600 text-white text-sm font-semibold rounded-xl">
            ${esc(cta)}
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-${colorScheme.primary}-600 via-${colorScheme.primary}-700 to-${colorScheme.secondary}-800" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzEuMSAwIDItLjkgMi0ycy0uOS0yLTItMi0yIC45LTIgMiAuOSAyIDIgMnptMCAwIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm text-white/90 mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              ${esc(category)}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight animate-fade-in-up">
              ${esc(bizName)}
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-white/75 max-w-2xl leading-relaxed animate-fade-in-up delay-200">
              ${heroText}
            </p>
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-in-up delay-300">
              <a href="#contact" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-${colorScheme.primary}-700 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                <span>${esc(cta)}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              ${phone ? `<a href="tel:${esc(phone)}" className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white/25 text-white font-semibold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <span>${esc(phone)}</span>
              </a>` : ''}
            </div>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full"><path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/></svg>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
${stats.map((s, i) => `            <div className="text-center animate-scale-in delay-${i * 100}">
              <div className="text-3xl lg:text-4xl font-black text-${colorScheme.primary}-600">${s.value}</div>
              <div className="mt-1 text-sm text-gray-500 font-medium">${s.label}</div>
            </div>`).join('\n')}
          </div>
        </div>
      </section>

      {/* Services */}
      ${services.length > 0 ? `<section id="services" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-sm font-semibold text-${colorScheme.accent}-600 uppercase tracking-wider">What We Offer</span>
            <h2 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900">Our Services</h2>
            <p className="mt-4 text-gray-500 text-lg">Comprehensive solutions designed to meet your every need.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
${serviceCardsHtml}
          </div>
        </div>
      </section>` : ''}

      {/* About / Story */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-fade-in-up">
              <span className="text-sm font-semibold text-${colorScheme.accent}-600 uppercase tracking-wider">About Us</span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900 leading-tight">
                Your Trusted ${esc(category)} Partner
              </h2>
              <p className="mt-6 text-gray-600 leading-relaxed text-lg">
                ${aboutText}
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Proven Results</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Quick Response</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Expert Team</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Client First</span>
                </div>
              </div>
            </div>
            <div className="relative animate-fade-in-up delay-200">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-${colorScheme.primary}-100 via-${colorScheme.accent}-50 to-${colorScheme.secondary}-100 flex items-center justify-center">
                <div className="text-center p-12">
                  <div className="text-6xl lg:text-8xl font-black text-${colorScheme.primary}-600/20">${esc(bizName.split(' ').map((w: string) => w[0]).slice(0, 3).join(''))}</div>
                  <p className="mt-4 text-${colorScheme.primary}-600 font-semibold">${esc(bizName)}</p>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl bg-${colorScheme.accent}-500 opacity-10" />
              <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-${colorScheme.primary}-500 opacity-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      ${trustElements.length > 0 ? `<section id="why-us" className="py-24 bg-gradient-to-br from-${colorScheme.primary}-600 to-${colorScheme.secondary}-800 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-${colorScheme.primary}-200 uppercase tracking-wider">Why Choose Us</span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black leading-tight">
                What Sets Us Apart
              </h2>
              <p className="mt-4 text-white/70 text-lg">We take pride in delivering exceptional quality and building lasting relationships with our clients.</p>
            </div>
            <div className="space-y-4">
${trustElements.slice(0, 6).map((t: string, i: number) => `              <div className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5 animate-fade-in-up delay-${i * 100}">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
                <span className="text-white/90 font-medium">${esc(t)}</span>
              </div>`).join('\n')}
            </div>
          </div>
        </div>
      </section>` : ''}

      {/* Testimonial / CTA Band */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="relative bg-gray-50 rounded-3xl p-12 lg:p-16">
            <svg className="w-12 h-12 mx-auto text-${colorScheme.accent}-200 mb-6" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
            <p className="text-xl lg:text-2xl text-gray-700 font-medium leading-relaxed">
              We are committed to providing the highest quality ${esc(category.toLowerCase())} services. Our goal is to exceed your expectations and build a lasting relationship based on trust and results.
            </p>
            <div className="mt-8">
              <p className="font-bold text-gray-900">${esc(bizName)}</p>
              ${address ? `<p className="text-sm text-gray-500 mt-1">${esc(address)}</p>` : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div className="animate-fade-in-up">
              <span className="text-sm font-semibold text-${colorScheme.accent}-600 uppercase tracking-wider">Get in Touch</span>
              <h2 className="mt-3 text-3xl lg:text-5xl font-black text-gray-900">Let's Work Together</h2>
              <p className="mt-4 text-gray-500 text-lg">Ready to get started? Reach out and let us help you achieve your goals.</p>
              <div className="mt-10 space-y-6">
                ${phone ? `<div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <a href="tel:${esc(phone)}" className="text-lg font-semibold text-gray-900 hover:text-${colorScheme.primary}-600 transition-colors">${esc(phone)}</a>
                  </div>
                </div>` : ''}
                ${address ? `<div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-lg font-semibold text-gray-900">${esc(address)}</p>
                  </div>
                </div>` : ''}
                ${website ? `<div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-${colorScheme.accent}-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-${colorScheme.accent}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a href="${esc(website)}" target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-gray-900 hover:text-${colorScheme.primary}-600 transition-colors">${websiteDisplay}</a>
                  </div>
                </div>` : ''}
              </div>
            </div>
            <div className="animate-fade-in-up delay-200">
              <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h3>
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${colorScheme.primary}-500/20 focus:border-${colorScheme.primary}-500 outline-none transition-all text-sm" placeholder="John" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${colorScheme.primary}-500/20 focus:border-${colorScheme.primary}-500 outline-none transition-all text-sm" placeholder="Doe" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${colorScheme.primary}-500/20 focus:border-${colorScheme.primary}-500 outline-none transition-all text-sm" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                    <textarea rows={4} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-${colorScheme.primary}-500/20 focus:border-${colorScheme.primary}-500 outline-none transition-all text-sm resize-none" placeholder="Tell us about your needs..." />
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-${colorScheme.primary}-600 text-white font-semibold rounded-xl hover:bg-${colorScheme.primary}-700 transition-colors shadow-sm">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-xl font-bold">${esc(bizName.length > 25 ? bizName.split(' ').slice(0, 3).join(' ') : bizName)}</h3>
              <p className="mt-3 text-gray-400 text-sm leading-relaxed">${footerText}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Quick Links</h4>
              <ul className="mt-4 space-y-3">
                ${services.length > 0 ? '<li><a href="#services" className="text-gray-300 hover:text-white transition-colors text-sm">Services</a></li>' : ''}
                <li><a href="#about" className="text-gray-300 hover:text-white transition-colors text-sm">About Us</a></li>
                <li><a href="#contact" className="text-gray-300 hover:text-white transition-colors text-sm">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Contact Info</h4>
              <ul className="mt-4 space-y-3">
                ${phone ? `<li className="text-gray-300 text-sm">${esc(phone)}</li>` : ''}
                ${address ? `<li className="text-gray-300 text-sm">${esc(address)}</li>` : ''}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-500">&copy; ${new Date().getFullYear()} ${esc(bizName)}. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating CTA on mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-gray-100 z-40">
        <a href="#contact" className="block w-full py-3.5 bg-${colorScheme.primary}-600 text-white text-center font-semibold rounded-xl shadow-lg">
          ${esc(cta)}
        </a>
      </div>
    </main>
  );
}
`;

  logger.info({ lead: lead.id, fileCount: Object.keys(files).length }, 'Website project files generated');
  return files;
}

/** Pick tailwind color classes based on business category */
function pickColorScheme(category: string, palette: string, style: string): { primary: string; secondary: string; accent: string } {
  const cat = category.toLowerCase();
  if (cat.includes('dental') || cat.includes('health') || cat.includes('medical') || cat.includes('clinic') || cat.includes('doctor') || cat.includes('hospital'))
    return { primary: 'blue', secondary: 'cyan', accent: 'blue' };
  if (cat.includes('restaurant') || cat.includes('food') || cat.includes('cafe') || cat.includes('bakery') || cat.includes('pizza'))
    return { primary: 'orange', secondary: 'red', accent: 'orange' };
  if (cat.includes('fitness') || cat.includes('gym') || cat.includes('sport') || cat.includes('yoga'))
    return { primary: 'emerald', secondary: 'teal', accent: 'emerald' };
  if (cat.includes('salon') || cat.includes('spa') || cat.includes('beauty') || cat.includes('hair'))
    return { primary: 'pink', secondary: 'purple', accent: 'pink' };
  if (cat.includes('law') || cat.includes('legal') || cat.includes('attorney') || cat.includes('consult'))
    return { primary: 'slate', secondary: 'gray', accent: 'blue' };
  if (cat.includes('tech') || cat.includes('software') || cat.includes('it ') || cat.includes('digital'))
    return { primary: 'violet', secondary: 'indigo', accent: 'violet' };
  if (cat.includes('real estate') || cat.includes('property') || cat.includes('construction') || cat.includes('architect'))
    return { primary: 'amber', secondary: 'yellow', accent: 'amber' };
  if (cat.includes('education') || cat.includes('school') || cat.includes('tutor') || cat.includes('academy'))
    return { primary: 'indigo', secondary: 'blue', accent: 'indigo' };
  if (cat.includes('auto') || cat.includes('car') || cat.includes('mechanic') || cat.includes('garage'))
    return { primary: 'red', secondary: 'orange', accent: 'red' };
  // Default
  return { primary: 'indigo', secondary: 'purple', accent: 'indigo' };
}

/** Generate stats based on category */
function generateStats(category: string, rating: number | null, reviewCount: number | null, serviceCount: number): { value: string; label: string }[] {
  const stats: { value: string; label: string }[] = [];
  if (rating) stats.push({ value: `${rating}★`, label: 'Customer Rating' });
  else stats.push({ value: '5★', label: 'Quality Standard' });
  if (reviewCount) stats.push({ value: `${reviewCount}+`, label: 'Happy Clients' });
  else stats.push({ value: '500+', label: 'Happy Clients' });
  stats.push({ value: `${Math.max(serviceCount, 5)}+`, label: 'Services Offered' });
  stats.push({ value: '24/7', label: 'Support Available' });
  return stats;
}

/** Generate SVG icons for services */
function generateServiceIcons(services: string[], category: string): string[] {
  const icons = [
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>',
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>',
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>',
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
    '<svg className="w-6 h-6 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>',
  ];
  return services.map((_, i) => icons[i % icons.length]);
}

// ─── AI Agent (Chatbot Widget) Project Generator ───────────────

function generateAIAgentFiles(
  lead: Lead,
  enrichment: Enrichment,
  spec: Record<string, any>,
): Record<string, string> {
  const bizName = lead.businessName;
  const agentName = spec.agentName || 'AI Assistant';
  const agentType = spec.agentType || 'Customer Support Bot';
  const overview = spec.overview || '';
  const capabilities = spec.capabilities || [];
  const sampleDialogues = spec.sampleDialogues || [];
  const intents = spec.intents || [];
  const services = enrichment.services || [];

  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = JSON.stringify({
    name: sanitize(bizName + '-agent'),
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
    },
    dependencies: {
      next: '^14.2.0',
      react: '^18.3.0',
      'react-dom': '^18.3.0',
    },
    devDependencies: {
      '@types/node': '^20.0.0',
      '@types/react': '^18.3.0',
      typescript: '^5.5.0',
      tailwindcss: '^3.4.0',
      postcss: '^8.4.0',
      autoprefixer: '^10.4.0',
    },
  }, null, 2);

  files['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
`;

  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: {
      target: 'es5', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: true, skipLibCheck: true,
      strict: true, forceConsistentCasingInFileNames: true, noEmit: true, esModuleInterop: true,
      module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true,
      jsx: 'preserve', incremental: true, paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  }, null, 2);

  files['tailwind.config.ts'] = `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`;

  files['postcss.config.js'] = `module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`;

  files['src/app/globals.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; }
`;

  files['src/app/layout.tsx'] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${esc(agentName)} | ${esc(bizName)}",
  description: "${esc(overview.slice(0, 150))}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
`;

  // Build FAQ items from intents
  const faqItems = intents.map((intent: any, i: number) => ({
    q: intent.sampleUtterances?.[0] || intent.description || `Question ${i + 1}`,
    a: intent.sampleResponse || 'I can help you with that!',
  }));

  // Build sample conversations  
  const firstDialogue = sampleDialogues[0];
  const sampleConvo = firstDialogue?.conversation || [
    { role: 'user', message: 'Hi, I need help' },
    { role: 'agent', message: `Welcome to ${bizName}! How can I assist you today?` },
  ];

  // Main landing page with embedded chat demo
  files['src/app/page.tsx'] = `"use client";
import { useState } from "react";

const FAQ = ${JSON.stringify(faqItems.slice(0, 6), null, 2)};

const DEMO_CONVERSATION = ${JSON.stringify(sampleConvo.slice(0, 6), null, 2)};

export default function Home() {
  const [messages, setMessages] = useState(DEMO_CONVERSATION);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", message: input };
    setMessages((prev: any) => [...prev, userMsg]);
    setInput("");
    // Simulate bot reply
    setTimeout(() => {
      const faqMatch = FAQ.find((f: any) => input.toLowerCase().includes(f.q.toLowerCase().split(" ")[0]));
      setMessages((prev: any) => [...prev, {
        role: "agent",
        message: faqMatch?.a || "Thanks for your message! Our team will get back to you shortly.",
      }]);
    }, 800);
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white py-24 lg:py-32">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            ${esc(agentType)}
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold">${esc(agentName)}</h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">${esc(overview.slice(0, 200))}</p>
          <button onClick={() => setOpen(true)} className="mt-8 px-8 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors">
            Try the Demo
          </button>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center">Capabilities</h2>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {${JSON.stringify(capabilities.slice(0, 6))}.map((cap: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-lg">{cap.name}</h3>
                <p className="mt-2 text-gray-500 text-sm">{cap.description}</p>
                <p className="mt-3 text-xs text-indigo-600 font-medium">{cap.businessImpact}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {FAQ.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-10">Common Questions</h2>
            <div className="space-y-4">
              {FAQ.map((item: any, i: number) => (
                <details key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 group">
                  <summary className="font-medium cursor-pointer list-none flex justify-between items-center">
                    {item.q}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-3 text-gray-600 text-sm">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; ${new Date().getFullYear()} ${esc(bizName)}. Powered by ${esc(agentName)}.</p>
      </footer>

      {/* Chat Widget */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
          <div className="bg-indigo-600 text-white px-5 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">${esc(agentName)}</p>
              <p className="text-xs text-white/70">Online</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: any, i: number) => (
              <div key={i} className={\`flex \${msg.role === "user" ? "justify-end" : "justify-start"}\`}>
                <div className={\`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm \${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }\`}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button onClick={handleSend} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
`;

  logger.info({ lead: lead.id, fileCount: Object.keys(files).length }, 'AI Agent project files generated');
  return files;
}

// ─── Helpers ───────────────────────────────────────────────────

function sanitize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

function esc(str: string): string {
  return (str || '').replace(/[`\\${"'}]/g, '');
}
