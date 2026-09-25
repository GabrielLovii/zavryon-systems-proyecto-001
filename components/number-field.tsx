'use client';

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { parseLocaleNumber } from '@/lib/format';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'inputMode'> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** false for whole quantities (numeric keypad without comma). */
  decimals?: boolean;
};

const formatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
// Argentine notation (1.500 / 12,5), which parseLocaleNumber reads back unchanged.
const display = (value: number) => (value === 0 || !Number.isFinite(value) ? '' : formatter.format(value));

/**
 * Number input that can be left empty while typing (no "0" popping in when the amount is erased), accepts
 * Argentine notation ("1.500", "12,50"), and applies the minimum only when the user leaves the field.
 * Zero shows as the grey "0" placeholder, so typing starts from a clean field.
 */
export function NumberField({ value, onChange, min = 0, decimals = true, placeholder = '0', onFocus, onBlur, ...rest }: Props) {
  const [text, setText] = useState(() => display(value));
  const editing = useRef(false);
  // Outside changes (+/− buttons, another device) show up unless the user is typing in this field.
  useEffect(() => { if (!editing.current) setText(display(value)); }, [value]);
  return <input
    {...rest}
    type="text" inputMode={decimals ? 'decimal' : 'numeric'} autoComplete="off" placeholder={placeholder} value={text}
    onFocus={(event) => { editing.current = true; event.currentTarget.select(); onFocus?.(event); }}
    onChange={(event) => {
      const raw = event.target.value.replace(decimals ? /[^\d.,]/g : /[^\d.]/g, '');
      setText(raw);
      const parsed = parseLocaleNumber(raw);
      if (Number.isFinite(parsed) && parsed >= min) onChange(parsed);
    }}
    onBlur={(event) => {
      editing.current = false;
      const parsed = parseLocaleNumber(text);
      const next = Number.isFinite(parsed) ? Math.max(min, parsed) : min;
      if (next !== value) onChange(next);
      setText(display(next));
      onBlur?.(event);
    }}
  />;
}
