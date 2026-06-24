'use client';

import { useEffect, useState } from 'react';
import { PropertyCard, type PropertyCardData } from '@/components/public/PropertyCard';

const PAGE_SIZE = 6;

interface PublicPropertyApiItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  district: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  rent_rwf: number;
  view_count: number;
  is_verified: boolean;
  featured: boolean;
  imageUrl: string | null;
}

function toCardData(item: PublicPropertyApiItem): PropertyCardData {
  return {
    id: item.id,
    title: item.title,
    district: item.district,
    price: item.rent_rwf,
    beds: item.bedrooms,
    baths: item.bathrooms,
    type: item.type,
    rating: 0,
    views: item.view_count,
    verified: item.is_verified,
    premium: item.featured,
    featured: item.featured,
    description: item.description ?? '',
    imageUrl: item.imageUrl,
  };
}

export default function PublicPropertiesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/public/properties?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.data.map(toCardData));
          setTotal(json.data.total);
        }
      })
      .finally(() => setLoading(false));
  }, [search, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-sm font-bold uppercase tracking-wide text-green-600 mb-2">
          Verified Catalogs
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Available Rental Properties</h1>
          <p className="text-gray-500 text-sm">({total} Listings)</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-10">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by property name, features, city, or Kigali district..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <div className="flex gap-2">
            <button className="border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors">
              Advanced Filters
            </button>
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
            >
              Clear
            </button>
            <button className="bg-brand-teal text-white text-xs font-semibold uppercase tracking-wide px-5 py-3 rounded-lg hover:opacity-90 transition-opacity">
              Search Properties
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 mb-12">Loading properties…</p>
        ) : properties.length === 0 ? (
          <p className="text-sm text-gray-500 mb-12">No properties found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:border-brand-teal hover:text-brand-teal transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 text-sm font-semibold rounded-lg border transition-colors ${
                  page === i + 1
                    ? 'bg-brand-teal text-white border-brand-teal'
                    : 'border-gray-200 text-gray-700 hover:border-brand-teal hover:text-brand-teal'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:border-brand-teal hover:text-brand-teal transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
