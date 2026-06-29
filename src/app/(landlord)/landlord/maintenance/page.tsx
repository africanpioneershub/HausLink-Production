'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Loader2, Plus, Siren, X } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate } from '@/lib/utils';
import type {
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '@/types';
import { useCsrf, csrfHeaders } from '@/hooks/useCsrf';

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

const CATEGORIES: MaintenanceCategory[] = [
  'PLUMBING', 'ELECTRICAL', 'HVAC', 'STRUCTURAL', 'APPLIANCE', 'CLEANING', 'SECURITY', 'OTHER',
];

const PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];

interface PropertyOption {
  id: string;
  title: string;
}

export default function LandlordMaintenancePage() {
  const csrf = useCsrf();
  const [requests, setRequests] = useState<LandlordMaintenanceItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, emergency: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<MaintenanceCategory>('OTHER');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('MEDIUM');
  const [formPropertyId, setFormPropertyId] = useState('');

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

    fetch('/api/landlord/properties')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.properties.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })));
        }
      });
  }, []);

  async function handleStatusChange(id: string, status: MaintenanceStatus) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/landlord/maintenance/${id}`, {
        method: 'PATCH',
        headers: csrfHeaders(csrf),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formPropertyId) { setFormError('Please select a property.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/landlord/maintenance', {
        method: 'POST',
        headers: csrfHeaders(csrf),
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          priority: formPriority,
          property_id: formPropertyId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const refreshed = await fetch('/api/landlord/maintenance').then((r) => r.json());
        if (refreshed.success) { setRequests(refreshed.data.requests); setKpis(refreshed.data.kpis); }
        setShowForm(false);
        setFormTitle(''); setFormDescription(''); setFormCategory('OTHER'); setFormPriority('MEDIUM'); setFormPropertyId('');
      } else {
        setFormError(json.error ?? 'Failed to submit request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-brand-teal text-white text-sm font-medium px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </button>
      </div>

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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Report a Maintenance Issue</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                <select value={formPropertyId} onChange={(e) => setFormPropertyId(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                  <option value="">Select a property…</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Brief description of the issue" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Provide more details…" rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as MaintenanceCategory)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={formPriority} onChange={(e) => setFormPriority(e.target.value as MaintenancePriority)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 text-sm">{submitting ? 'Submitting…' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
