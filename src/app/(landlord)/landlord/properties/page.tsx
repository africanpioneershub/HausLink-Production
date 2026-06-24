'use client';

import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, FileEdit, Home, LayoutGrid, List } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { cn, formatRwf } from '@/lib/utils';
import type { PropertyType } from '@/types';

interface PropertyItem {
  id: string;
  title: string;
  type: PropertyType;
  status: string;
  district: string;
  city: string;
  rent_rwf: number;
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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<PropertyType>('APARTMENT');
  const [district, setDistrict] = useState('');
  const [rent, setRent] = useState('');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');

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
  }, []);

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
          onClick={() => setShowForm((v) => !v)}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
