'use client';

import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Search box used by every list: clear button, Escape clears, Enter closes the tablet keyboard, no browser
 * autocomplete/spellcheck popups over the results. "/" focuses the first one on screen (see Dashboard).
 */
export function SearchField({ value, onChange, label, placeholder = 'Buscar…', className = '' }: { value: string; onChange: (value: string) => void; label: string; placeholder?: string; className?: string }) {
  return <div className={`relative ${className}`}>
    <MagnifyingGlassIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    <input
      type="search" data-search="" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}
      aria-label={label} className="field w-full pl-9 pr-10" placeholder={placeholder} value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => { if (event.key === 'Escape' && value) { event.stopPropagation(); onChange(''); } else if (event.key === 'Enter') event.currentTarget.blur(); }}
    />
    {value && <button type="button" className="search-clear" aria-label="Limpiar búsqueda" onClick={() => onChange('')}><XMarkIcon className="h-4 w-4" /></button>}
  </div>;
}
