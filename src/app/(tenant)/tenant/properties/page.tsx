'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { cn, formatRwf } from '@/lib/utils';
import type { PropertyType } from '@/types';

type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

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

function PropertyImageCarousel({ images, title }: { images: { cdn_url: string | null; storage_path: string }[]; title: string }) {
  const [idx, setIdx] = useState(0);
  if (images.length === 0) return <div className="w-full h-full bg-gray-200" />;
  const src = images[idx]?.cdn_url ?? images[idx]?.storage_path;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={title} className="w-full h-full object-cover" />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setIdx((i) => (i - 1 + images.length) % images.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setIdx((i) => (i + 1) % images.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

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
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [kycStatus, setKycStatus] = useState<KycStatus>('NOT_SUBMITTED');
  const [kycModal, setKycModal] = useState<KycStatus | null>(null);

  useEffect(() => {
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setKycStatus(json.data.kyc_status);
      });

    fetch('/api/tenant/saved')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setSavedIds(new Set(json.data.map((s: { property: { id: string } }) => s.property.id)));
        }
      });
  }, []);

  async function toggleSave(propertyId: string) {
    const isSaved = savedIds.has(propertyId);
    setSavingId(propertyId);
    try {
      if (isSaved) {
        await fetch(`/api/tenant/saved?property_id=${propertyId}`, { method: 'DELETE' });
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await fetch('/api/tenant/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property_id: propertyId }),
        });
        setSavedIds((prev) => new Set(Array.from(prev).concat(propertyId)));
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleApply(propertyId: string) {
    if (kycStatus !== 'APPROVED') {
      setKycModal(kycStatus);
      return;
    }
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
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                <PropertyImageCarousel images={p.images} title={p.title} />
                <button
                  onClick={() => toggleSave(p.id)}
                  disabled={savingId === p.id}
                  className={cn(
                    'absolute top-2 right-2 p-1.5 rounded-full bg-white shadow-sm transition-colors disabled:opacity-50',
                    savedIds.has(p.id) ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-400'
                  )}
                >
                  <Heart className="w-4 h-4" fill={savedIds.has(p.id) ? 'currentColor' : 'none'} />
                </button>
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

      {kycModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 text-center">
            {kycModal === 'NOT_SUBMITTED' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verify your identity to apply
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  To apply for properties you need to upload a valid ID document.
                </p>
                <Link
                  href="/tenant/settings?tab=verification"
                  className="block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Upload Documents
                </Link>
              </>
            )}
            {kycModal === 'PENDING' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verification in progress
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  Your documents are being reviewed. You can apply once verified (24-48 hours).
                </p>
              </>
            )}
            {kycModal === 'REJECTED' && (
              <>
                <h2 className="text-lg font-bold text-gray-900 mb-2">
                  Verification was rejected
                </h2>
                <p className="text-sm text-gray-600 mb-5">
                  Please resubmit a valid ID document to continue.
                </p>
                <Link
                  href="/tenant/settings?tab=verification"
                  className="block w-full bg-brand-teal text-white font-medium py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Upload Documents
                </Link>
              </>
            )}
            <button
              onClick={() => setKycModal(null)}
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
