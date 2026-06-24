'use client';

import { useMemo, useState } from 'react';
import { PropertyCard } from '@/components/public/PropertyCard';
import { CATALOG_PROPERTIES } from '@/lib/public/mock-properties';

const PAGE_SIZE = 6;

export default function PublicPropertiesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CATALOG_PROPERTIES;
    return CATALOG_PROPERTIES.filter(
      (property) =>
        property.title.toLowerCase().includes(query) ||
        property.district.toLowerCase().includes(query) ||
        property.type.toLowerCase().includes(query)
    );
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-sm font-bold uppercase tracking-wide text-green-600 mb-2">
          Verified Catalogs
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Available Rental Properties</h1>
          <p className="text-gray-500 text-sm">
            ({filtered.length} of {CATALOG_PROPERTIES.length} Listings)
          </p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {paginated.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 disabled:opacity-40 hover:border-brand-teal hover:text-brand-teal transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 text-sm font-semibold rounded-lg border transition-colors ${
                  currentPage === i + 1
                    ? 'bg-brand-teal text-white border-brand-teal'
                    : 'border-gray-200 text-gray-700 hover:border-brand-teal hover:text-brand-teal'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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
