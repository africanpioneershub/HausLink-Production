import { LandlordSidebar } from '@/components/landlord/LandlordSidebar';

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <LandlordSidebar />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
