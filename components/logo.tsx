import { useId } from 'react';

/**
 * Simplified SCPR mark (cycle arrows + box + check) that stays legible at small sizes.
 * Used everywhere: sidebar, header, PDFs, favicon and PWA icons.
 * Keep in sync with public/icon.svg.
 */
export function LogoMark({ className = 'h-10 w-10', title = 'SCPR · Control de Abastecimiento' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title}>
    <defs>
      <radialGradient id={`${id}-bg`} cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#0f3347" /><stop offset="1" stopColor="#050d14" /></radialGradient>
      <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#67e8f9" /><stop offset=".5" stopColor="#0ea5e9" /><stop offset="1" stopColor="#2563eb" /></linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill={`url(#${id}-bg)`} />
    <g fill="none" stroke={`url(#${id}-ring)`} strokeWidth="3.5" strokeLinecap="round">
      <path d="M16.44 47.56A22 22 0 0 1 26.31 10.75" />
      <path d="M37.69 10.75A22 22 0 0 1 47.56 47.56" />
    </g>
    <g fill={`url(#${id}-ring)`}>
      <path d="M30.17 9.71 25.53 7.85 27.09 13.65Z" />
      <path d="M44.73 50.39 49.68 49.68 45.44 45.44Z" />
    </g>
    <path d="M32 22 42 27 32 32 22 27Z" fill="#e3b981" />
    <path d="M22 27 32 32V44L22 39Z" fill="#c08a4f" />
    <path d="M32 32 42 27V39L32 44Z" fill="#a0693a" />
    <path d="M27 24.5 37 29.5" stroke="#8a5a2b" strokeWidth="1.6" />
    <circle cx="43.5" cy="41.5" r="6.5" fill="#0ea5e9" stroke="#050d14" strokeWidth="2" />
    <path d="M40.6 41.6 42.6 43.6 46.4 39.6" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
