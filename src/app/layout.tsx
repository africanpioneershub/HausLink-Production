import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HausLink — Find & Manage Rental Properties in Rwanda',
  description: 'Rwanda\'s all-in-one property management platform for tenants and landlords.',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}