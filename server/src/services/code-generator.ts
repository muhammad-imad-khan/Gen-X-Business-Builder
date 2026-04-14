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
  const services = enrichment.services || [];
  const palette = spec.designRecommendations?.colorPalette || 'indigo and slate';
  const pages = spec.proposedStructure?.pages || [];
  const cta = spec.conversionOptimization?.primaryCta || 'Contact Us';
  const trustElements = spec.conversionOptimization?.trustElements || [];
  const keywords = spec.seoStrategy?.targetKeywords || [];

  const files: Record<string, string> = {};

  // package.json
  files['package.json'] = JSON.stringify({
    name: sanitize(bizName),
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

  // next.config.js
  files['next.config.js'] = `/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
`;

  // tsconfig.json
  files['tsconfig.json'] = JSON.stringify({
    compilerOptions: {
      target: 'es5',
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'],
    exclude: ['node_modules'],
  }, null, 2);

  // tailwind.config.ts
  files['tailwind.config.ts'] = `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`;

  // postcss.config.js
  files['postcss.config.js'] = `module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`;

  // src/app/globals.css
  files['src/app/globals.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }
body { font-family: 'Inter', system-ui, sans-serif; }
`;

  // src/app/layout.tsx
  files['src/app/layout.tsx'] = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${esc(bizName)} | ${esc(category)}",
  description: "${esc(spec.executiveSummary?.slice(0, 150) || `Professional ${category} services by ${bizName}`)}",
  keywords: ${JSON.stringify(keywords.slice(0, 5))},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
`;

  // src/app/page.tsx — main landing page
  const servicesSection = services.length > 0
    ? services.map((s: string) => `          <div key="${esc(s)}" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900">${esc(s)}</h3>
          </div>`).join('\n')
    : '';

  const trustSection = trustElements.length > 0
    ? trustElements.map((t: string) => `          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            <span>${esc(t)}</span>
          </div>`).join('\n')
    : '';

  files['src/app/page.tsx'] = `export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <h1 className="text-4xl lg:text-6xl font-bold leading-tight">${esc(bizName)}</h1>
          <p className="mt-4 text-lg lg:text-xl text-white/80 max-w-2xl">${esc(spec.executiveSummary?.slice(0, 200) || `Professional ${category} services you can trust.`)}</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#contact" className="inline-flex items-center px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors">
              ${esc(cta)}
            </a>
            ${phone ? `<a href="tel:${esc(phone)}" className="inline-flex items-center px-6 py-3 border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors">Call ${esc(phone)}</a>` : ''}
          </div>
        </div>
      </section>

      {/* Services */}
      ${services.length > 0 ? `<section id="services" className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center">Our Services</h2>
          <p className="mt-2 text-gray-500 text-center">What we offer</p>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
${servicesSection}
          </div>
        </div>
      </section>` : ''}

      {/* Trust */}
      ${trustElements.length > 0 ? `<section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Why Choose Us</h2>
          <div className="grid sm:grid-cols-2 gap-4">
${trustSection}
          </div>
        </div>
      </section>` : ''}

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">Get in Touch</h2>
          <p className="mt-2 text-gray-500">We'd love to hear from you</p>
          <div className="mt-8 space-y-3">
            ${phone ? `<p className="text-lg"><strong>Phone:</strong> <a href="tel:${esc(phone)}" className="text-indigo-600 hover:underline">${esc(phone)}</a></p>` : ''}
            ${address ? `<p className="text-lg"><strong>Address:</strong> ${esc(address)}</p>` : ''}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm">
          <p>&copy; ${new Date().getFullYear()} ${esc(bizName)}. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
`;

  logger.info({ lead: lead.id, fileCount: Object.keys(files).length }, 'Website project files generated');
  return files;
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
