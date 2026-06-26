'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  FileText,
  Home,
  Wallet,
  Wrench,
  MessageSquare,
  BarChart3,
  Flag,
  ClipboardList,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Verifications', href: '/admin/properties', icon: ShieldCheck },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'Applications', href: '/admin/applications', icon: FileText },
  { label: 'Tenancies', href: '/admin/tenancies', icon: Home },
  { label: 'Payments', href: '/admin/payments', icon: Wallet },
  { label: 'Maintenance', href: '/admin/maintenance', icon: Wrench },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Reports & Flags', href: '/admin/reports', icon: Flag },
  { label: 'Audit Log', href: '/admin/audit-log', icon: ClipboardList },
  { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
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
        <p className="text-xs text-white/60 mt-0.5">Admin Console</p>
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
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
              Admin
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
