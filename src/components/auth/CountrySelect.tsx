'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COUNTRIES, type Country } from '@/lib/countries';

interface CountrySelectProps {
  value: Country;
  onChange: (country: Country) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.dial.includes(query)
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-full px-3 py-2.5 border border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span>{value.flag}</span>
        <span className="text-gray-700">{value.dial}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search country…"
            className="w-full px-3 py-2 border-b border-gray-200 text-sm focus:outline-none rounded-t-lg"
          />
          <ul className="max-h-56 overflow-y-auto">
            {filtered.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50"
                >
                  <span>{c.flag}</span>
                  <span className="flex-1 text-gray-700">{c.name}</span>
                  <span className="text-gray-400">{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No countries found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
