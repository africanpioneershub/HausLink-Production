'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ShieldAlert, UserCheck, Users, X } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

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

const KYC_BADGE: Record<string, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

interface UserDetail {
  user: {
    id: string; name: string | null; email: string; role: string; status: string;
    kyc_status: string; city: string | null; district: string | null; phone: string | null; created_at: string;
  };
  propertyCount: number;
  applicationCount: number;
  recentAudit: { id: string; action: string; entity_type: string; created_at: string }[];
}

export default function AdminUsersPage() {
  const csrf = useCsrf();
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
  const [viewingUser, setViewingUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        headers: csrfHeaders(csrf),
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
      await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST', headers: csrfHeaders(csrf) });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveRegistration(userId: string) {
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/approve-registration`, { method: 'POST', headers: csrfHeaders(csrf) });
      loadUsers();
    } finally {
      setBusyId(null);
    }
  }

  async function openUserDetail(userId: string) {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const json = await res.json();
      if (json.success) setViewingUser(json.data);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleRejectRegistration(userId: string) {
    const reason = window.prompt('Reason for rejecting this registration:');
    if (reason === null) return;
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/reject-registration`, {
        method: 'POST',
        headers: csrfHeaders(csrf),
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
                  onClick={() => openUserDetail(u.id)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  View
                </button>
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
                <button
                  onClick={() => openUserDetail(u.id)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  View
                </button>
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

      {(viewingUser || detailLoading) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">User Details</h2>
              <button onClick={() => setViewingUser(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : viewingUser ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-teal/10 flex items-center justify-center text-brand-teal font-bold text-sm shrink-0">
                    {(viewingUser.user.name ?? viewingUser.user.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{viewingUser.user.name ?? viewingUser.user.email}</p>
                    <p className="text-sm text-gray-500">{viewingUser.user.email}</p>
                    {viewingUser.user.phone && <p className="text-xs text-gray-400">{viewingUser.user.phone}</p>}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-semibold bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded-full">{viewingUser.user.role}</span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_BADGE[viewingUser.user.status])}>{viewingUser.user.status}</span>
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', KYC_BADGE[viewingUser.user.kyc_status])}>KYC: {viewingUser.user.kyc_status.replace('_', ' ')}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium text-gray-900 mt-0.5">{[viewingUser.user.district, viewingUser.user.city].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Registered</p>
                    <p className="font-medium text-gray-900 mt-0.5">{formatDate(viewingUser.user.created_at)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Properties</p>
                    <p className="font-medium text-gray-900 mt-0.5">{viewingUser.propertyCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Applications</p>
                    <p className="font-medium text-gray-900 mt-0.5">{viewingUser.applicationCount}</p>
                  </div>
                </div>

                {viewingUser.recentAudit.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Activity</p>
                    <div className="space-y-1">
                      {viewingUser.recentAudit.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">{entry.action.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400">{formatDate(entry.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
