'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Siren } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '@/types';

interface LandlordMaintenanceItem {
  id: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  created_at: string;
  tenant: { id: string; name: string | null; email: string };
  property: { id: string; title: string };
}

const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  EMERGENCY: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const STATUS_OPTIONS: MaintenanceStatus[] = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function LandlordMaintenancePage() {
  const [requests, setRequests] = useState<LandlordMaintenanceItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, emergency: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/landlord/maintenance')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setRequests(json.data.requests);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id: string, status: MaintenanceStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/landlord/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>

      {kpis.emergency > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <Siren className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            You have {kpis.emergency} emergency maintenance request{kpis.emergency > 1 ? 's' : ''} requiring
            immediate attention.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Requests" value={kpis.total} icon={ClipboardList} colorScheme="teal" />
        <KpiCard label="Open" value={kpis.open} icon={AlertTriangle} colorScheme="gold" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon={Loader2} colorScheme="navy" />
        <KpiCard label="Resolved" value={kpis.resolved} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Emergency" value={kpis.emergency} icon={Siren} colorScheme="red" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-gray-500">No maintenance requests yet.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{req.title}</p>
                  <p className="text-sm text-gray-500">
                    {req.property.title} · {req.tenant.name ?? req.tenant.email}
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    PRIORITY_BADGE[req.priority]
                  )}
                >
                  {req.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">{req.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{formatDate(req.created_at)}</span>
                <select
                  value={req.status}
                  onChange={(e) => handleStatusChange(req.id, e.target.value as MaintenanceStatus)}
                  disabled={updatingId === req.id}
                  className="text-sm rounded-lg border border-gray-200 px-2 py-1"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
