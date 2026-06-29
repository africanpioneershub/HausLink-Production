'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Flag, XCircle } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import type { ReportStatus, ReportType } from '@/types';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

interface ReportItem {
  id: string;
  type: ReportType;
  description: string;
  priority: string;
  status: ReportStatus;
  created_at: string;
  reporter: { id: string; name: string | null; email: string } | null;
}

const TYPE_BADGE: Record<ReportType, string> = {
  FAKE_LISTING: 'bg-red-100 text-red-700',
  HARASSMENT: 'bg-orange-100 text-orange-700',
  PAYMENT_SCAM: 'bg-rose-100 text-rose-700',
  FRAUD: 'bg-pink-100 text-pink-700',
  DOCUMENTS: 'bg-blue-100 text-blue-700',
  INAPPROPRIATE: 'bg-purple-100 text-purple-700',
  DUPLICATE: 'bg-gray-100 text-gray-700',
  OVERCHARGING: 'bg-yellow-100 text-yellow-700',
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-700',
};

export default function AdminReportsPage() {
  const csrf = useCsrf();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, pending: 0, resolved: 0, falseAlarms: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadReports() {
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setReports(json.data.reports);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function handleResolve(id: string, action: 'RESOLVED' | 'DISMISSED') {
    setBusyId(id);
    try {
      await fetch(`/api/admin/reports/${id}/resolve`, {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({ action }),
      });
      loadReports();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Flags</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total" value={kpis.total} icon={Flag} colorScheme="teal" />
        <KpiCard label="Pending" value={kpis.pending} icon={Clock} colorScheme="gold" />
        <KpiCard label="Resolved" value={kpis.resolved} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="False Alarms" value={kpis.falseAlarms} icon={XCircle} colorScheme="red" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading reports…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-gray-500">No reports yet.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                      TYPE_BADGE[report.type]
                    )}
                  >
                    {report.type.replace('_', ' ')}
                  </span>
                  <p className="text-sm text-gray-700 mt-2">{report.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {report.reporter ? report.reporter.name ?? report.reporter.email : 'Anonymous'} ·{' '}
                    {formatDate(report.created_at)}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    STATUS_BADGE[report.status]
                  )}
                >
                  {report.status.replace('_', ' ')}
                </span>
              </div>
              {(report.status === 'PENDING' || report.status === 'UNDER_REVIEW') && (
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => handleResolve(report.id, 'RESOLVED')}
                    disabled={busyId === report.id}
                    className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, 'DISMISSED')}
                    disabled={busyId === report.id}
                    className="text-sm font-medium text-gray-600 hover:text-gray-700 disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
