import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';
import { formatRwf } from '@/lib/utils';
import { SaveToggle } from '@/components/tenant/SaveToggle';

export const dynamic = 'force-dynamic';

export default async function TenantPropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const property = await prisma.property.findUnique({
    where: { id: params.id },
    include: {
      images: { orderBy: { display_order: 'asc' } },
      landlord: { select: { id: true, name: true } },
    },
  });

  if (!property) notFound();

  const saved = await prisma.savedProperty.findUnique({
    where: { tenant_id_property_id: { tenant_id: user.id, property_id: property.id } },
  });

  return (
    <div className="space-y-6">
      {property.images.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl overflow-hidden">
          <div className="sm:col-span-2 h-72 bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={property.images[0].cdn_url ?? property.images[0].storage_path}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            {property.images.slice(1, 3).map((img) => (
              <div key={img.id} className="h-[8.75rem] bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.cdn_url ?? img.storage_path}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-72 bg-gray-100 rounded-xl" />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <p className="text-gray-500 mt-1">
            {property.district}, {property.city}
          </p>
        </div>
        <SaveToggle propertyId={property.id} initialSaved={!!saved} />
      </div>

      {property.status === 'OCCUPIED' && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          This property is currently occupied and not accepting new applications.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Monthly Rent</p>
          <p className="font-semibold text-gray-900">{formatRwf(property.rent_rwf)}</p>
        </div>
        <div>
          <p className="text-gray-500">Deposit</p>
          <p className="font-semibold text-gray-900">{formatRwf(property.deposit_rwf)}</p>
        </div>
        <div>
          <p className="text-gray-500">Bedrooms</p>
          <p className="font-semibold text-gray-900">{property.bedrooms}</p>
        </div>
        <div>
          <p className="text-gray-500">Bathrooms</p>
          <p className="font-semibold text-gray-900">{property.bathrooms}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {property.description ?? 'No description provided.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Landlord</h2>
        <p className="text-sm text-gray-600">{property.landlord.name ?? 'Not provided'}</p>
      </div>
    </div>
  );
}
