import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BedDouble, Bath, Building2, Star, ImageOff } from 'lucide-react';
import { FEATURED_PROPERTIES, CATALOG_PROPERTIES } from '@/lib/public/mock-properties';

function formatRwf(amount: number) {
  return `RWF ${amount.toLocaleString('en-US')}`;
}

function findProperty(id: string) {
  return (
    FEATURED_PROPERTIES.find((p) => p.id === id) ??
    CATALOG_PROPERTIES.find((p) => p.id === id)
  );
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = findProperty(params.id);

  if (!property) {
    notFound();
  }

  return (
    <div className="bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-brand-teal transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Properties
        </Link>

        <div
          role="img"
          aria-label={`No photo available for ${property.title}`}
          className="relative h-[360px] bg-gray-200 rounded-xl flex items-center justify-center mb-6"
        >
          <ImageOff className="w-16 h-16 text-gray-400" />

          <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
            {property.verified && (
              <span className="bg-green-600 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded">
                Verified
              </span>
            )}
            {property.premium && (
              <span className="bg-brand-teal text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded">
                Premium
              </span>
            )}
          </div>
        </div>

        <p className="text-sm font-bold uppercase tracking-wide text-brand-teal mb-1">
          {property.district}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{property.title}</h1>

        <div className="flex items-center gap-5 text-gray-600 mb-4">
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-5 h-5 text-gray-500" />
            {property.beds} Beds
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="w-5 h-5 text-gray-500" />
            {property.baths} Baths
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-5 h-5 text-gray-500" />
            {property.type}
          </span>
        </div>

        <div className="flex items-center gap-1 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < Math.round(property.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 ml-1">
            {property.rating.toFixed(1)} Host Rating
          </span>
        </div>

        <p className="text-2xl font-bold text-gray-900 mb-6">{formatRwf(property.price)} / month</p>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
          <p className="text-gray-600 leading-relaxed">{property.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-brand-teal text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Apply Now
          </Link>
          <Link
            href="/contact"
            className="border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
          >
            Contact Landlord
          </Link>
        </div>
      </div>
    </div>
  );
}
