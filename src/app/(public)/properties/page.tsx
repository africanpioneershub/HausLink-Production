'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PropertyCard, type PropertyCardData } from '@/components/public/PropertyCard';
import { RWANDA_DISTRICTS } from '@/lib/rwanda-districts';

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
  images?: string[];
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
    images: item.images,
  };
}

const PROPERTY_TYPES = [
  { value: '', label: 'All' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOUSE', label: 'House' },
  { value: 'ROOM', label: 'Room' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'VILLA', label: 'Villa' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'COMMERCIAL', label: 'Commercial' },
];

const BEDROOM_OPTIONS = ['Any', '1', '2', '3', '4+'];

export default function PublicPropertiesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [properties, setProperties] = useState<PropertyCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [debouncedMinPrice, setDebouncedMinPrice] = useState('');
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState('');
  const [filterBeds, setFilterBeds] = useState('');

  // Pre-populate search from URL param (e.g. when navigating from the landing page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('search');
    if (q) {
      setSearch(q);
      setDebouncedSearch(q);
    }
  }, []);

  // Debounce search — 400 ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Debounce price inputs
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinPrice(filterMinPrice), 400);
    return () => clearTimeout(timer);
  }, [filterMinPrice]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMaxPrice(filterMaxPrice), 400);
    return () => clearTimeout(timer);
  }, [filterMaxPrice]);

  const activeFilterCount = [filterType, filterDistrict, filterMinPrice, filterMaxPrice, filterBeds]
    .filter(Boolean).length;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (filterType) params.set('type', filterType);
    if (filterDistrict) params.set('district', filterDistrict);
    if (debouncedMinPrice) params.set('minPrice', debouncedMinPrice);
    if (debouncedMaxPrice) params.set('maxPrice', debouncedMaxPrice);
    if (filterBeds) params.set('beds', filterBeds);

    fetch(`/api/public/properties?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setProperties(json.data.data.map(toCardData));
          setTotal(json.data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch, page, filterType, filterDistrict, debouncedMinPrice, debouncedMaxPrice, filterBeds]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Flush debounced prices immediately and go to page 1
  function handleApplyFilters() {
    setDebouncedMinPrice(filterMinPrice);
    setDebouncedMaxPrice(filterMaxPrice);
    setPage(1);
  }

  // Reset every filter and the search box
  function handleClearAll() {
    setSearch('');
    setDebouncedSearch('');
    setFilterType('');
    setFilterDistrict('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setDebouncedMinPrice('');
    setDebouncedMaxPrice('');
    setFilterBeds('');
    setPage(1);
  }

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

        <div className="flex flex-col lg:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by property name, features, city, or Kigali district..."
            className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wide px-4 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
            >
              {activeFilterCount > 0 ? `Advanced Filters (${activeFilterCount})` : 'Advanced Filters'}
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => {
                setDebouncedSearch(search);
                setPage(1);
              }}
              className="bg-brand-teal text-white text-xs font-semibold uppercase tracking-wide px-5 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Search Properties
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mt-4 space-y-6">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Property Type</p>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFilterType(type.value)}
                    className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                      filterType === type.value
                        ? 'bg-brand-teal text-white'
                        : 'bg-white border border-gray-200 text-gray-700'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">District</p>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-teal"
              >
                <option value="">All Districts</option>
                {RWANDA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Price Range (RWF / month)</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                  placeholder="Min e.g. 50,000"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
                <input
                  type="number"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  placeholder="Max e.g. 2,000,000"
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Bedrooms</p>
              <div className="flex flex-wrap gap-2">
                {BEDROOM_OPTIONS.map((option) => {
                  const value = option === 'Any' ? '' : option;
                  return (
                    <button
                      key={option}
                      onClick={() => setFilterBeds(value)}
                      className={`text-xs font-semibold px-4 py-2 rounded-full transition-colors ${
                        filterBeds === value
                          ? 'bg-brand-teal text-white'
                          : 'bg-white border border-gray-200 text-gray-700'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Clear Filters
              </button>
              <button
                onClick={handleApplyFilters}
                className="bg-brand-teal text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        <div className="mb-12 mt-10">
          {loading ? (
            <p className="text-sm text-gray-500">Loading properties…</p>
          ) : properties.length === 0 ? (
            <p className="text-sm text-gray-500">No properties found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>

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
