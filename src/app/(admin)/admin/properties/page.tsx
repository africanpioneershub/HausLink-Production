'use client';

import { useEffect, useMemo, useState } from 'react';
import { Ban, Building2, CheckCircle2, Eye, Pencil, ShieldCheck, Trash2, Users } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatDate, formatRwf } from '@/lib/utils';

interface KycDocument {
  id: string;
  document_type: string;
  review_status: string;
  submitted_at: string;
}

interface KycUserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  kyc_status: string;
  created_at: string;
  kyc_documents: KycDocument[];
}

interface PendingPropertyItem {
  id: string;
  title: string;
  type: string;
  district: string;
  city: string;
  status: string;
  rent_rwf: number;
  created_at: string;
  landlord: { id: string; name: string | null; email: string };
}

interface EditForm {
  title: string;
  type: string;
  district: string;
  city: string;
  rent_rwf: string;
  status: string;
}

const PROPERTY_STATUS_FILTERS: { key: PropertyStatusFilter; label: string }[] = [
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'ALL', label: 'All Properties' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'OCCUPIED', label: 'Occupied' },
  { key: 'INACTIVE', label: 'Inactive' },
];

const PROPERTY_STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  OCCUPIED: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-red-100 text-red-700',
};

type ModuleTab = 'KYC' | 'PROPERTIES';
type KycFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';
type PropertyStatusFilter = 'PENDING_APPROVAL' | 'ACTIVE' | 'OCCUPIED' | 'INACTIVE' | 'ALL';

const KYC_FILTERS: { key: KycFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
];

