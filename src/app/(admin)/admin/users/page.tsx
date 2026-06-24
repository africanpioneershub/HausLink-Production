'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';

interface AdminUserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  kyc_status: string;
  city: string | null;
  district: string | null;
  created_at: string;
}

type TabKey = 'ALL' | 'LANDLORDS' | 'TENANTS' | 'ADMINS' | 'PENDING';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All Users' },
  { key: 'LANDLORDS', label: 'Landlords' },
  { key: 'TENANTS', label: 'Tenants' },
  { key: 'ADMINS', label: 'Admins' },
  { key: 'PENDING', label: 'Pending Approval' },
];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
  BANNED: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-gray-100 text-gray-700',
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState<TabKey>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [kpis, setKpis] = useState({
    allUsers: 0,
    landlords: 0,
    activeRenters: 0,
    needsReview: 0,
    platformManagers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function loadUsers() {
    const params = new URLSearchParams({ tab });
    if (search) params.set('search', search);

    setLoading(true);
    fetch(`/api/admin/users?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUsers(json.data.users);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, [tab, search]);

  async function handleStatusChange(userId: string, status: string) {
    setBusyId(userId);
    try {
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status }),
      });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleBan(userId: string) {
    if (!window.confirm('Ban this user? They will lose access immediately.')) return;
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveRegistration(userId: string) {
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/approve-registration`, { method: 'POST' });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectRegistration(userId: string) {
    const reason = window.prompt('Reason for rejecting this registration:');
    if (reason === null) return;
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/reject-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="All Users" value={kpis.allUsers} icon={Users} colorScheme="teal" />
        <KpiCard label="Landlords" value={kpis.landlords} icon={Briefcase} colorScheme="navy" />
        <KpiCard label="Active Renters" value={kpis.activeRenters} icon={UserCheck} colorScheme="green" />
        <KpiCard label="Needs Review" value={kpis.needsReview} icon={ShieldAlert} colorScheme="gold" />
        <KpiCard label="Platform Managers" value={kpis.platformManagers} icon={Users} colorScheme="red" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                tab === key ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or email…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-64"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-500">No users found.</p>
      ) : tab === 'PENDING' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
                <p className="text-sm text-gray-500">
                  {u.role} · {u.district ?? '—'}, {u.city ?? '—'} · Registered{' '}
                  {formatDate(u.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleApproveRegistration(u.id)}
                  disabled={busyId === u.id}
                  className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectRegistration(u.id)}
                  disabled={busyId === u.id}
                  className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
                <p className="text-sm text-gray-500">
                  {u.role} · Joined {formatDate(u.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    STATUS_BADGE[u.status]
                  )}
                >
                  {u.status}
                </span>
                <select
                  value={u.status}
                  onChange={(e) => handleStatusChange(u.id, e.target.value)}
                  disabled={busyId === u.id}
                  className="text-sm rounded-lg border border-gray-200 px-2 py-1"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="BANNED">BANNED</option>
                </select>
                {u.status !== 'BANNED' && (
                  <button
                    onClick={() => handleBan(u.id)}
                    disabled={busyId === u.id}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Ban
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
