import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
    <footer className="bg-brand-teal text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <p className="text-lg font-bold mb-2">HausLink</p>
          <p className="text-sm text-white/80">
            Rwanda&apos;s all-in-one property management platform for tenants and landlords.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">Quick Links</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>
              <Link href="/properties" className="hover:text-white transition-colors">
                Find Properties
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-white transition-colors">
                How It Works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About Us
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">Contact</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li>afriprimeholdings@gmail.com</li>
            <li>+250788937487</li>
            <li>
              <a
                href="https://wa.me/250788937487"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                WhatsApp Us
              </a>
            </li>
            <li>Kigali, Rwanda</li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/70">
        © {year} AfriPrime Holdings Group Ltd. All rights reserved.
      </div>
    </footer>

    <a
      href="https://wa.me/250788937487"
      target="_blank"
      rel="noopener noreferrer"
      title="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
    >
      <MessageCircle className="w-7 h-7 text-white" />
    </a>
    </>
  );
}
