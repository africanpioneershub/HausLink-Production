'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn, formatRwf } from '@/lib/utils';
import type { PropertyType } from '@/types';

interface PropertyListItem {
  id: string;
  title: string;
  type: PropertyType;
  city: string;
  district: string;
  rent_rwf: number;
  bedrooms: number;
  bathrooms: number;
  has_applied: boolean;
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

const PAGE_SIZE = 12;

export default function TenantPropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [district, setDistrict] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function handleApply(propertyId: string) {
    setApplyingId(propertyId);
    try {
      const res = await fetch('/api/tenant/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: propertyId }),
      });
      const json = await res.json();
      if (json.success) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, has_applied: true } : p))
        );
      }
    } finally {
      setApplyingId(null);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (district) params.set('district', district);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    params.set('page', String(page));

    setLoading(true);
    fetch(`/api/tenant/properties?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.properties);
          setTotal(json.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [search, type, district, minPrice, maxPrice, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Find Properties</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by title…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          value={district}
          onChange={(e) => {
            setDistrict(e.target.value);
            setPage(1);
          }}
          placeholder="District"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Min RWF"
            type="number"
            className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value);
              setPage(1);
            }}
            placeholder="Max RWF"
            type="number"
            className="w-1/2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading properties…</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-gray-500">No properties match your filters.</p>
      ) : (
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
                <Link
                  href={`/tenant/properties/${p.id}`}
                  className="font-medium text-gray-900 hover:text-brand-teal"
                >
                  {p.title}
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {p.district}, {p.city}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {p.bedrooms} bed · {p.bathrooms} bath
                </p>
                <div className="flex items-center justify-between mt-3">
                  <p className="font-semibold text-gray-900">{formatRwf(p.rent_rwf)}/mo</p>
                  {!p.has_applied ? (
                    <button
                      onClick={() => handleApply(p.id)}
                      disabled={applyingId === p.id}
                      className="text-sm font-medium text-brand-teal hover:underline disabled:opacity-50"
                    >
                      {applyingId === p.id ? 'Applying…' : 'Apply Now'}
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-gray-400">Already Applied</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-medium',
                p === page ? 'bg-brand-teal text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
