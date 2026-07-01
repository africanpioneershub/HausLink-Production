import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://hauselink.com'),
  title: 'Haus Link — Find & Manage Rental Properties in Rwanda',
  description: "Rwanda's all-in-one property management platform connecting landlords and tenants across all 30 districts.",
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // nonce is forwarded from middleware via x-nonce request header.
  // Next.js reads the Content-Security-Policy response header and
  // automatically applies the nonce to its own injected scripts.
  // Pass `nonce` to any <Script nonce={nonce}> tags if added in future.
  const nonce = headers().get('x-nonce') ?? '';
  void nonce;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://hauselink.supabase.co" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}