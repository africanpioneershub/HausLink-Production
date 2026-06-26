'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, CheckCircle2, FileEdit, Home, ImageIcon, LayoutGrid, List, Pencil, X } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { ImageUploader } from '@/components/landlord/ImageUploader';
import { cn, formatRwf } from '@/lib/utils';
import type { PropertyType } from '@/types';

type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface PropertyItem {
  id: string;
  title: string;
  type: PropertyType;
  status: string;
  district: string;
  city: string;
  rent_rwf: number;
  bedrooms: number | null;
  bathrooms: number | null;
  description: string | null;
  images: { cdn_url: string | null; storage_path: string }[];
}

const PROPERTY_TYPES: PropertyType[] = [
  'APARTMENT',
  'HOUSE',
  'ROOM',
  'STUDIO',
  'VILLA',
  'OFFICE',
  'COMMERCIAL',
];

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
  ACTIVE: 'bg-green-100 text-green-700',
  OCCUPIED: 'bg-blue-100 text-blue-700',
  INACTIVE: 'bg-red-100 text-red-700',
};

export default function LandlordPropertiesPage() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [kpis, setKpis] = useState({ total: 0, available: 0, rented: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [managingImagesId, setManagingImagesId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<PropertyItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('NOT_SUBMITTED');
  const [registrationPaid, setRegistrationPaid] = useState(false);
  const [gateModal, setGateModal] = useState<KycStatus | 'PAYMENT_REQUIRED' | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('APARTMENT');
  const [district, setDistrict] = useState('');
  const [rent, setRent] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');

  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<PropertyType>('APARTMENT');
  const [editDistrict, setEditDistrict] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editBedrooms, setEditBedrooms] = useState('1');
  const [editBathrooms, setEditBathrooms] = useState('1');
  const [editDescription, setEditDescription] = useState('');

  function loadProperties() {
    fetch('/api/landlord/properties')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.properties);
          setKpis(json.data.kpis);
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProperties();
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setKycStatus(json.data.kyc_status);
          setRegistrationPaid(json.data.registration_paid);
        }
      });
  }, []);

  function openEdit(property: PropertyItem) {
    setEditTitle(property.title);
    setEditType(property.type);
    setEditDistrict(property.district);
    setEditCity(property.city);
    setEditRent(String(property.rent_rwf));
    setEditBedrooms(String(property.bedrooms ?? 1));
    setEditBathrooms(String(property.bathrooms ?? 1));
    setEditDescription(property.description ?? '');
    setEditError(null);
    setEditingProperty(property);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProperty) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/landlord/properties/${editingProperty.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          type: editType,
          district: editDistrict,
          city: editCity,
          rent_rwf: Number(editRent),
          bedrooms: Number(editBedrooms),
          bathrooms: Number(editBathrooms),
          description: editDescription || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to update property');
      setEditingProperty(null);
      loadProperties();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setEditSubmitting(false);
    }
  }

  function handleAddPropertyClick() {
    if (kycStatus !== 'APPROVED') {
      setGateModal(kycStatus);
      return;
    }
    if (!registrationPaid) {
      setGateModal('PAYMENT_REQUIRED');
      return;
    }
    setShowForm((v) => !v);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/landlord/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          district,
          rent_rwf: Number(rent),
          bedrooms: Number(bedrooms),
          bathrooms: Number(bathrooms),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to create property');
      setShowForm(false);
      setTitle('');
      setDistrict('');
      setRent('');
      loadProperties();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Properties</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : handleAddPropertyClick())}
          className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {showForm ? 'Cancel' : 'New Property'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Listings" value={kpis.total} icon={Building2} colorScheme="teal" />
        <KpiCard label="Available" value={kpis.available} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Rented" value={kpis.rented} icon={Home} colorScheme="navy" />
        <KpiCard label="Draft" value={kpis.draft} icon={FileEdit} colorScheme="gold" />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4"
        >
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rent (RWF)</label>
              <input
                value={rent}
                onChange={(e) => setRent(e.target.value)}
                type="number"
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
              <input
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                type="number"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
              <input
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                type="number"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Property'}
          </button>
        </form>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setView('grid')}
          className={cn(
            'p-2 rounded-lg',
            view === 'grid' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:bg-gray-100'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setView('list')}
          className={cn(
            'p-2 rounded-lg',
            view === 'list' ? 'bg-brand-teal text-white' : 'text-gray-400 hover:bg-gray-100'
          )}
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading properties…</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-gray-500">No properties yet.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="h-36 bg-gray-100">
                {p.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0].cdn_url ?? p.images[0].storage_path}
                    alt={p.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900">{p.title}</p>
                  <span
                    className={cn(
                      'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                      STATUS_BADGE[p.status]
                    )}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {p.district}, {p.city}
                </p>
                <p className="font-semibold text-gray-900 mt-2">{formatRwf(p.rent_rwf)}/mo</p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-teal"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      setManagingImagesId((current) => (current === p.id ? null : p.id))
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-brand-teal hover:underline"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    {managingImagesId === p.id ? 'Hide Images' : 'Manage Images'}
                  </button>
                </div>
                {managingImagesId === p.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <ImageUploader propertyId={p.id} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {properties.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{p.title}</p>
                <p className="text-sm text-gray-500">
                  {p.district}, {p.city}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium text-gray-900">{formatRwf(p.rent_rwf)}/mo</span>
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full',
                    STATUS_BADGE[p.status]
                  )}
                >
                  {p.status.replace('_', ' ')}
                </span>
                {p.status !== 'OCCUPIED' && (
                  <button
                    onClick={() => openEdit(p)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-brand-teal"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingProperty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Edit Property</h2>
              <button onClick={() => setEditingProperty(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as PropertyType)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent (RWF)</label>
                  <input
                    type="number"
                    value={editRent}
                    onChange={(e) => setEditRent(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                  <input
                    type="number"
                    value={editBedrooms}
                    onChange={(e) => setEditBedrooms(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                  <input
                    type="number"
                    value={editBathrooms}
                    onChange={(e) => setEditBathrooms(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="border border-gray-200 text-gray-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 text-center">
            {gateModal === 'NOT_SUBMITTED' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verify your identity to list
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  To list properties you need to upload a valid ID document.
                </p>
                <Link
                  href="/landlord/settings?tab=verification"
                  className="block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Upload Documents
                </Link>
              </>
            )}
            {gateModal === 'PENDING' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verification in progress
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  Your documents are being reviewed. You will be notified when approved.
                </p>
              </>
            )}
            {gateModal === 'REJECTED' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verification was rejected
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  Please resubmit a valid ID document to continue.
                </p>
                <Link
                  href="/landlord/settings?tab=verification"
                  className="block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Upload Documents
                </Link>
              </>
            )}
            {gateModal === 'PAYMENT_REQUIRED' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Pay registration fee</h2>
                <p className="text-sm text-gray-600 mb-5">
                  Please complete your RWF 10,000 registration fee to start listing.
                </p>
                <Link
                  href="/onboarding/payment-required"
                  className="block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Pay Now
                </Link>
              </>
            )}
            <button
              onClick={() => setGateModal(null)}
              className="mt-3 w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
