'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Download, FileText, Undo2, XCircle } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import type { ApplicationStatus } from '@/types';

interface AdminApplicationItem {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  tenant: { id: string; name: string | null; email: string };
  landlord: { id: string; name: string | null; email: string };
  property: { id: string; title: string };
}

type TabKey = 'ALL' | ApplicationStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REVIEWING', label: 'Under Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function AdminApplicationsPage() {
  const [tab, setTab] = useState<TabKey>('ALL');
  const [applications, setApplications] = useState<AdminApplicationItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, withdrawn: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/applications?tab=${tab}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setApplications(json.data.applications);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <a
          href="/api/admin/applications/export"
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total" value={kpis.total} icon={FileText} colorScheme="teal" />
        <KpiCard label="Pending" value={kpis.pending} icon={FileText} colorScheme="gold" />
        <KpiCard label="Approved" value={kpis.approved} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Rejected" value={kpis.rejected} icon={XCircle} colorScheme="red" />
        <KpiCard label="Withdrawn" value={kpis.withdrawn} icon={Undo2} colorScheme="navy" />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
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

      {loading ? (
        <p className="text-sm text-gray-500">Loading applications…</p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-gray-500">No applications in this category.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {applications.map((app) => (
            <div key={app.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{app.tenant.name ?? app.tenant.email}</p>
                <p className="text-sm text-gray-500">
                  {app.property.title} · Landlord: {app.landlord.name ?? app.landlord.email}
                </p>
                <p className="text-xs text-gray-400 mt-1">Applied {formatDate(app.applied_at)}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {app.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
