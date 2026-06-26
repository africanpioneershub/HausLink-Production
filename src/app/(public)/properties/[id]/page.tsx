import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BedDouble, Bath, Building2, ImageOff, MapPin, CalendarDays } from 'lucide-react';
import { prisma } from '@/lib/prisma/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatRwf, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PublicPropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const property = await prisma.property.findUnique({
    where: { id: params.id, status: 'ACTIVE' },
    include: {
      images: { orderBy: { display_order: 'asc' } },
      landlord: { select: { name: true } },
    },
  });

  if (!property) notFound();

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.user_metadata?.role as string | undefined;
  const isTenant = role === 'TENANT';

  const primaryImage = property.images.find((img) => img.is_primary) ?? property.images[0];

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

        {/* Image */}
        <div className="relative h-[360px] bg-gray-200 rounded-xl overflow-hidden flex items-center justify-center mb-6">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage.cdn_url ?? primaryImage.storage_path}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageOff className="w-16 h-16 text-gray-400" />
          )}
          {property.featured && (
            <span className="absolute top-4 left-4 bg-brand-teal text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded">
              Featured
            </span>
          )}
          {property.is_verified && (
            <span className="absolute top-4 right-4 bg-green-600 text-white text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded">
              Verified
            </span>
          )}
        </div>

        {/* Thumbnail strip */}
        {property.images.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {property.images.slice(1, 5).map((img) => (
              <div key={img.id} className="shrink-0 w-24 h-16 rounded-lg overflow-hidden bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.cdn_url ?? img.storage_path}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <p className="text-sm font-bold uppercase tracking-wide text-brand-teal mb-1">
          {property.district}
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{property.title}</h1>

        <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
          <span className="flex items-center gap-1.5">
            <BedDouble className="w-5 h-5 text-gray-500" />
            {property.bedrooms} Beds
          </span>
          <span className="flex items-center gap-1.5">
            <Bath className="w-5 h-5 text-gray-500" />
            {property.bathrooms} Baths
          </span>
          <span className="flex items-center gap-1.5">
            <Building2 className="w-5 h-5 text-gray-500" />
            {property.type}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-gray-500" />
            {property.district}, {property.city}
          </span>
        </div>

        <p className="text-2xl font-bold text-gray-900 mb-2">
          {formatRwf(property.rent_rwf)}<span className="text-base font-normal text-gray-500"> / month</span>
        </p>
        {property.deposit_rwf > 0 && (
          <p className="text-sm text-gray-500 mb-6">
            Deposit: {formatRwf(property.deposit_rwf)}
          </p>
        )}

        {/* Details grid */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Type</p>
            <p className="font-semibold text-gray-900 capitalize">{property.type.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-gray-500">Bedrooms</p>
            <p className="font-semibold text-gray-900">{property.bedrooms}</p>
          </div>
          <div>
            <p className="text-gray-500">Bathrooms</p>
            <p className="font-semibold text-gray-900">{property.bathrooms}</p>
          </div>
          <div>
            <p className="text-gray-500">District</p>
            <p className="font-semibold text-gray-900">{property.district}</p>
          </div>
          <div>
            <p className="text-gray-500">City</p>
            <p className="font-semibold text-gray-900">{property.city}</p>
          </div>
          <div>
            <p className="text-gray-500">Listed</p>
            <p className="font-semibold text-gray-900 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {formatDate(property.created_at)}
            </p>
          </div>
        </div>

        {/* Description */}
        {property.description && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
          </div>
        )}

        {/* Landlord */}
        {property.landlord.name && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Listed by</h2>
            <p className="text-gray-600">{property.landlord.name}</p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          {isTenant ? (
            <Link
              href={`/tenant/properties/${property.id}`}
              className="bg-brand-teal text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              View & Apply
            </Link>
          ) : (
            <Link
              href={`/register?redirect=/properties/${property.id}`}
              className="bg-brand-teal text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Apply Now
            </Link>
          )}
          <Link
            href="/contact"
            className="border border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:border-brand-teal hover:text-brand-teal transition-colors"
          >
            Contact Us
          </Link>
        </div>

        {!user && (
          <p className="text-sm text-gray-500 mt-3">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-teal font-medium hover:underline">
              Log in
            </Link>{' '}
            to apply.
          </p>
        )}
      </div>
    </div>
  );
}
