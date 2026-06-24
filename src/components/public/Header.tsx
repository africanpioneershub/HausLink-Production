'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'PROPERTIES', href: '/properties' },
  { label: 'HOW IT WORKS', href: '/how-it-works' },
  { label: 'CONTACT', href: '/contact' },
  { label: 'LOGIN', href: '/login' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-brand-teal tracking-tight">HausLink</span>
          <span className="text-xs font-semibold tracking-widest text-gray-500">
            CONNECT. RENT. MANAGE. ALL-IN-ONE.
          </span>
          <span className="text-xs text-gray-400">Powered by AfriPrime Holdings Group Ltd</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold tracking-wide text-gray-600 hover:text-brand-teal transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/register"
            className="bg-brand-teal text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 text-gray-600 hover:text-brand-teal"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-100 px-4 sm:px-6 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-semibold tracking-wide text-gray-600 hover:text-brand-teal transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/register"
            onClick={() => setOpen(false)}
            className="block text-center bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Sign Up
          </Link>
        </div>
      )}
    </header>
  );
}
