'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Siren } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import type { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '@/types';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

interface AdminMaintenanceItem {
  id: string;
  title: string;
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

const PRIORITY_COLORS: Record<string, string> = {
  EMERGENCY: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#9ca3af',
};

export default function AdminMaintenancePage() {
  const csrf = useCsrf();
  const [requests, setRequests] = useState<AdminMaintenanceItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, emergency: 0 });
  const [byCategory, setByCategory] = useState<{ category: string; count: number }[]>([]);
  const [byPriority, setByPriority] = useState<{ priority: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadRequests() {
    fetch('/api/admin/maintenance')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setRequests(json.data.requests);
          setKpis(json.data.kpis);
          setByCategory(json.data.byCategory);
          setByPriority(json.data.byPriority);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleAssign(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/maintenance/${id}/assign`, { method: 'POST', headers: csrfHeaders(csrf) });
      loadRequests();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>

      {kpis.emergency > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          <Siren className="w-5 h-5 shrink-0 mt-0.5" />
          <p>
            {kpis.emergency} emergency maintenance request{kpis.emergency > 1 ? 's' : ''} platform-wide
            require immediate attention.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Total" value={kpis.total} icon={ClipboardList} colorScheme="teal" />
        <KpiCard label="Open" value={kpis.open} icon={AlertTriangle} colorScheme="gold" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon={Loader2} colorScheme="navy" />
        <KpiCard label="Resolved" value={kpis.resolved} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Emergency" value={kpis.emergency} icon={Siren} colorScheme="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">By Category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCategory}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0D7C6E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">By Priority</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byPriority} dataKey="count" nameKey="priority" outerRadius={90} label>
                {byPriority.map((entry) => (
                  <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] ?? '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
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
                  <p className="text-xs text-gray-400 mt-1">{formatDate(req.created_at)}</p>
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
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {req.status.replace('_', ' ')}
                </span>
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => handleAssign(req.id)}
                    disabled={busyId === req.id}
                    className="text-sm font-medium text-brand-teal hover:underline disabled:opacity-50"
                  >
                    Assign
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
