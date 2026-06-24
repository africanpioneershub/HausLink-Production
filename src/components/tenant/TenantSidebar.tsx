'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  FileText,
  Home,
  Wallet,
  Wrench,
  MessageSquare,
  Heart,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/tenant/dashboard', icon: LayoutDashboard },
  { label: 'Find Properties', href: '/tenant/properties', icon: Search },
  { label: 'My Applications', href: '/tenant/applications', icon: FileText },
  { label: 'My Tenancy', href: '/tenant/tenancy', icon: Home },
  { label: 'Payments', href: '/tenant/payments', icon: Wallet },
  { label: 'Maintenance', href: '/tenant/maintenance', icon: Wrench },
  { label: 'Messages', href: '/tenant/messages', icon: MessageSquare },
  { label: 'Saved Properties', href: '/tenant/saved', icon: Heart },
  { label: 'Settings', href: '/tenant/settings', icon: Settings },
];

export function TenantSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-64 shrink-0 bg-brand-navy text-white flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-lg font-bold tracking-tight">HausLink</span>
        <p className="text-xs text-white/60 mt-0.5">Tenant Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-teal text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{user?.name ?? user?.email}</p>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-teal/20 text-brand-teal">
              Tenant
            </span>
          </div>
          <p className="text-xs text-white/50 truncate">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
