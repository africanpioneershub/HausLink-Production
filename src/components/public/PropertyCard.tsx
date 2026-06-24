import Link from 'next/link';
import { BedDouble, Bath, Building2, Star, Eye, ImageOff, ArrowRight } from 'lucide-react';

export interface PropertyCardData {
  id: string;
  title: string;
  district: string;
  price: number;
  beds: number;
  baths: number;
  type: string;
  rating: number;
  views: number;
  verified: boolean;
  premium: boolean;
  featured: boolean;
  description: string;
  imageUrl?: string | null;
}

function formatRwf(amount: number) {
  return `RWF ${amount.toLocaleString('en-US')}`;
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
      <div
        role="img"
        aria-label={property.imageUrl ? property.title : `No photo available for ${property.title}`}
        className="relative h-[200px] bg-gray-200 flex items-center justify-center overflow-hidden"
      >
        {property.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={property.imageUrl} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="w-10 h-10 text-gray-400" />
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
          {property.verified && (
            <span className="bg-green-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
              Verified
            </span>
          )}
          {property.premium && (
            <span className="bg-brand-teal text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
              Premium
            </span>
          )}
          {property.featured && (
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded">
              Featured
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded">
          <Eye className="w-3.5 h-3.5" />
          {property.views}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-teal mb-1">
          {property.district}
        </p>
        <h3 className="font-bold text-gray-900 mb-2 leading-snug">{property.title}</h3>

        <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
          <span className="flex items-center gap-1">
            <BedDouble className="w-4 h-4 text-gray-500" />
            {property.beds}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-4 h-4 text-gray-500" />
            {property.baths}
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-4 h-4 text-gray-500" />
            {property.type}
          </span>
        </div>

        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${
                i < Math.round(property.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 ml-1">
            Host Rating
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <p className="text-lg font-bold text-gray-900">{formatRwf(property.price)}</p>
          <Link
            href={`/properties/${property.id}`}
            className="flex items-center gap-1 text-sm font-semibold text-brand-teal hover:underline"
          >
            Details
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
