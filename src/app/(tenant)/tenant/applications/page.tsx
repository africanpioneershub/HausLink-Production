'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn, formatDate, formatRwf } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

interface ApplicationListItem {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  property: {
    id: string;
    title: string;
    city: string;
    district: string;
    rent_rwf: number;
  };
}

type TabKey = 'ALL' | ApplicationStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REVIEWING', label: 'Reviewing' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function TenantApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  useEffect(() => {
    fetch('/api/tenant/applications')
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

  async function handleWithdraw(id: string) {
    const res = await fetch(`/api/tenant/applications/${id}/withdraw`, { method: 'POST' });
    const json = await res.json();
    if (json.success) {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'WITHDRAWN' as const } : app))
      );
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === key
                ? 'bg-brand-teal text-white'
                : 'text-gray-600 hover:bg-gray-100'
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
                <p className="font-medium text-gray-900">{app.property.title}</p>
                <p className="text-sm text-gray-500">
                  {app.property.district}, {app.property.city} · {formatRwf(app.property.rent_rwf)}/mo
                </p>
                <p className="text-xs text-gray-400 mt-1">Applied {formatDate(app.applied_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {app.status}
                </span>
                {(app.status === 'PENDING' || app.status === 'REVIEWING') && (
                  <button
                    onClick={() => handleWithdraw(app.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Withdraw
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
