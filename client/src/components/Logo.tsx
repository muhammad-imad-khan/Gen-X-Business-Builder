/**
 * Gen X Logo — inline SVG icon with gradient bolt on rounded square.
 * Sizes: sm (28), md (36), lg (56)
 */
export default function Logo({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 56 : 36;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={dim}
      height={dim}
      fill="none"
      className={className}
      aria-label="Gen X logo"
    >
      <defs>
        <linearGradient id="genx-bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="genx-bolt" x1="200" y1="80" x2="320" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
        <filter id="genx-glow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#genx-bg)" />
      <rect x="40" y="40" width="432" height="432" rx="80" fill="none" stroke="#a5b4fc" strokeWidth="2" opacity="0.25" />
      <path d="M288 80 L176 272 L240 272 L224 432 L336 240 L272 240 Z" fill="url(#genx-bolt)" filter="url(#genx-glow)" />
      <circle cx="120" cy="140" r="6" fill="#a5b4fc" opacity="0.5" />
      <circle cx="392" cy="372" r="6" fill="#a5b4fc" opacity="0.5" />
      <circle cx="140" cy="380" r="4" fill="#c7d2fe" opacity="0.3" />
      <circle cx="380" cy="130" r="4" fill="#c7d2fe" opacity="0.3" />
    </svg>
  );
}
