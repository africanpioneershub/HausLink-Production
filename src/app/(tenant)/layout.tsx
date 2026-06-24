import { TenantSidebar } from '@/components/tenant/TenantSidebar';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <TenantSidebar />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
