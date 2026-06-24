'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn, formatDate } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

interface LandlordApplicationItem {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  tenant: { id: string; name: string | null; email: string };
  property: { id: string; title: string };
}

type TabKey = 'ALL' | ApplicationStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REVIEWING', label: 'Reviewing' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function LandlordApplicationsPage() {
  const [applications, setApplications] = useState<LandlordApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/landlord/applications')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setApplications(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const result: Record<TabKey, number> = {
      ALL: applications.length,
      PENDING: 0,
      REVIEWING: 0,
      APPROVED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    for (const app of applications) {
      result[app.status]++;
    }
    return result;
  }, [applications]);

  const filtered = useMemo(
    () => (activeTab === 'ALL' ? applications : applications.filter((a) => a.status === activeTab)),
    [applications, activeTab]
  );

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/landlord/applications/${id}/approve`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'APPROVED' as const } : a))
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Reason for rejecting this application:');
    if (!reason) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/landlord/applications/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const json = await res.json();
      if (json.success) {
        setApplications((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'REJECTED' as const } : a))
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Applications</h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === key ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {label}
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === key ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
              )}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading applications…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No applications in this category.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{app.tenant.name ?? app.tenant.email}</p>
                <p className="text-sm text-gray-500">{app.property.title}</p>
                <p className="text-xs text-gray-400 mt-1">Applied {formatDate(app.applied_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {app.status}
                </span>
                {(app.status === 'PENDING' || app.status === 'REVIEWING') && (
                  <>
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={busyId === app.id}
                      className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={busyId === app.id}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
