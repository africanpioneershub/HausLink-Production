import Link from 'next/link';
import { MessageCircle, Mail, Phone, MapPin } from 'lucide-react';

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.45 2.91h-2.33V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  );
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 5.92c-.74.33-1.53.55-2.36.65a4.1 4.1 0 0 0 1.8-2.27 8.2 8.2 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.74A11.65 11.65 0 0 1 3.1 4.6a4.1 4.1 0 0 0 1.27 5.47 4.07 4.07 0 0 1-1.86-.51 4.1 4.1 0 0 0 3.29 4.07c-.6.16-1.24.2-1.87.08a4.1 4.1 0 0 0 3.83 2.85A8.23 8.23 0 0 1 2 18.4a11.62 11.62 0 0 0 6.29 1.84c7.55 0 11.68-6.26 11.68-11.68l-.01-.53A8.35 8.35 0 0 0 22 5.92Z" />
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3zM9 9h3.8v1.71h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21H9z" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <>
    <footer className="bg-[#0D1B2A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <p className="text-lg font-bold mb-2">HausLink</p>
          <p className="text-sm text-white/70">
            Rwanda&apos;s all-in-one property management platform for tenants and landlords.
          </p>
          <p className="text-xs text-white/40 mt-4">
            Powered by AfriPrime Holdings Group Ltd
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">Navigation</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <Link href="/how-it-works" className="hover:text-white transition-colors">
                Features
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">Support</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li>
              <a
                href="https://wa.me/250788937487"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              afriprimeholdings@gmail.com
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              +250788937487
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Kigali, Rwanda
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide mb-3">Social</p>
          <div className="flex items-center gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <TwitterIcon className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
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