const KYC_BADGE: Record<string, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AdminVerificationPage() {
  const [moduleTab, setModuleTab] = useState<ModuleTab>('KYC');
  const [kycFilter, setKycFilter] = useState<KycFilter>('ALL');
  const [users, setUsers] = useState<KycUserItem[]>([]);
  const [properties, setProperties] = useState<PendingPropertyItem[]>([]);
  const [kpis, setKpis] = useState({
    pendingVerification: 0,
    pendingProperties: 0,
    verifiedUsers: 0,
    totalProperties: 0,
  });
  const [propertyStatusFilter, setPropertyStatusFilter] = useState<PropertyStatusFilter>('PENDING_APPROVAL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<PendingPropertyItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', type: '', district: '', city: '', rent_rwf: '', status: '' });

  function loadKyc(filter: KycFilter) {
    fetch(`/api/admin/kyc?status=${filter}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setUsers(json.data.users);
          setKpis((prev) => ({ ...prev, ...json.data.kpis }));
        }
      });
  }

  function loadProperties(statusFilter?: PropertyStatusFilter) {
    const filter = statusFilter ?? propertyStatusFilter;
    const url = filter === 'ALL'
      ? '/api/admin/properties?status=ALL'
      : `/api/admin/properties?status=${filter}`;
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.properties);
          setKpis((prev) => ({ ...prev, ...json.data.kpis }));
        }
      });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/kyc?status=ALL`).then((res) => res.json()),
      fetch('/api/admin/properties').then((res) => res.json()),
    ])
      .then(([kycJson, propsJson]) => {
        if (kycJson.success) {
          setUsers(kycJson.data.users);
          setKpis((prev) => ({ ...prev, ...kycJson.data.kpis }));
        }
        if (propsJson.success) {
          setProperties(propsJson.data.properties);
          setKpis((prev) => ({ ...prev, ...propsJson.data.kpis }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (moduleTab === 'KYC') loadKyc(kycFilter);
  }, [kycFilter, moduleTab]);

  useEffect(() => {
    if (moduleTab === 'PROPERTIES') loadProperties(propertyStatusFilter);
  }, [propertyStatusFilter, moduleTab]);

  const filteredUsers = useMemo(() => users, [users]);

  async function handleViewDocument(documentId: string) {
    const res = await fetch(`/api/admin/kyc/documents/${documentId}/signed-url`);
    const json = await res.json();
    if (json.success) {
      window.open(json.data.url, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleVerifyKyc(userId: string) {
    setBusyId(userId);
    try {
      await fetch(`/api/admin/kyc/${userId}/approve`, { method: 'POST' });
      loadKyc(kycFilter);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectKyc(userId: string) {
    const reason = window.prompt('Reason for rejecting this KYC submission:');
    if (!reason) return;
    setBusyId(userId);
    try {
      await fetch(`/api/admin/kyc/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      loadKyc(kycFilter);
    } finally {
      setBusyId(null);
    }
  }

  async function handleBanUser(userId: string) {
    if (!window.confirm('Ban this user? They will lose access immediately.')) return;
    setBusyId(userId);
    try {
      await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' });
      loadKyc(kycFilter);
    } finally {
      setBusyId(null);
    }
  }

  async function handleApproveProperty(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/properties/${id}/approve`, { method: 'POST' });
      loadProperties();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectProperty(id: string) {
    const reason = window.prompt('Reason for rejecting this property:');
    if (!reason) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/properties/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      loadProperties();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteProperty(id: string) {
    if (!window.confirm('Delete this property? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await fetch(`/api/admin/properties/${id}`, { method: 'DELETE' });
      loadProperties();
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(p: PendingPropertyItem) {
    setEditingProperty(p);
    setEditForm({
      title: p.title,
      type: p.type,
      district: p.district,
      city: p.city,
      rent_rwf: String(p.rent_rwf),
      status: p.status,
    });
  }

  async function handleSaveEdit() {
    if (!editingProperty) return;
    setBusyId(editingProperty.id);
    try {
      await fetch(`/api/admin/properties/${editingProperty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          type: editForm.type,
          district: editForm.district,
          city: editForm.city,
          rent_rwf: Number(editForm.rent_rwf),
          status: editForm.status,
        }),
      });
      setEditingProperty(null);
      loadProperties();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Verification Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pending Verification"
          value={kpis.pendingVerification}
          icon={ShieldCheck}
          colorScheme="gold"
        />
        <KpiCard
          label="Pending Properties"
          value={kpis.pendingProperties}
          icon={Building2}
          colorScheme="navy"
        />
        <KpiCard label="Verified Users" value={kpis.verifiedUsers} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Total Properties" value={kpis.totalProperties} icon={Users} colorScheme="teal" />
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setModuleTab('KYC')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            moduleTab === 'KYC' ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          KYC Verifications
        </button>
        <button
          onClick={() => setModuleTab('PROPERTIES')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            moduleTab === 'PROPERTIES' ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          Property Approvals
        </button>
      </div>

      {moduleTab === 'KYC' ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {KYC_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setKycFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  kycFilter === key ? 'bg-brand-navy text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users in this category.</p>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{u.name ?? u.email}</p>
                      <p className="text-sm text-gray-500">
                        {u.role} · Joined {formatDate(u.created_at)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                        KYC_BADGE[u.kyc_status]
                      )}
                    >
                      {u.kyc_status.replace('_', ' ')}
                    </span>
                  </div>

                  {u.kyc_documents.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {u.kyc_documents.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleViewDocument(doc.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {doc.document_type.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-3">
                    {u.kyc_status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleVerifyKyc(u.id)}
                          disabled={busyId === u.id}
                          className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          Verify KYC
                        </button>
                        <button
                          onClick={() => handleRejectKyc(u.id)}
                          disabled={busyId === u.id}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {u.status !== 'BANNED' && (
                      <button
                        onClick={() => handleBanUser(u.id)}
                        disabled={busyId === u.id}
                        className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Ban User
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PROPERTY_STATUS_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPropertyStatusFilter(key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  propertyStatusFilter === key ? 'bg-brand-navy text-white' : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {properties.length === 0 ? (
            <p className="text-sm text-gray-500">No properties in this category.</p>
          ) : (
            <div className="space-y-3">
              {properties.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{p.title}</p>
                        <span className={cn('text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full', PROPERTY_STATUS_BADGE[p.status] ?? 'bg-gray-100 text-gray-700')}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {p.type} · {p.district}, {p.city} · {p.landlord.name ?? p.landlord.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Submitted {formatDate(p.created_at)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{formatRwf(p.rent_rwf)}/mo</p>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    {p.status === 'PENDING_APPROVAL' && (
                      <>
                        <button
                          onClick={() => handleApproveProperty(p.id)}
                          disabled={busyId === p.id}
                          className="text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectProperty(p.id)}
                          disabled={busyId === p.id}
                          className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <span className="text-gray-200">|</span>
                      </>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      disabled={busyId === p.id}
                      className="flex items-center gap-1 text-sm font-medium text-brand-teal hover:text-brand-teal/80 disabled:opacity-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(p.id)}
                      disabled={busyId === p.id}
                      className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {editingProperty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Edit Property</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Type</label>
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {['APARTMENT','HOUSE','ROOM','STUDIO','VILLA','OFFICE','COMMERCIAL'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {['DRAFT','PENDING_APPROVAL','ACTIVE','OCCUPIED','INACTIVE'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">District</label>
                  <input
                    value={editForm.district}
                    onChange={(e) => setEditForm((f) => ({ ...f, district: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">City</label>
                  <input
                    value={editForm.city}
                    onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Rent (RWF/mo)</label>
                <input
                  type="number"
                  value={editForm.rent_rwf}
                  onChange={(e) => setEditForm((f) => ({ ...f, rent_rwf: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveEdit}
                disabled={busyId === editingProperty.id}
                className="flex-1 bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {busyId === editingProperty.id ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingProperty(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
