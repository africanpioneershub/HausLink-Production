'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, CheckCircle2, Heart } from 'lucide-react';
import { KpiCard } from '@/components/shared/KpiCard';
import { formatRwf } from '@/lib/utils';
import { useCsrf } from '@/hooks/useCsrf';

interface SavedPropertyItem {
  id: string;
  saved_at: string;
  property: {
    id: string;
    title: string;
    city: string;
    district: string;
    rent_rwf: number;
    status: string;
  };
}

export default function TenantSavedPage() {
  const csrf = useCsrf();
  const [saved, setSaved] = useState<SavedPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tenant/saved')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setSaved(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total: saved.length,
      available: saved.filter((s) => s.property.status === 'ACTIVE').length,
      recent: saved.filter((s) => new Date(s.saved_at).getTime() >= sevenDaysAgo).length,
    };
  }, [saved]);

  async function handleUnsave(propertyId: string) {
    await fetch(`/api/tenant/saved?property_id=${propertyId}`, { method: 'DELETE', headers: { 'x-csrf-token': csrf } });
    setSaved((prev) => prev.filter((s) => s.property.id !== propertyId));
  }

  if (!loading && saved.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">No Saved Properties</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-5">
          Properties you save while browsing will show up here so you can find them again easily.
        </p>
        <Link
          href="/tenant/properties"
          className="bg-brand-teal text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Browse Properties
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Saved Properties</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Total Saved" value={kpis.total} icon={Heart} colorScheme="teal" />
        <KpiCard label="Available Now" value={kpis.available} icon={CheckCircle2} colorScheme="green" />
        <KpiCard label="Recently Added" value={kpis.recent} icon={Calendar} colorScheme="gold" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {saved.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between">
                <Link
                  href={`/tenant/properties/${s.property.id}`}
                  className="font-medium text-gray-900 hover:text-brand-teal"
                >
                  {s.property.title}
                </Link>
                <button
                  onClick={() => handleUnsave(s.property.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {s.property.district}, {s.property.city}
              </p>
              <p className="text-sm font-medium text-gray-900 mt-2">
                {formatRwf(s.property.rent_rwf)}/mo
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
